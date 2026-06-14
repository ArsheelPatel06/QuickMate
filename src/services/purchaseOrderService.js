const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const stockService = require('./stockService');

// POST /purchase-orders
const createPurchaseOrder = async (userId, data) => {
  const { vendorId, lines } = data; 
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

  const orderNumber = `PO-${Date.now()}`;

  return await prisma.purchaseOrder.create({
    data: {
      orderNumber,
      vendorId,
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

// GET /purchase-orders
const getPurchaseOrders = async (page = 1, limit = 10) => {
  const skip = (page - 1) * limit;
  const take = parseInt(limit);

  const [orders, total] = await prisma.$transaction([
    prisma.purchaseOrder.findMany({
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: { vendor: true, user: { select: { name: true, email: true } } }
    }),
    prisma.purchaseOrder.count()
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

const getPurchaseOrderById = async (id) => {
  const order = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      lines: { include: { product: true } },
      vendor: true,
      user: { select: { name: true, email: true } }
    }
  });

  if (!order) throw new Error('Purchase Order not found');
  return order;
};

// POST /purchase-orders/:id/confirm
const confirmPurchaseOrder = async (id) => {
  const order = await getPurchaseOrderById(id);
  
  if (order.status !== 'DRAFT') {
    throw new Error(`Order cannot be confirmed from status ${order.status}`);
  }

  return await prisma.purchaseOrder.update({
    where: { id },
    data: { status: 'CONFIRMED' },
    include: { lines: true }
  });
};

// POST /purchase-orders/:id/receive
const receivePurchaseOrder = async (id, receipts) => {
  // receipts payload shape: [{ lineId: 'uuid', receivedQty: 10 }]
  const order = await getPurchaseOrderById(id);

  if (order.status !== 'CONFIRMED' && order.status !== 'PARTIALLY_DELIVERED') {
    throw new Error(`Cannot receive order from status ${order.status}`);
  }

  // First, we update the quantities safely
  await prisma.$transaction(async (tx) => {
    for (const receipt of receipts) {
      const line = order.lines.find(l => l.id === receipt.lineId);
      if (!line) throw new Error(`Line ${receipt.lineId} not found in order`);

      const newReceived = line.receivedQty + receipt.receivedQty;
      if (newReceived > line.quantity) {
        throw new Error(`Cannot receive more than ordered for product ${line.product.name}`);
      }

      await tx.purchaseOrderLine.update({
        where: { id: line.id },
        data: { receivedQty: newReceived }
      });
    }
  });

  // Then, we interact with the Stock Service natively to update central inventory ledgers
  for (const receipt of receipts) {
    const line = order.lines.find(l => l.id === receipt.lineId);
    if (receipt.receivedQty > 0) {
      await stockService.adjustStock(
        line.productId, 
        receipt.receivedQty, 
        'purchase_receipt', 
        'PurchaseOrder', 
        order.id
      );
    }
  }

  // Finally, evaluate completion status
  const updatedOrder = await getPurchaseOrderById(id);
  const isFullyReceived = updatedOrder.lines.every(l => l.receivedQty >= l.quantity);

  const newStatus = isFullyReceived ? 'FULLY_DELIVERED' : 'PARTIALLY_DELIVERED';

  return await prisma.purchaseOrder.update({
    where: { id },
    data: { status: newStatus },
    include: { lines: true }
  });
};

const cancelPurchaseOrder = async (id) => {
  const order = await getPurchaseOrderById(id);

  if (order.status === 'CANCELLED') {
    throw new Error('Purchase Order is already cancelled');
  }
  if (order.status === 'FULLY_DELIVERED') {
    throw new Error('Cannot cancel a fully received order');
  }
  if (order.status === 'PARTIALLY_DELIVERED') {
    throw new Error('Cannot cancel a partially received order');
  }

  return await prisma.purchaseOrder.update({
    where: { id },
    data: { status: 'CANCELLED' },
    include: { lines: true, vendor: true },
  });
};

module.exports = {
  createPurchaseOrder,
  getPurchaseOrders,
  getPurchaseOrderById,
  confirmPurchaseOrder,
  receivePurchaseOrder,
  cancelPurchaseOrder
};
