const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const createWorkCenter = async (data) => prisma.workCenter.create({ data });
const getWorkCenters = async () => prisma.workCenter.findMany({ orderBy: { createdAt: 'desc' } });
const getWorkCenterById = async (id) => prisma.workCenter.findUnique({ where: { id } });
const updateWorkCenter = async (id, data) => prisma.workCenter.update({ where: { id }, data });
const deleteWorkCenter = async (id) => prisma.workCenter.delete({ where: { id } });

module.exports = { createWorkCenter, getWorkCenters, getWorkCenterById, updateWorkCenter, deleteWorkCenter };
