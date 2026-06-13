const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const createVendor = async (data) => prisma.vendor.create({ data });
const getVendors = async () => prisma.vendor.findMany({ orderBy: { createdAt: 'desc' } });
const getVendorById = async (id) => prisma.vendor.findUnique({ where: { id } });
const updateVendor = async (id, data) => prisma.vendor.update({ where: { id }, data });
const deleteVendor = async (id) => prisma.vendor.delete({ where: { id } });

module.exports = { createVendor, getVendors, getVendorById, updateVendor, deleteVendor };
