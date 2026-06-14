/**
 * Flow Service — stock check, make-vs-buy cost comparison, fulfillment routing
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const stockService = require('./stockService');
const procurementService = require('./procurementService');
const manufacturingOrderService = require('./manufacturingOrderService');

const num = (v) => Number(v ?? 0);

async function getOrderWithLines(salesOrderId) {
  const order = await prisma.salesOrder.findUnique({
    where: { id: salesOrderId },
    include: { lines: { include: { product: true } } },
  });
  if (!order) throw new Error('Sales Order not found');
  return order;
}

/** Calculate manufacturing cost from BOM components for a given qty */
async function calcManufacturingCost(productId, qty) {
  const bom = await prisma.bOM.findFirst({
    where: { productId },
    include: { bomLines: { include: { product: true } } },
  });
  if (!bom) return { cost: null, bom: null };

  const ratio = qty / bom.quantity;
  const cost = bom.bomLines.reduce(
    (sum, line) => sum + num(line.product.costPrice) * line.quantity * ratio,
    0
  );
  return { cost: Math.round(cost * 100) / 100, bom };
}

function decideMethod(manufacturingCost, vendorCost, hasBom) {
  if (!hasBom) return 'PURCHASE';
  if (manufacturingCost === null) return 'PURCHASE';
  return manufacturingCost <= vendorCost ? 'MANUFACTURE' : 'PURCHASE';
}

/** Analyze one SO line: stock, costs, recommendation */
async function analyzeLine(line, orderStatus, linkedMos, linkedPos) {
  const product = line.product;
  const freeQty = await stockService.getFreeToUseQty(line.productId);
  const hasLineMo = linkedMos.some(m => m.productId === line.productId);
  const hasLinePo = linkedPos.some(p => p.lines?.some(l => l.productId === line.productId));

  let shortage;
  if (orderStatus === 'DRAFT') {
    shortage = Math.max(0, line.quantity - freeQty);
  } else if (hasLineMo || hasLinePo) {
    shortage = Math.max(0, line.quantity - freeQty);
  } else {
    // Confirmed+ with no fulfillment doc — reserved stock covers the order
    shortage = Math.max(0, line.quantity - num(product.onHandQty));
  }
  const vendorCost = Math.round(num(product.costPrice) * shortage * 100) / 100;

  const { cost: manufacturingCost, bom } = await calcManufacturingCost(line.productId, shortage || line.quantity);

  const recommendation = shortage === 0
    ? 'IN_STOCK'
    : decideMethod(manufacturingCost, vendorCost, !!bom);

  const savings = manufacturingCost !== null && shortage > 0
    ? Math.abs(vendorCost - manufacturingCost)
    : 0;

  return {
    lineId: line.id,
    productId: line.productId,
    productName: product.name,
    sku: product.sku,
    orderedQty: line.quantity,
    availableQty: Math.round(freeQty * 100) / 100,
    shortage: Math.round(shortage * 100) / 100,
    vendorCost,
    manufacturingCost: shortage > 0 ? manufacturingCost : 0,
    recommendation,
    reason: shortage === 0
      ? 'Sufficient stock — reserved on confirm'
      : recommendation === 'MANUFACTURE'
        ? `Make in-house saves ₹${Math.round(savings).toLocaleString()} vs vendor (₹${vendorCost.toLocaleString()} vs ₹${manufacturingCost?.toLocaleString()})`
        : `Buy from vendor saves ₹${Math.round(savings).toLocaleString()} vs manufacturing (₹${vendorCost.toLocaleString()} vs ₹${manufacturingCost?.toLocaleString()})`,
    hasBom: !!bom,
  };
}

/** Full flow analysis for Flow Tracker UI */
const analyzeFlow = async (salesOrderId) => {
  const order = await getOrderWithLines(salesOrderId);

  const linkedMos = await prisma.manufacturingOrder.findMany({
    where: { sourceSalesOrderId: salesOrderId },
    include: { product: true, workOrders: true },
  });

  const linkedPos = await prisma.purchaseOrder.findMany({
    where: { sourceSalesOrderId: salesOrderId },
    include: { lines: { select: { id: true, quantity: true, receivedQty: true, productId: true } } },
  });

  const lineAnalysis = await Promise.all(
    order.lines.map(line => analyzeLine(line, order.status, linkedMos, linkedPos))
  );

  const hasShortage = lineAnalysis.some(l => l.shortage > 0);
  const allInStock = lineAnalysis.every(l => l.shortage === 0);
  const hasMo = linkedMos.length > 0;
  const moDone = hasMo && linkedMos.every(m => m.status === 'DONE');
  const moInProgress = linkedMos.some(m => ['DRAFT', 'PLANNED', 'IN_PROGRESS', 'CONFIRMED'].includes(m.status));
  const hasPo = linkedPos.length > 0;
  const poDraft = hasPo && linkedPos.some(p => p.status === 'DRAFT');
  const poAwaitingReceipt = hasPo && linkedPos.some(p => ['CONFIRMED', 'PARTIALLY_DELIVERED'].includes(p.status));
  const poReceived = hasPo && linkedPos.every(p => p.status === 'FULLY_DELIVERED');
  const totalWo = linkedMos.flatMap(m => m.workOrders);
  const woDone = totalWo.filter(w => w.status === 'DONE').length;

  const readyForDelivery =
    ['CONFIRMED', 'IN_PROGRESS', 'PARTIALLY_DELIVERED'].includes(order.status) &&
    (allInStock || (hasMo && moDone) || poReceived);

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    status: order.status,
    totalAmount: num(order.totalAmount),
    lines: lineAnalysis,
    linkedManufacturingOrders: linkedMos.map(m => ({
      id: m.id,
      orderNumber: m.orderNumber,
      status: m.status,
      productName: m.product.name,
      plannedQuantity: m.plannedQuantity,
      workOrdersTotal: m.workOrders.length,
      workOrdersDone: m.workOrders.filter(w => w.status === 'DONE').length,
    })),
    linkedPurchaseOrders: linkedPos.map(p => ({
      id: p.id,
      orderNumber: p.orderNumber,
      status: p.status,
      totalAmount: num(p.totalAmount),
      lines: p.lines.map(l => ({
        id: l.id,
        productId: l.productId,
        quantity: l.quantity,
        receivedQty: l.receivedQty,
        remainingQty: Math.max(0, l.quantity - l.receivedQty),
      })),
    })),
    summary: {
      hasShortage,
      allInStock,
      hasMo,
      moDone,
      moInProgress,
      hasPo,
      poDraft,
      poAwaitingReceipt,
      poReceived,
      workOrdersProgress: totalWo.length ? `${woDone}/${totalWo.length}` : null,
      readyForDelivery,
      nextAction: getNextAction(order.status, lineAnalysis, linkedMos, linkedPos, readyForDelivery),
    },
  };
};

function getNextAction(status, lines, mos, pos, readyForDelivery) {
  if (status === 'DRAFT') return 'Confirm order to run inventory check';
  if (status === 'FULLY_DELIVERED' || status === 'COMPLETED') return 'Order complete';

  const needsFulfillment = lines.some(l => l.shortage > 0) && mos.length === 0 && pos.length === 0;
  if (needsFulfillment) {
    const rec = lines.find(l => l.shortage > 0)?.recommendation;
    return rec === 'MANUFACTURE'
      ? 'Create Manufacturing Order (make in-house is cheaper)'
      : rec === 'PURCHASE'
        ? 'Create Purchase Order (vendor is cheaper)'
        : 'Fulfill shortage';
  }

  if (mos.some(m => !['DONE', 'CANCELLED'].includes(m.status))) {
    return 'Complete work orders on Production Floor';
  }

  if (pos.some(p => p.status === 'DRAFT')) {
    return 'Confirm Purchase Order before receiving goods';
  }

  if (pos.some(p => ['CONFIRMED', 'PARTIALLY_DELIVERED'].includes(p.status))) {
    return 'Receive purchase order goods into inventory';
  }

  if (readyForDelivery) return 'Mark as delivered';
  return 'Waiting for production or stock';
}

/** Fulfill shortages — create MO or PO based on cost comparison (or explicit method) */
const fulfillShortage = async (salesOrderId, { method = 'AUTO' } = {}) => {
  const order = await getOrderWithLines(salesOrderId);
  const analysis = await analyzeFlow(salesOrderId);
  const results = [];

  for (const line of analysis.lines) {
    if (line.shortage <= 0) continue;

    // Skip if MO or PO already exists for this product from this SO
    const existingMo = await prisma.manufacturingOrder.findFirst({
      where: { sourceSalesOrderId: salesOrderId, productId: line.productId },
    });
    const existingPo = await prisma.purchaseOrder.findFirst({
      where: {
        sourceSalesOrderId: salesOrderId,
        lines: { some: { productId: line.productId } },
      },
    });
    if (existingMo || existingPo) {
      results.push({ productName: line.productName, skipped: true, reason: 'Already fulfilled' });
      continue;
    }

    const action = method === 'AUTO'
      ? line.recommendation
      : method === 'MANUFACTURE' ? 'MANUFACTURE' : 'PURCHASE';

    if (action === 'MANUFACTURE') {
      if (!line.hasBom) {
        results.push({ productName: line.productName, error: 'No BOM — cannot manufacture' });
        continue;
      }
      const mo = await manufacturingOrderService.createManufacturingOrder({
        productId: line.productId,
        plannedQuantity: line.shortage,
        sourceSalesOrderId: salesOrderId,
      });
      results.push({ type: 'MO', orderNumber: mo.orderNumber, productName: line.productName, qty: line.shortage });
    } else {
      const proc = await procurementService.triggerProcurement(
        line.productId,
        line.shortage,
        salesOrderId,
        { forcePurchase: action === 'PURCHASE', forceManufacture: action === 'MANUFACTURE' }
      );
      if (proc) {
        results.push({
          type: proc.type === 'ManufacturingOrder' ? 'MO' : 'PO',
          orderNumber: proc.document.orderNumber,
          productName: line.productName,
          qty: line.shortage,
        });
      }
    }
  }

  return { results, analysis: await analyzeFlow(salesOrderId) };
};

module.exports = { analyzeFlow, fulfillShortage, analyzeLine };
