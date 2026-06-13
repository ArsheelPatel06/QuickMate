const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getAuditLogs = async (filters, page = 1, limit = 20) => {
  const { entity, startDate, endDate, userId, action } = filters;
  const skip = (page - 1) * limit;
  const take = parseInt(limit);

  const where = {};
  if (entity) where.entity = entity;
  if (userId) where.userId = userId;
  if (action) where.action = action;
  
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  const [logs, total] = await prisma.$transaction([
    prisma.auditLog.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true, email: true, role: true } } }
    }),
    prisma.auditLog.count({ where })
  ]);

  return {
    logs,
    pagination: {
      total,
      page: parseInt(page),
      limit: take,
      totalPages: Math.ceil(total / take)
    }
  };
};

module.exports = { getAuditLogs };
