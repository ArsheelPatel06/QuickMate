const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const FORECAST_WINDOW_DAYS = 30;

// Thresholds: days of stock remaining before escalation
const STATUS_THRESHOLDS = [
  { status: 'CRITICAL', maxDays: 5    },
  { status: 'HIGH',     maxDays: 10   },
  { status: 'MEDIUM',   maxDays: 14   },
  { status: 'STABLE',   maxDays: Infinity },
];

function classifyStatus(daysRemaining) {
  for (const { status, maxDays } of STATUS_THRESHOLDS) {
    if (daysRemaining < maxDays) return status;
  }
  return 'STABLE';
}

function statusSortOrder(status) {
  return STATUS_THRESHOLDS.findIndex(t => t.status === status);
}

/**
 * Procurement Forecast Engine.
 *
 * For every purchased raw material:
 *   1. Sum all OUT transactions in the last FORECAST_WINDOW_DAYS from StockLedger.
 *   2. Compute avgDailyConsumption = totalOut / FORECAST_WINDOW_DAYS.
 *   3. Compute daysRemaining = currentOnHand / avgDailyConsumption.
 *   4. Classify status: CRITICAL / HIGH / MEDIUM / STABLE.
 *
 * Products with zero consumption history are shown as STABLE with ∞ days.
 */
async function getProcurementForecast() {
  const windowStart = new Date(Date.now() - FORECAST_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  // All purchasable raw materials
  const rawMaterials = await prisma.product.findMany({
    where: { procurementType: 'PURCHASE' },
    orderBy: { name: 'asc' }
  });

  // Aggregate OUT quantities per product over the window in one query
  const consumptionRecords = await prisma.stockLedger.groupBy({
    by: ['productId'],
    where: {
      transactionType: 'OUT',
      date: { gte: windowStart }
    },
    _sum: { quantity: true }
  });

  const consumptionMap = new Map(
    consumptionRecords.map(r => [r.productId, r._sum.quantity ?? 0])
  );

  const results = rawMaterials.map(product => {
    const totalOut = consumptionMap.get(product.id) ?? 0;
    const avgDailyConsumption = totalOut / FORECAST_WINDOW_DAYS;
    const onHandQty = product.onHandQty - product.reservedQty;

    let daysRemaining;
    if (avgDailyConsumption <= 0) {
      daysRemaining = null; // No consumption history — can't forecast
    } else {
      daysRemaining = onHandQty / avgDailyConsumption;
    }

    const status = daysRemaining === null
      ? 'STABLE'
      : classifyStatus(daysRemaining);

    return {
      productId: product.id,
      product: product.name,
      sku: product.sku,
      onHand: Math.round(onHandQty * 10) / 10,
      totalOutLast30Days: Math.round(totalOut * 10) / 10,
      avgDailyConsumption: avgDailyConsumption > 0
        ? Math.round(avgDailyConsumption * 100) / 100
        : 0,
      daysRemaining: daysRemaining !== null
        ? Math.round(daysRemaining * 10) / 10
        : null,
      status,
      forecastWindowDays: FORECAST_WINDOW_DAYS,
    };
  });

  // CRITICAL first, STABLE last; within same status sort by daysRemaining ascending
  results.sort((a, b) => {
    const orderDiff = statusSortOrder(a.status) - statusSortOrder(b.status);
    if (orderDiff !== 0) return orderDiff;
    // Nulls (STABLE, no history) go to the end
    if (a.daysRemaining === null) return 1;
    if (b.daysRemaining === null) return -1;
    return a.daysRemaining - b.daysRemaining;
  });

  const summary = {
    critical: results.filter(r => r.status === 'CRITICAL').length,
    high:     results.filter(r => r.status === 'HIGH').length,
    medium:   results.filter(r => r.status === 'MEDIUM').length,
    stable:   results.filter(r => r.status === 'STABLE').length,
    totalProducts: results.length,
  };

  return { summary, forecast: results };
}

module.exports = { getProcurementForecast };
