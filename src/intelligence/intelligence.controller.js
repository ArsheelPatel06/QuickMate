const { getInventoryRisk }          = require('./inventoryRisk.service');
const { getProcurementForecast }     = require('./procurementForecast.service');
const { getBottleneckAnalysis }      = require('./bottleneck.service');
const { getOrderRisk }               = require('./orderRisk.service');
const { getHealthScore }             = require('./healthScore.service');
const { getAdvisorRecommendations,
        generateRecommendations }    = require('./advisor.service');
const { successResponse }            = require('../utils/response');

const getInventoryRiskHandler = async (req, res, next) => {
  try {
    successResponse(res, 200, 'Inventory risk analysis retrieved successfully', await getInventoryRisk());
  } catch (e) { next(e); }
};

const getProcurementForecastHandler = async (req, res, next) => {
  try {
    successResponse(res, 200, 'Procurement forecast retrieved successfully', await getProcurementForecast());
  } catch (e) { next(e); }
};

const getBottleneckHandler = async (req, res, next) => {
  try {
    successResponse(res, 200, 'Bottleneck analysis retrieved successfully', await getBottleneckAnalysis());
  } catch (e) { next(e); }
};

const getOrderRiskHandler = async (req, res, next) => {
  try {
    successResponse(res, 200, 'Order risk analysis retrieved successfully', await getOrderRisk());
  } catch (e) { next(e); }
};

const getHealthScoreHandler = async (req, res, next) => {
  try {
    successResponse(res, 200, 'Business health score retrieved successfully', await getHealthScore());
  } catch (e) { next(e); }
};

const getAdvisorHandler = async (req, res, next) => {
  try {
    successResponse(res, 200, 'Operations advisor recommendations retrieved successfully', await getAdvisorRecommendations());
  } catch (e) { next(e); }
};

/**
 * GET /api/v1/intelligence/overview
 *
 * Runs all five engines in parallel, then derives alerts + advisor
 * from the same results — zero duplicate DB queries.
 */
const getOverviewHandler = async (req, res, next) => {
  try {
    const [inventoryRisk, procurementForecast, bottleneck, orderRisk, healthScore] =
      await Promise.all([
        getInventoryRisk(),
        getProcurementForecast(),
        getBottleneckAnalysis(),
        getOrderRisk(),
        getHealthScore(),
      ]);

    // ── Critical Alerts ───────────────────────────────────────────────────────
    const alerts = [];

    procurementForecast.forecast
      .filter(f => f.status === 'CRITICAL' && f.daysRemaining !== null)
      .forEach(f => alerts.push({
        level: 'CRITICAL', engine: 'procurement',
        message: `${f.product} stockout in ${f.daysRemaining} days`,
      }));

    orderRisk.orders
      .filter(o => o.orderRisk === 'CRITICAL' || o.orderRisk === 'HIGH')
      .forEach(o => alerts.push({
        level: o.orderRisk, engine: 'order',
        message: `${o.orderNumber} (${o.customer}) delayed +${o.delayDays} days — ${o.primaryReason}`,
      }));

    bottleneck.workCenters
      .filter(wc => wc.status === 'BOTTLENECK')
      .forEach(wc => alerts.push({
        level: 'HIGH', engine: 'bottleneck',
        message: `${wc.workCenter} at ${wc.utilization}% utilization (${wc.queueDepth} WOs queued)`,
      }));

    inventoryRisk.components
      .filter(c => c.risk === 'CRITICAL')
      .forEach(c => alerts.push({
        level: 'CRITICAL', engine: 'inventory',
        message: `${c.component} — only ${c.coverage}% of required stock (need ${c.required}, have ${c.available})`,
      }));

    alerts.sort((a, b) => (a.level === 'CRITICAL' ? -1 : b.level === 'CRITICAL' ? 1 : 0));

    // ── Advisor — reuses already-fetched engine data (no extra DB round-trip) ─
    const advisor = generateRecommendations(
      inventoryRisk, procurementForecast, bottleneck, orderRisk, healthScore
    );

    successResponse(res, 200, 'Operations intelligence overview retrieved successfully', {
      advisor,
      healthScore,
      alerts,
      inventoryRisk,
      procurementForecast,
      bottleneck,
      orderRisk,
    });
  } catch (e) { next(e); }
};

module.exports = {
  getInventoryRiskHandler,
  getProcurementForecastHandler,
  getBottleneckHandler,
  getOrderRiskHandler,
  getHealthScoreHandler,
  getAdvisorHandler,
  getOverviewHandler,
};
