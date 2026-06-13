const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

const SAFE_SELECT = {
  id: true, name: true, email: true, role: true,
  department: true, approvalLimit: true, isActive: true,
  createdAt: true, updatedAt: true,
};

const getAllUsers = async () => {
  return prisma.user.findMany({
    select: SAFE_SELECT,
    orderBy: { createdAt: 'desc' },
  });
};

const getUserById = async (id) => {
  return prisma.user.findUnique({ where: { id }, select: SAFE_SELECT });
};

const createUser = async ({ name, email, password, role, department, approvalLimit }) => {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error('A user with this email already exists.');

  const passwordHash = await bcrypt.hash(password, 10);
  return prisma.user.create({
    data: { name, email, passwordHash, role, department, approvalLimit: approvalLimit ?? 0 },
    select: SAFE_SELECT,
  });
};

const updateUser = async (id, updates) => {
  const { name, role, department, approvalLimit, isActive } = updates;
  const data = {};
  if (name !== undefined)          data.name = name;
  if (role !== undefined)          data.role = role;
  if (department !== undefined)    data.department = department;
  if (approvalLimit !== undefined) data.approvalLimit = Number(approvalLimit);
  if (isActive !== undefined)      data.isActive = isActive;

  return prisma.user.update({ where: { id }, data, select: SAFE_SELECT });
};

const disableUser = async (id) => {
  return prisma.user.update({ where: { id }, data: { isActive: false }, select: SAFE_SELECT });
};

const enableUser = async (id) => {
  return prisma.user.update({ where: { id }, data: { isActive: true }, select: SAFE_SELECT });
};

/**
 * Generate a temporary password and update the user's hash.
 * Returns the plain-text temp password (caller must email it).
 */
const resetPassword = async (id) => {
  const tempPassword = Math.random().toString(36).slice(-10) + 'A1!';
  const passwordHash = await bcrypt.hash(tempPassword, 10);
  await prisma.user.update({ where: { id }, data: { passwordHash } });
  return tempPassword;
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  disableUser,
  enableUser,
  resetPassword,
};
