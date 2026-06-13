const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const WORKING_HOURS_PER_DAY = 8;
const MINUTES_PER_DAY = WORKING_HOURS_PER_DAY * 60; // 480 min

const STATUS_TIERS = [
  { status: 'BOTTLENECK',    minUtil: 100,  sortOrder: 0 },
  { status: 'HIGH_LOAD',     minUtil: 70,   sortOrder: 1 },
  { status: 'MODERATE',      minUtil: 40,   sortOrder: 2 },
  { status: 'UNDERUTILIZED', minUtil: 0,    sortOrder: 3 },
];

function classifyUtilization(utilization) {
  for (const { status, minUtil } of STATUS_TIERS) {
    if (utilization >= minUtil) return status;
  }
  return 'UNDERUTILIZED';
}

/**
 * Bottleneck Analysis Engine.
 *
 * For every WorkCenter:
 *   1. Count all active (PENDING / READY / IN_PROGRESS) Work Orders.
 *   2. Sum their plannedDuration to get total queued minutes.
 *   3. availableMinutes = capacity × MINUTES_PER_DAY  (one working day).
 *   4. utilization (%) = (queuedMinutes / availableMinutes) × 100.
 *
 * A utilization > 100% means the center cannot finish today's queue today → BOTTLENECK.
 */
async function getBottleneckAnalysis() {
  const workCenters = await prisma.workCenter.findMany({
    orderBy: { name: 'asc' }
  });

  // Fetch all active WOs grouped by workCenterId in one query
  const activeWorkOrders = await prisma.workOrder.findMany({
    where: {
      status: { in: ['PENDING', 'READY', 'IN_PROGRESS'] }
    },
    select: {
      workCenterId: true,
      status: true,
      plannedDuration: true
    }
  });

  // Group WOs by workCenterId
  const woMap = new Map();
  for (const wo of activeWorkOrders) {
    if (!woMap.has(wo.workCenterId)) {
      woMap.set(wo.workCenterId, []);
    }
    woMap.get(wo.workCenterId).push(wo);
  }

  const results = workCenters.map(wc => {
    const wos = woMap.get(wc.id) ?? [];
    const queueDepth = wos.length;
    const queuedMinutes = wos.reduce((sum, wo) => sum + (wo.plannedDuration ?? 0), 0);
    const availableMinutes = wc.capacity * MINUTES_PER_DAY;
    const utilization = availableMinutes > 0
      ? Math.round((queuedMinutes / availableMinutes) * 1000) / 10  // 1 decimal place
      : 0;
    const status = classifyUtilization(utilization);

    return {
      workCenterId: wc.id,
      workCenter: wc.name,
      capacity: wc.capacity,
      queueDepth,
      queuedMinutes: Math.round(queuedMinutes),
      availableMinutes,
      utilization,
      status,
      costPerHour: parseFloat(wc.costPerHour.toString()),
    };
  });

  // BOTTLENECK first
  results.sort((a, b) => {
    const aOrder = STATUS_TIERS.find(t => t.status === a.status)?.sortOrder ?? 4;
    const bOrder = STATUS_TIERS.find(t => t.status === b.status)?.sortOrder ?? 4;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return b.utilization - a.utilization; // highest utilization first within same tier
  });

  const summary = {
    bottleneck:    results.filter(r => r.status === 'BOTTLENECK').length,
    highLoad:      results.filter(r => r.status === 'HIGH_LOAD').length,
    moderate:      results.filter(r => r.status === 'MODERATE').length,
    underutilized: results.filter(r => r.status === 'UNDERUTILIZED').length,
    totalCenters:  results.length,
  };

  return { summary, workCenters: results };
}

module.exports = { getBottleneckAnalysis };
