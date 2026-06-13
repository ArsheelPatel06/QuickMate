const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getDashboardStats = async (scope = 'all', userId = null) => {
  // Execute group-by queries to rapidly aggregate all statuses without heavy memory loading
  const [soGroups, poGroups, moGroups, lateMos] = await Promise.all([
    prisma.salesOrder.groupBy({ by: ['status'], _count: true }),
    prisma.purchaseOrder.groupBy({ by: ['status'], _count: true }),
    prisma.manufacturingOrder.groupBy({ by: ['status'], _count: true }),
    prisma.manufacturingOrder.count({
      where: {
        status: { notIn: ['DONE', 'CANCELLED'] },
        endDate: { lt: new Date() }
      }
    })
  ]);

  // Helper to map DB enum statuses to UI widget groupings
  const parseCounts = (groups, mapping) => {
    const result = {};
    for (const key of Object.keys(mapping)) { result[key] = 0; }
    groups.forEach(g => {
      const targetKey = Object.keys(mapping).find(k => mapping[k].includes(g.status));
      if (targetKey) {
        result[targetKey] += g._count;
      }
    });
    return result;
  };

  const sales = parseCounts(soGroups, {
    draft: ['DRAFT'],
    confirmed: ['CONFIRMED'],
    partiallyDelivered: ['PARTIALLY_DELIVERED', 'IN_PROGRESS'],
    delivered: ['FULLY_DELIVERED', 'COMPLETED']
  });
  // Without delivery dates in DB schema, default Late SOs to 0
  sales.late = 0; 

  const purchasing = parseCounts(poGroups, {
    draft: ['DRAFT'],
    confirmed: ['CONFIRMED'],
    partiallyReceived: ['PARTIALLY_DELIVERED'],
    received: ['FULLY_DELIVERED']
  });
  // Without delivery dates in DB schema, default Late POs to 0
  purchasing.late = 0; 

  const manufacturing = parseCounts(moGroups, {
    draft: ['DRAFT'],
    confirmed: ['PLANNED'],
    inProgress: ['IN_PROGRESS'],
    done: ['DONE']
  });
  // In a real flow, To Close might represent WOs done but financially open. Grouping it.
  manufacturing.toClose = manufacturing.done; 
  manufacturing.late = lateMos;

  return { sales, purchasing, manufacturing };
};

module.exports = {
  getDashboardStats
};
