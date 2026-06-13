const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const stockService = require('./stockService');

// Create MO manually
const createManufacturingOrder = async (data) => {
  const { productId, plannedQuantity, bomId } = data;

  // 1. Fetch BOM
  const bom = await prisma.bOM.findFirst({
    where: bomId ? { id: bomId } : { productId },
    include: { bomOperations: true }
  });

  if (!bom) {
    throw new Error(`No BOM found for product ${productId}`);
  }

  const orderNumber = `MO-${Date.now()}`;
  const ratio = plannedQuantity / bom.quantity;

  // 2. Create MO and auto-generate Work Orders
  return await prisma.manufacturingOrder.create({
    data: {
      orderNumber,
      productId,
      bomId: bom.id,
      status: 'DRAFT',
      plannedQuantity,
      workOrders: {
        create: bom.bomOperations.map(op => ({
          workCenterId: op.workCenterId,
          operationName: op.operationName,
          sequence: op.sequence,
          plannedDuration: op.duration * ratio,
          status: 'PENDING'
        }))
      }
    },
    include: { workOrders: true, bom: { include: { bomLines: true } } }
  });
};

const getManufacturingOrders = async (page = 1, limit = 10, status = null) => {
  const skip  = (parseInt(page) - 1) * parseInt(limit);
  const take  = parseInt(limit);
  const where = status && status !== 'ALL' ? { status: status.toUpperCase() } : {};

  const [orders, total] = await prisma.$transaction([
    prisma.manufacturingOrder.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: { product: true, workOrders: true }
    }),
    prisma.manufacturingOrder.count({ where })
  ]);

  return {
    orders,
    pagination: {
      total,
      page: parseInt(page),
      limit: take,
      totalPages: Math.ceil(total / take)
    }
  };
};

const getManufacturingOrderById = async (id) => {
  const order = await prisma.manufacturingOrder.findUnique({
    where: { id },
    include: {
      product: true,
      bom: {
        include: { bomLines: { include: { product: true } } }
      },
      workOrders: {
        include: { workCenter: true }
      }
    }
  });

  if (!order) throw new Error('Manufacturing Order not found');
  return order;
};

// Complete a Work Order
const completeWorkOrder = async (moId, woId, actualDuration) => {
  const mo = await getManufacturingOrderById(moId);
  const wo = mo.workOrders.find(w => w.id === woId);

  if (!wo) throw new Error(`Work Order ${woId} not found in MO ${moId}`);
  if (wo.status === 'DONE') throw new Error('Work Order is already completed');

  // Update WO status
  await prisma.workOrder.update({
    where: { id: woId },
    data: {
      status: 'DONE',
      actualDuration: actualDuration || wo.plannedDuration,
      endDate: new Date()
    }
  });

  // Re-fetch to check if all are done
  const updatedMo = await getManufacturingOrderById(moId);
  const allDone = updatedMo.workOrders.every(w => w.status === 'DONE');

  if (allDone) {
    // Consume components
    const ratio = updatedMo.plannedQuantity / updatedMo.bom.quantity;
    
    // We do this sequentially to accurately trace the ledger
    for (const line of updatedMo.bom.bomLines) {
      const requiredQty = line.quantity * ratio;
      await stockService.adjustStock(
        line.productId, 
        -requiredQty, 
        'mo_consumption', 
        'ManufacturingOrder', 
        updatedMo.id
      );
    }

    // Produce finished goods
    await stockService.adjustStock(
      updatedMo.productId,
      updatedMo.plannedQuantity,
      'mo_production',
      'ManufacturingOrder',
      updatedMo.id
    );

    // Mark MO done
    await prisma.manufacturingOrder.update({
      where: { id: moId },
      data: {
        status: 'DONE',
        completedQuantity: updatedMo.plannedQuantity,
        endDate: new Date()
      }
    });

    return {
      message: 'Work order completed and Manufacturing Order finalized',
      order: await getManufacturingOrderById(moId)
    };
  }

  // Update MO to IN_PROGRESS if it was DRAFT or PLANNED
  if (updatedMo.status === 'DRAFT' || updatedMo.status === 'PLANNED') {
    await prisma.manufacturingOrder.update({
      where: { id: moId },
      data: { status: 'IN_PROGRESS', startDate: new Date() }
    });
  }

  return {
    message: 'Work order completed',
    order: await getManufacturingOrderById(moId)
  };
};

// Update Work Order status (PENDING → READY → IN_PROGRESS → PAUSED → DONE)
const updateWorkOrderStatus = async (moId, woId, status) => {
  const mo = await getManufacturingOrderById(moId);
  const wo = mo.workOrders.find(w => w.id === woId);
  if (!wo) throw new Error(`Work Order ${woId} not found`);

  const allowed = { PENDING: ['READY'], READY: ['IN_PROGRESS'], IN_PROGRESS: ['PAUSED', 'DONE'], PAUSED: ['IN_PROGRESS'] };
  if (!allowed[wo.status]?.includes(status)) {
    throw new Error(`Cannot transition from ${wo.status} to ${status}`);
  }

  const updateData = { status };
  if (status === 'IN_PROGRESS' && !wo.startDate) updateData.startDate = new Date();
  if (status === 'DONE') {
    updateData.endDate = new Date();
    updateData.actualDuration = wo.plannedDuration;
  }

  await prisma.workOrder.update({ where: { id: woId }, data: updateData });

  // Move MO to IN_PROGRESS when first WO starts
  if (status === 'IN_PROGRESS' && ['DRAFT', 'PLANNED'].includes(mo.status)) {
    await prisma.manufacturingOrder.update({ where: { id: moId }, data: { status: 'IN_PROGRESS', startDate: new Date() } });
  }

  return getManufacturingOrderById(moId);
};

module.exports = {
  createManufacturingOrder,
  getManufacturingOrders,
  getManufacturingOrderById,
  updateWorkOrderStatus,
  completeWorkOrder
};
