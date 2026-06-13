const { getInventoryRisk }      = require('./inventoryRisk.service');
const { getProcurementForecast } = require('./procurementForecast.service');
const { getBottleneckAnalysis }  = require('./bottleneck.service');
const { getOrderRisk }           = require('./orderRisk.service');
const { getHealthScore }         = require('./healthScore.service');

const URGENCY_ORDER = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

/**
 * Pure function — accepts pre-fetched engine results so the /overview
 * endpoint can call this without making a second round of DB queries.
 *
 * Rules (in priority order):
 *   1. CRITICAL procurement items (stockout < 5 days) → raise PO
 *   2. BOTTLENECK work centers           → redistribute work orders
 *   3. HIGH/CRITICAL delayed orders       → notify customer + expedite
 *   4. HIGH inventory risk components     → replenish stock
 *   5. Health score below 70              → general operations review
 */
function generateRecommendations(inventoryRisk, forecastData, bottleneckData, orderRiskData, healthScore) {
  const recs = [];

  // ── Rule 1: Critical procurement shortages ─────────────────────────────────
  const criticalForecasts = forecastData.forecast.filter(
    f => f.status === 'CRITICAL' && f.daysRemaining !== null
  );

  for (const item of criticalForecasts) {
    const invComp = inventoryRisk.components.find(c => c.sku === item.sku);
    // Suggest enough to cover 30 days of demand PLUS fill the current gap
    const bufferQty   = Math.ceil(item.avgDailyConsumption * 30);
    const gapQty      = invComp ? Math.ceil(invComp.gap) : 0;
    const suggestedQty = Math.max(bufferQty, gapQty);

    recs.push({
      urgency:  'CRITICAL',
      category: 'PROCUREMENT',
      title:    `Raise Purchase Order for ${item.product} immediately`,
      impact:   `Current stock of ${item.onHand} units runs out in ${item.daysRemaining} days at `
              + `${item.avgDailyConsumption} units/day consumption. `
              + `This will halt all production lines requiring ${item.product}.`,
      action:   `Create a Purchase Order for ${suggestedQty} units of ${item.product} today. `
              + `This covers the ${gapQty}-unit shortage plus a 30-day production buffer.`,
      metric:   `${item.daysRemaining}d to stockout`,
      relatedEntities: [item.product, item.sku],
    });
  }

  // ── Rule 2: Bottleneck work centers ────────────────────────────────────────
  const bottlenecks  = bottleneckData.workCenters.filter(wc => wc.status === 'BOTTLENECK');
  const alternatives = bottleneckData.workCenters.filter(
    wc => wc.status === 'UNDERUTILIZED' || wc.status === 'MODERATE'
  );

  for (const wc of bottlenecks) {
    const overflowMin = wc.queuedMinutes - wc.availableMinutes;
    const movableWOs  = Math.max(1, Math.ceil(overflowMin / 60));
    const alt         = alternatives.find(u => u.workCenter !== wc.workCenter);

    const action = alt
      ? `Move ${movableWOs} queued work order${movableWOs > 1 ? 's' : ''} from ${wc.workCenter} `
        + `to ${alt.workCenter} (currently at only ${alt.utilization}% utilization). `
        + `This reduces the queue below daily capacity and eliminates the overflow.`
      : `Schedule ${movableWOs} additional work order${movableWOs > 1 ? 's' : ''} on overtime `
        + `or contract labour for ${wc.workCenter} to clear today's overflow backlog.`;

    recs.push({
      urgency:  'HIGH',
      category: 'MANUFACTURING',
      title:    `Rebalance ${wc.workCenter} — queue exceeds daily capacity`,
      impact:   `${wc.workCenter} has ${wc.queueDepth} work orders queued (${wc.queuedMinutes} min) `
              + `against a daily capacity of ${wc.availableMinutes} min. `
              + `The ${Math.round(overflowMin)} min overflow will cascade delays into linked sales orders.`,
      action,
      metric:   `${wc.utilization}% utilization`,
      relatedEntities: [wc.workCenter],
    });
  }

  // ── Rule 3: High-risk or critical delayed orders ────────────────────────────
  const riskyOrders = orderRiskData.orders.filter(
    o => o.orderRisk === 'CRITICAL' || o.orderRisk === 'HIGH'
  );

  for (const order of riskyOrders.slice(0, 2)) {
    recs.push({
      urgency:  order.orderRisk,
      category: 'SALES',
      title:    `${order.orderNumber} — proactively manage ${order.customer} delivery`,
      impact:   `${order.customer} expects delivery by ${order.promisedDate}. `
              + `Current estimate is ${order.estimatedDaysToDeliver} days from today — `
              + `${order.delayDays} day${Math.abs(order.delayDays) !== 1 ? 's' : ''} late. `
              + `Root cause: ${order.primaryReason}.`,
      action:   `1) Contact ${order.customer} now to reset delivery expectations. `
              + `2) Parallel-track: ${order.primaryReason.replace('procurement required', 'expedite procurement')}. `
              + `3) If possible, offer partial delivery of ${order.items} from available stock.`,
      metric:   `+${order.delayDays}d delay`,
      relatedEntities: [order.orderNumber, order.customer],
    });
  }

  // ── Rule 4: HIGH inventory risk not already covered by Rule 1 ──────────────
  const coveredSkus   = new Set(criticalForecasts.map(f => f.sku));
  const highRiskComps = inventoryRisk.components.filter(
    c => c.risk === 'HIGH' && !coveredSkus.has(c.sku)
  );

  for (const comp of highRiskComps.slice(0, 1)) {
    const fc = forecastData.forecast.find(f => f.sku === comp.sku);
    const suggestedQty = fc
      ? Math.ceil(fc.avgDailyConsumption * 30)
      : Math.ceil(comp.gap * 2);

    recs.push({
      urgency:  'MEDIUM',
      category: 'INVENTORY',
      title:    `Replenish ${comp.component} before shortfall worsens`,
      impact:   `${comp.component} is at ${comp.coverage}% coverage of confirmed order demand. `
              + `A gap of ${comp.gap} units exists. Without action this will escalate to CRITICAL.`,
      action:   `Plan a Purchase Order for ${suggestedQty} units of ${comp.component} `
              + `(30-day buffer at current consumption). Review with the procurement team this week.`,
      metric:   `${comp.coverage}% stock coverage`,
      relatedEntities: [comp.component, comp.sku],
    });
  }

  // ── Rule 5: Health score below threshold ───────────────────────────────────
  if (healthScore.overall < 70 && recs.length < 5) {
    recs.push({
      urgency:  'MEDIUM',
      category: 'OPERATIONS',
      title:    `Business health score needs attention (${healthScore.overall}/100)`,
      impact:   `Inventory health: ${healthScore.breakdown.inventoryHealth}, `
              + `Procurement health: ${healthScore.breakdown.procurementHealth}, `
              + `Manufacturing health: ${healthScore.breakdown.manufacturingHealth}. `
              + `Overall score is below the 70/100 target.`,
      action:   `Run a cross-functional review: (1) clear procurement backlog for at-risk materials, `
              + `(2) rebalance manufacturing queue, (3) update delivery commitments for high-risk orders.`,
      metric:   `${healthScore.overall}/100 overall`,
      relatedEntities: [],
    });
  }

  // Sort CRITICAL → HIGH → MEDIUM → LOW, then cap at 5
  recs.sort((a, b) => (URGENCY_ORDER[a.urgency] ?? 3) - (URGENCY_ORDER[b.urgency] ?? 3));

  return {
    generatedAt:          new Date().toISOString(),
    totalRecommendations: recs.length,
    recommendations:      recs.slice(0, 5),
  };
}

/**
 * Standalone async version — fetches all engine data itself.
 * Used by the dedicated GET /advisor endpoint.
 */
async function getAdvisorRecommendations() {
  const [inventoryRisk, forecastData, bottleneckData, orderRiskData, healthScore] =
    await Promise.all([
      getInventoryRisk(),
      getProcurementForecast(),
      getBottleneckAnalysis(),
      getOrderRisk(),
      getHealthScore(),
    ]);

  return generateRecommendations(
    inventoryRisk, forecastData, bottleneckData, orderRiskData, healthScore
  );
}

module.exports = { getAdvisorRecommendations, generateRecommendations };
