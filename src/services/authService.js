const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../utils/jwt');

const prisma = new PrismaClient();

const registerUser = async (email, password, name, role = 'SALES') => {
  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingUser) {
    throw new Error('User already exists');
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: hashedPassword,
      name,
      role
    }
  });

  const token = generateToken(user.id);
  
  // don't return password
  const userWithoutPassword = { ...user };
  delete userWithoutPassword.passwordHash;

  return { user: userWithoutPassword, token };
};

const loginUser = async (email, password) => {
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    throw new Error('Invalid credentials');
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);

  if (!isMatch) {
    throw new Error('Invalid credentials');
  }

  const token = generateToken(user.id);
  
  const userWithoutPassword = { ...user };
  delete userWithoutPassword.passwordHash;

  return { user: userWithoutPassword, token };
};

const getAllUsers = async () => {
  return await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true
    },
    orderBy: { createdAt: 'desc' }
  });
};

module.exports = {
  registerUser,
  loginUser,
  getAllUsers
};
