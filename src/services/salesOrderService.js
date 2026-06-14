const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const stockService = require('./stockService');

const createSalesOrder = async (userId, data) => {
  const { customerName, lines } = data; 

  let totalAmount = 0;
  const orderLines = lines.map(line => {
    const lineTotal = line.quantity * line.unitPrice;
    totalAmount += lineTotal;
    return {
      productId: line.productId,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      lineTotal
    };
  });

  const orderNumber = `SO-${Date.now()}`;

  return await prisma.salesOrder.create({
    data: {
      orderNumber,
      customerName,
      userId,
      totalAmount,
      status: 'DRAFT',
      lines: {
        create: orderLines
      }
    },
    include: { lines: true }
  });
};

const getSalesOrders = async (page = 1, limit = 10) => {
  const skip = (page - 1) * limit;
  const take = parseInt(limit);

  const [orders, total] = await prisma.$transaction([
    prisma.salesOrder.findMany({
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, email: true } },
        lines: { include: { product: { select: { id: true, name: true, sku: true, onHandQty: true, reservedQty: true } } } },
      },
    }),
    prisma.salesOrder.count()
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

const getSalesOrderById = async (id) => {
  const order = await prisma.salesOrder.findUnique({
    where: { id },
    include: {
      lines: { include: { product: true } },
      user: { select: { name: true, email: true } }
    }
  });

  if (!order) throw new Error('Sales Order not found');
  return order;
};

const confirmSalesOrder = async (id) => {
  const order = await getSalesOrderById(id);
  
  if (order.status !== 'DRAFT') {
    throw new Error(`Order cannot be confirmed from status ${order.status}`);
  }

  // 1. Check stock & 3. Detect shortages
  const shortages = [];
  for (const line of order.lines) {
    const freeQty = await stockService.getFreeToUseQty(line.productId);
    if (freeQty < line.quantity) {
      shortages.push({
        productId: line.productId,
        productName: line.product.name,
        requested: line.quantity,
        available: freeQty,
        shortage: line.quantity - freeQty
      });
    }
  }

  // 2. Reserve stock for whatever is freely available
  for (const line of order.lines) {
    const freeQty = await stockService.getFreeToUseQty(line.productId);
    const qtyToReserve = Math.min(line.quantity, Math.max(0, freeQty));
    
    if (qtyToReserve > 0) {
      await stockService.reserveStock(line.productId, qtyToReserve);
    }
  }

  if (shortages.length > 0) {
    // Shortages detected — Flow Tracker drives MO/PO creation via /fulfill endpoint
    // (avoids auto-routing before user sees make-vs-buy comparison)
  }

  return await prisma.salesOrder.update({
    where: { id },
    data: { status: 'CONFIRMED' },
    include: { lines: true }
  });
};

const deliverSalesOrder = async (id) => {
  const order = await getSalesOrderById(id);

  if (order.status !== 'CONFIRMED' && order.status !== 'PARTIALLY_DELIVERED') {
    throw new Error(`Cannot deliver order from status ${order.status}`);
  }

  // Handle delivery
  for (const line of order.lines) {
    // Attempt to release previously reserved stock
    const product = await prisma.product.findUnique({where: {id: line.productId}});
    const releaseQty = Math.min(line.quantity, product.reservedQty);
    
    if (releaseQty > 0) {
      await stockService.releaseReservation(line.productId, releaseQty);
    }
    
    // Process the actual stock deduction via the Stock Service ledger
    await stockService.adjustStock(
      line.productId, 
      -line.quantity, 
      'sales_delivery', 
      'SalesOrder', 
      order.id
    );
  }

  return await prisma.salesOrder.update({
    where: { id },
    data: { status: 'FULLY_DELIVERED' },
    include: { lines: true }
  });
};

module.exports = {
  createSalesOrder,
  getSalesOrders,
  getSalesOrderById,
  confirmSalesOrder,
  deliverSalesOrder
};
