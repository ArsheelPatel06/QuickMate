const { getInventoryRisk }      = require('./inventoryRisk.service');
const { getProcurementForecast } = require('./procurementForecast.service');
const { getBottleneckAnalysis }  = require('./bottleneck.service');

// Penalty points deducted per issue (subtracted from 100)
const PENALTIES = {
  inventory:    { CRITICAL: 10, HIGH: 5, MEDIUM: 2 },
  procurement:  { CRITICAL: 10, HIGH: 5, MEDIUM: 2 },
  manufacturing:{ BOTTLENECK: 25, HIGH_LOAD: 10 },
};

// Weights for the three pillars (must sum to 1.0)
const WEIGHTS = {
  inventory:    0.30,
  manufacturing: 0.35,
  procurement:  0.35,
};

/**
 * Business Health Score Engine.
 *
 * Aggregates outputs from all three engines into a single 0-100 score.
 * Each pillar starts at 100 and loses points per detected issue.
 *
 * With calibrated seed data:
 *   Inventory    = 100 − (3×10) − (1×5) = 65
 *   Procurement  = 100 − (1×10) − (1×5) − (1×2) = 83
 *   Manufacturing= 100 − (1×25) = 75
 *   Overall      = 65×0.30 + 83×0.35 + 75×0.35 ≈ 75  ✓ (target 70–80)
 */
async function getHealthScore() {
  // Run all three engines in parallel
  const [inventoryData, forecastData, bottleneckData] = await Promise.all([
    getInventoryRisk(),
    getProcurementForecast(),
    getBottleneckAnalysis(),
  ]);

  const invSummary  = inventoryData.summary;
  const procSummary = forecastData.summary;
  const mfgSummary  = bottleneckData.summary;

  const inventoryHealth = Math.max(0,
    100
    - (invSummary.critical  * PENALTIES.inventory.CRITICAL)
    - (invSummary.high      * PENALTIES.inventory.HIGH)
    - (invSummary.medium    * PENALTIES.inventory.MEDIUM)
  );

  const procurementHealth = Math.max(0,
    100
    - (procSummary.critical * PENALTIES.procurement.CRITICAL)
    - (procSummary.high     * PENALTIES.procurement.HIGH)
    - (procSummary.medium   * PENALTIES.procurement.MEDIUM)
  );

  const manufacturingHealth = Math.max(0,
    100
    - (mfgSummary.bottleneck * PENALTIES.manufacturing.BOTTLENECK)
    - (mfgSummary.highLoad   * PENALTIES.manufacturing.HIGH_LOAD)
  );

  const overall = Math.round(
    inventoryHealth    * WEIGHTS.inventory    +
    manufacturingHealth * WEIGHTS.manufacturing +
    procurementHealth  * WEIGHTS.procurement
  );

  // Generate human-readable signal labels per pillar
  function pillarSignal(score) {
    if (score >= 85) return 'HEALTHY';
    if (score >= 70) return 'MODERATE';
    if (score >= 50) return 'AT_RISK';
    return 'CRITICAL';
  }

  return {
    overall,
    signal: pillarSignal(overall),
    breakdown: {
      inventoryHealth:    Math.round(inventoryHealth),
      manufacturingHealth: Math.round(manufacturingHealth),
      procurementHealth:  Math.round(procurementHealth),
    },
    signals: {
      inventory:     pillarSignal(inventoryHealth),
      manufacturing: pillarSignal(manufacturingHealth),
      procurement:   pillarSignal(procurementHealth),
    },
    issueCount: {
      inventoryCritical:    invSummary.critical,
      inventoryHigh:        invSummary.high,
      procurementCritical:  procSummary.critical,
      procurementHigh:      procSummary.high,
      bottlenecks:          mfgSummary.bottleneck,
    },
  };
}

module.exports = { getHealthScore };
