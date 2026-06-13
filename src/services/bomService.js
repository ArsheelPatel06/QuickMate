const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const createBom = async (data) => {
  const { name, productId, quantity, components, operations } = data;

  return await prisma.bOM.create({
    data: {
      name,
      productId,
      quantity: quantity || 1,
      bomLines: {
        create: components.map(c => ({
          productId: c.productId,
          quantity: c.quantity
        }))
      },
      bomOperations: {
        create: operations.map(o => ({
          operationName: o.operationName,
          duration: o.durationMinutes,
          sequence: o.sequence,
          workCenterId: o.workCenterId
        }))
      }
    },
    include: {
      bomLines: true,
      bomOperations: true
    }
  });
};

const getBoms = async (page = 1, limit = 10, search = '') => {
  const skip = (page - 1) * limit;
  const take = parseInt(limit);

  const where = search ? {
    OR: [
      { name: { contains: search, mode: 'insensitive' } },
      { product: { name: { contains: search, mode: 'insensitive' } } }
    ]
  } : {};

  const [boms, total] = await prisma.$transaction([
    prisma.bOM.findMany({
      where,
      skip,
      take,
      include: { product: true },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.bOM.count({ where })
  ]);

  return {
    boms,
    pagination: {
      total,
      page: parseInt(page),
      limit: take,
      totalPages: Math.ceil(total / take)
    }
  };
};

const getBomById = async (id) => {
  const bom = await prisma.bOM.findUnique({
    where: { id },
    include: {
      product: true,
      bomLines: {
        include: { product: true }
      },
      bomOperations: {
        include: { workCenter: true }
      }
    }
  });

  if (!bom) throw new Error('BOM not found');
  return bom;
};

const updateBom = async (id, data) => {
  const { name, productId, quantity, components, operations } = data;

  await getBomById(id); // check if exists

  return await prisma.$transaction(async (tx) => {
    // Delete existing lines and operations
    await tx.bOMLine.deleteMany({ where: { bomId: id } });
    await tx.bOMOperation.deleteMany({ where: { bomId: id } });

    // Update BOM and recreate lines/operations
    return await tx.bOM.update({
      where: { id },
      data: {
        name,
        productId,
        quantity,
        bomLines: {
          create: components.map(c => ({
            productId: c.productId,
            quantity: c.quantity
          }))
        },
        bomOperations: {
          create: operations.map(o => ({
            operationName: o.operationName,
            duration: o.durationMinutes,
            sequence: o.sequence,
            workCenterId: o.workCenterId
          }))
        }
      },
      include: {
        bomLines: true,
        bomOperations: true
      }
    });
  });
};

const deleteBom = async (id) => {
  await getBomById(id);
  return await prisma.bOM.delete({ where: { id } });
};

const explodeBom = async (id, multiplier = 1) => {
  const bom = await getBomById(id);

  let components = [];
  let operations = [];
  let workCenters = [];

  for (const line of bom.bomLines) {
    const requiredQty = line.quantity * multiplier;
    if (line.product.procurementType === 'MANUFACTURE') {
      // Recursively explode child BOMs if it's a manufactured product
      const childBom = await prisma.bOM.findFirst({ where: { productId: line.productId } });
      if (childBom) {
         const childExplosion = await explodeBom(childBom.id, requiredQty / childBom.quantity);
         components.push(...childExplosion.components);
         operations.push(...childExplosion.operations);
         workCenters.push(...childExplosion.workCenters);
      } else {
         components.push({ ...line, calculatedQuantity: requiredQty });
      }
    } else {
      components.push({ ...line, calculatedQuantity: requiredQty });
    }
  }

  for (const op of bom.bomOperations) {
     operations.push({
        ...op,
        calculatedDuration: op.duration * multiplier,
     });
     
     // Deduplicate work centers
     if (!workCenters.some(wc => wc.id === op.workCenter.id)) {
        workCenters.push(op.workCenter);
     }
  }

  return { components, operations, workCenters };
};

module.exports = {
  createBom,
  getBoms,
  getBomById,
  updateBom,
  deleteBom,
  explodeBom
};
