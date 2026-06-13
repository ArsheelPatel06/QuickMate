const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const createProduct = async (data) => {
  return await prisma.product.create({
    data
  });
};

const getProducts = async (page = 1, limit = 10, search = '') => {
  const skip = (page - 1) * limit;
  const take = parseInt(limit);

  const where = search ? {
    OR: [
      { name: { contains: search, mode: 'insensitive' } },
      { sku: { contains: search, mode: 'insensitive' } }
    ]
  } : {};

  const [products, total] = await prisma.$transaction([
    prisma.product.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' }
    }),
    prisma.product.count({ where })
  ]);

  return {
    products,
    pagination: {
      total,
      page: parseInt(page),
      limit: take,
      totalPages: Math.ceil(total / take)
    }
  };
};

const getProductById = async (id) => {
  const product = await prisma.product.findUnique({
    where: { id }
  });

  if (!product) {
    throw new Error('Product not found');
  }

  return product;
};

const updateProduct = async (id, data) => {
  // Check if exists
  await getProductById(id);

  return await prisma.product.update({
    where: { id },
    data
  });
};

const deleteProduct = async (id) => {
  // Check if exists
  await getProductById(id);

  return await prisma.product.delete({
    where: { id }
  });
};

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct
};
