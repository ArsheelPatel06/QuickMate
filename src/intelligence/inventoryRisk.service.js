const { PrismaClient } = require('@prisma/client');
const bomService = require('../services/bomService');

const prisma = new PrismaClient();

// Risk tiers based on coverage percentage (available / required × 100)
const RISK_TIERS = [
  { tier: 'CRITICAL', maxCoverage: 60,  sortOrder: 0 },
  { tier: 'HIGH',     maxCoverage: 85,  sortOrder: 1 },
  { tier: 'MEDIUM',   maxCoverage: 100, sortOrder: 2 },
  { tier: 'LOW',      maxCoverage: Infinity, sortOrder: 3 },
];

function classifyRisk(available, required) {
  if (required === 0) return 'LOW';
  const coverage = (available / required) * 100;
  for (const { tier, maxCoverage } of RISK_TIERS) {
    if (coverage < maxCoverage) return tier;
  }
  return 'LOW';
}

function riskSortOrder(risk) {
  return RISK_TIERS.find(t => t.tier === risk)?.sortOrder ?? 4;
}

/**
 * Aggregate component demand from all CONFIRMED sales orders.
 *
 * For each SO line:
 *   1. Find the BOM for the finished-goods product.
 *   2. Explode the BOM (reusing bomService.explodeBom) scaled to the ordered quantity.
 *   3. Sum required quantities per component across every SO.
 *
 * Then compare each component's aggregate requirement against its free stock
 * (onHandQty − reservedQty) to produce a risk assessment.
 */
async function getInventoryRisk() {
  // Only CONFIRMED orders represent committed demand
  const activeSalesOrders = await prisma.salesOrder.findMany({
    where: {
      status: { in: ['CONFIRMED', 'PARTIALLY_DELIVERED'] }
    },
    include: {
      lines: {
        include: { product: true }
      }
    }
  });

  // componentMap: productId → { product, totalRequired }
  const componentMap = new Map();

  for (const so of activeSalesOrders) {
    for (const line of so.lines) {
      // Only finished goods have BOMs
      if (line.product.procurementType !== 'MANUFACTURE') continue;

      const bom = await prisma.bOM.findFirst({
        where: { productId: line.product.id }
      });
      if (!bom) continue;

      // Multiplier: how many BOM runs are needed to fill this SO line
      const multiplier = line.quantity / bom.quantity;
      const explosion = await bomService.explodeBom(bom.id, multiplier);

      for (const comp of explosion.components) {
        const existing = componentMap.get(comp.productId) ?? {
          product: comp.product,
          totalRequired: 0
        };
        existing.totalRequired += comp.calculatedQuantity;
        componentMap.set(comp.productId, existing);
      }
    }
  }

  if (componentMap.size === 0) {
    return [];
  }

  // Fetch current free stock for all components in one query
  const componentIds = Array.from(componentMap.keys());
  const products = await prisma.product.findMany({
    where: { id: { in: componentIds } }
  });

  const stockMap = new Map(products.map(p => [p.id, p]));

  const results = [];

  for (const [productId, { product, totalRequired }] of componentMap) {
    const current = stockMap.get(productId) ?? product;
    const available = current.onHandQty - current.reservedQty;
    const gap = Math.max(0, totalRequired - available);
    const coverage = totalRequired > 0
      ? Math.round((available / totalRequired) * 100)
      : 100;
    const risk = classifyRisk(available, totalRequired);

    results.push({
      productId,
      component: current.name,
      sku: current.sku,
      available: Math.round(available * 10) / 10,
      required: Math.round(totalRequired * 10) / 10,
      gap: Math.round(gap * 10) / 10,
      coverage,
      risk,
    });
  }

  // CRITICAL first, then HIGH, MEDIUM, LOW
  results.sort((a, b) => riskSortOrder(a.risk) - riskSortOrder(b.risk));

  const summary = {
    critical: results.filter(r => r.risk === 'CRITICAL').length,
    high:     results.filter(r => r.risk === 'HIGH').length,
    medium:   results.filter(r => r.risk === 'MEDIUM').length,
    low:      results.filter(r => r.risk === 'LOW').length,
    totalComponents: results.length,
  };

  return { summary, components: results };
}

module.exports = { getInventoryRisk };
