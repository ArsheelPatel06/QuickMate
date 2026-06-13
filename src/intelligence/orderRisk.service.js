const { PrismaClient } = require('@prisma/client');
const bomService = require('../services/bomService');

const prisma = new PrismaClient();

const PROMISE_WINDOW_DAYS   = 14;  // Days from SO creation to expected delivery
const PROCUREMENT_LEAD_DAYS = 7;   // Default days to source a missing component
const PARTIAL_LEAD_DAYS     = 4;   // Days for a HIGH risk (partial) shortage

const RISK_TIERS = [
  { risk: 'CRITICAL', minDelay: 5,   sortOrder: 0 },
  { risk: 'HIGH',     minDelay: 1,   sortOrder: 1 },
  { risk: 'MEDIUM',   minDelay: -3,  sortOrder: 2 },
  { risk: 'LOW',      minDelay: -Infinity, sortOrder: 3 },
];

function classifyOrderRisk(delayDays) {
  for (const { risk, minDelay } of RISK_TIERS) {
    if (delayDays >= minDelay) return risk;
  }
  return 'LOW';
}

function shortageRiskCoverage(available, required) {
  if (required === 0) return 'LOW';
  const coverage = (available / required) * 100;
  if (coverage < 60) return 'CRITICAL';
  if (coverage < 85) return 'HIGH';
  if (coverage < 100) return 'MEDIUM';
  return 'LOW';
}

/**
 * Order Delay Risk Engine.
 *
 * For each CONFIRMED sales order:
 *   1. Explode the product's BOM at the ordered quantity.
 *   2. Check component stock levels → determine worst shortage tier.
 *   3. Estimate days needed to deliver based on shortage tier:
 *        CRITICAL shortage → PROCUREMENT_LEAD_DAYS
 *        HIGH shortage     → PARTIAL_LEAD_DAYS
 *        No shortage       → 2 (manufacturing time only)
 *   4. If a linked MO exists, check Assembly queue depth for additional delay.
 *   5. promisedDate = SO.createdAt + PROMISE_WINDOW_DAYS
 *      delayDays    = estimatedDaysToDeliver − daysUntilPromised
 *   6. Classify order risk: CRITICAL / HIGH / MEDIUM / LOW
 *
 * SO-1021 (50 Dining Tables, created 12 days ago) should produce:
 *   promisedDate      = createdAt + 14d  → ~2 days from now
 *   shortage          = Wooden Tops CRITICAL → 7 procurement days
 *   estimatedDelivery = today + 7 days
 *   delayDays         = 7 − 2 = +5 days  → HIGH RISK ✓
 */
async function getOrderRisk() {
  const confirmedSOs = await prisma.salesOrder.findMany({
    where: { status: { in: ['CONFIRMED', 'PARTIALLY_DELIVERED'] } },
    include: {
      lines: { include: { product: true } }
    },
    orderBy: { createdAt: 'asc' }
  });

  const today = new Date();
  const msPerDay = 24 * 60 * 60 * 1000;

  const results = [];

  for (const so of confirmedSOs) {
    let worstShortage = 'LOW';  // Worst component shortage tier for this SO
    const shortageDetails = [];
    let hasAnyBom = false;

    for (const line of so.lines) {
      if (line.product.procurementType !== 'MANUFACTURE') continue;

      const bom = await prisma.bOM.findFirst({ where: { productId: line.product.id } });
      if (!bom) continue;
      hasAnyBom = true;

      const multiplier = line.quantity / bom.quantity;
      const explosion = await bomService.explodeBom(bom.id, multiplier);

      for (const comp of explosion.components) {
        const product = await prisma.product.findUnique({ where: { id: comp.productId } });
        const available = product.onHandQty - product.reservedQty;
        const required = comp.calculatedQuantity;
        const compRisk = shortageRiskCoverage(available, required);

        if (compRisk !== 'LOW') {
          shortageDetails.push({
            component: product.name,
            available: Math.round(available * 10) / 10,
            required: Math.round(required * 10) / 10,
            risk: compRisk,
          });
          const riskOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
          if (riskOrder[compRisk] < riskOrder[worstShortage]) {
            worstShortage = compRisk;
          }
        }
      }
    }

    // Estimate delivery lead time based on shortage
    let estimatedDaysToDeliver = hasAnyBom ? 2 : 1;
    let primaryReason = null;

    if (worstShortage === 'CRITICAL') {
      estimatedDaysToDeliver = PROCUREMENT_LEAD_DAYS;
      const critComp = shortageDetails.find(s => s.risk === 'CRITICAL');
      primaryReason = `${critComp?.component ?? 'Component'} shortage — procurement required (${PROCUREMENT_LEAD_DAYS}d lead)`;
    } else if (worstShortage === 'HIGH') {
      estimatedDaysToDeliver = PARTIAL_LEAD_DAYS;
      const highComp = shortageDetails.find(s => s.risk === 'HIGH');
      primaryReason = `${highComp?.component ?? 'Component'} — partial shortage (${PARTIAL_LEAD_DAYS}d lead)`;
    } else if (worstShortage === 'MEDIUM') {
      estimatedDaysToDeliver = 3;
      primaryReason = 'Tight component stock';
    }

    // Check if a linked Manufacturing Order has Assembly bottleneck
    const linkedMO = await prisma.manufacturingOrder.findFirst({
      where: { sourceSalesOrderId: so.id },
      include: {
        workOrders: {
          where: { status: { in: ['PENDING', 'READY', 'IN_PROGRESS'] } },
          include: { workCenter: true }
        }
      }
    });

    if (linkedMO?.workOrders.length > 0) {
      for (const wo of linkedMO.workOrders) {
        const wcQueueCount = await prisma.workOrder.count({
          where: {
            workCenterId: wo.workCenterId,
            status: { in: ['PENDING', 'READY', 'IN_PROGRESS'] }
          }
        });
        const availableMin = wo.workCenter.capacity * 8 * 60;
        const queuedMin = wcQueueCount * wo.plannedDuration;
        const util = queuedMin / availableMin;

        if (util > 1.0) {
          // Each capacity unit processes 2 jobs/day → days to clear = queueDepth / (capacity × 2)
          const clearDays = Math.ceil(wcQueueCount / Math.max(wo.workCenter.capacity * 2, 1));
          if (clearDays > estimatedDaysToDeliver) {
            estimatedDaysToDeliver = clearDays;
            if (!primaryReason) {
              primaryReason = `${wo.workCenter.name} at ${Math.round(util * 100)}% utilization`;
            }
          }
        }
      }
    }

    const promisedDate    = new Date(so.createdAt.getTime() + PROMISE_WINDOW_DAYS * msPerDay);
    const daysUntilPromised = Math.ceil((promisedDate - today) / msPerDay);
    const delayDays         = estimatedDaysToDeliver - daysUntilPromised;
    const orderRisk         = classifyOrderRisk(delayDays);

    results.push({
      orderId: so.id,
      orderNumber: so.orderNumber,
      customer: so.customerName,
      status: so.status,
      items: so.lines.map(l => `${Math.round(l.quantity)}× ${l.product.name}`).join(', '),
      createdAt: so.createdAt.toISOString().split('T')[0],
      promisedDate: promisedDate.toISOString().split('T')[0],
      daysUntilPromised,
      estimatedDaysToDeliver,
      delayDays,
      orderRisk,
      primaryReason: primaryReason ?? 'On track — stock available',
      shortageCount: shortageDetails.length,
      shortageDetails,
    });
  }

  // CRITICAL first
  results.sort((a, b) => {
    const riskOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    return riskOrder[a.orderRisk] - riskOrder[b.orderRisk];
  });

  const summary = {
    critical: results.filter(r => r.orderRisk === 'CRITICAL').length,
    high:     results.filter(r => r.orderRisk === 'HIGH').length,
    medium:   results.filter(r => r.orderRisk === 'MEDIUM').length,
    low:      results.filter(r => r.orderRisk === 'LOW').length,
    total:    results.length,
  };

  return { summary, orders: results };
}

module.exports = { getOrderRisk };
