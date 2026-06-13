/**
 * Automation Engine — trigger / condition / action
 *
 * Entry points:
 *   processOrderConfirm(salesOrderId)      — called when SO status → CONFIRMED
 *   processWorkOrderComplete(workOrderId)  — called when WO status → DONE
 *   processPoApproval(purchaseOrderId)     — called when PO status → CONFIRMED
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const notificationService = require('./notificationService');
const emailService         = require('./emailService');
const approvalService      = require('./approvalService');

// ─── Helper: find or create a BOM for a product ──────────────────────────────
const getBomForProduct = (productId) =>
  prisma.bOM.findFirst({
    where: { productId },
    include: { bomLines: { include: { product: true } }, bomOperations: { include: { workCenter: true } } },
  });

// ─── Helper: generate next sequential number ─────────────────────────────────
const nextNumber = async (prefix, model, field) => {
  const last = await prisma[model].findFirst({
    orderBy: { createdAt: 'desc' },
    select: { [field]: true },
  });
  const num = last
    ? parseInt(last[field].replace(prefix + '-', ''), 10) + 1
    : 1001;
  return `${prefix}-${num}`;
};

// ─── Helper: get all users of a role ─────────────────────────────────────────
const usersOfRole = (role) =>
  prisma.user.findMany({
    where: { role, isActive: true },
    select: { id: true, name: true, email: true },
  });

// ─── TRIGGER: Sales Order Confirmed ──────────────────────────────────────────
/**
 * WHEN SO confirmed
 * IF any finished-good has stock < quantity ordered  → auto create MO + notify manufacturing
 * ELSE                                                → reserve stock + notify sales
 */
const processOrderConfirm = async (salesOrderId) => {
  const so = await prisma.salesOrder.findUnique({
    where: { id: salesOrderId },
    include: {
      lines: { include: { product: true } },
      user:  { select: { id: true, name: true, email: true } },
    },
  });
  if (!so) return;

  const log = (msg) => console.log(`[Automation][SO:${so.orderNumber}] ${msg}`);

  // Audit: SO Confirmed
  await prisma.auditLog.create({
    data: {
      userId:   so.userId,
      action:   'UPDATE',
      entity:   'SalesOrder',
      entityId: so.id,
      details:  { event: 'SO_CONFIRMED', orderNumber: so.orderNumber },
    },
  });

  for (const line of so.lines) {
    const available = line.product.onHandQty - line.product.reservedQty;

    if (available >= line.quantity) {
      // ACTION: Reserve stock
      await prisma.product.update({
        where: { id: line.productId },
        data: { reservedQty: { increment: line.quantity } },
      });

      await prisma.stockLedger.create({
        data: {
          productId:       line.productId,
          transactionType: 'OUT',
          quantity:        line.quantity,
          reason:          'sales_reservation',
          referenceType:   'SalesOrder',
          referenceId:     so.id,
        },
      });

      log(`Stock reserved for ${line.product.name} (qty: ${line.quantity})`);

      // Notify Sales team
      const salesUsers = await usersOfRole('SALES');
      await notificationService.broadcastNotification(
        salesUsers.map(u => u.id),
        'SYSTEM',
        `${so.orderNumber}: Stock Reserved`,
        `${line.quantity} × ${line.product.name} reserved. Order ready for delivery.`,
        `/sales-orders`
      );
    } else {
      // ACTION: Create Manufacturing Order
      const bom = await getBomForProduct(line.productId);
      if (!bom) {
        log(`No BOM found for ${line.product.name} — skipping MO creation`);
        continue;
      }

      const moNumber = await nextNumber('MO', 'manufacturingOrder', 'orderNumber');

      const mo = await prisma.manufacturingOrder.create({
        data: {
          orderNumber:       moNumber,
          productId:         line.productId,
          bomId:             bom.id,
          status:            'PLANNED',
          plannedQuantity:   line.quantity,
          sourceSalesOrderId: so.id,
          startDate:         new Date(),
        },
      });

      log(`MO ${moNumber} created for ${line.product.name}`);

      // Audit
      await prisma.auditLog.create({
        data: {
          userId:   so.userId,
          action:   'CREATE',
          entity:   'ManufacturingOrder',
          entityId: mo.id,
          details:  { event: 'AUTO_MO_CREATED', moNumber, sourceOrder: so.orderNumber },
        },
      });

      // Notify manufacturing team
      const mfgUsers = await usersOfRole('MANUFACTURING');
      await notificationService.broadcastNotification(
        mfgUsers.map(u => u.id),
        'MO_CREATED',
        `MO Created: ${moNumber}`,
        `Manufacturing Order ${moNumber} for ${line.quantity} × ${line.product.name} was auto-created from ${so.orderNumber}.`,
        `/manufacturing/orders`
      );

      // Email manufacturing manager
      for (const u of mfgUsers) {
        emailService.sendMoCreatedEmail({
          to:          u.email,
          managerName: u.name,
          moNumber,
          productName: line.product.name,
          quantity:    line.quantity,
        }).catch(() => {});
      }

      // Check raw material shortage — trigger purchase request if needed
      await processInventoryCheck(bom, line.quantity, so.userId, mo);
    }
  }
};

// ─── TRIGGER: Inventory Check after MO creation ──────────────────────────────
const processInventoryCheck = async (bom, moQty, requestingUserId, mo) => {
  const shortages = [];

  for (const bomLine of bom.bomLines) {
    const required  = bomLine.quantity * moQty;
    const available = bomLine.product.onHandQty - bomLine.product.reservedQty;

    if (available < required) {
      shortages.push({
        component: bomLine.product.name,
        productId: bomLine.productId,
        available: Math.max(0, available),
        required,
        gap:       required - Math.max(0, available),
        unitPrice: bomLine.product.costPrice,
      });
    }
  }

  if (shortages.length === 0) return;

  // Find or create a default vendor
  let vendor = await prisma.vendor.findFirst();
  if (!vendor) {
    vendor = await prisma.vendor.create({
      data: { name: 'Default Vendor', contact: 'contact@vendor.com', email: 'vendor@shivfurniture.com' },
    });
  }

  // Create Purchase Requisition
  const poNumber = await nextNumber('PO', 'purchaseOrder', 'orderNumber');
  const totalAmount = shortages.reduce((sum, s) => sum + s.gap * Number(s.unitPrice), 0);

  const po = await prisma.purchaseOrder.create({
    data: {
      orderNumber:        poNumber,
      vendorId:           vendor.id,
      status:             'DRAFT',
      totalAmount,
      userId:             requestingUserId,
      sourceSalesOrderId: mo.sourceSalesOrderId,
      lines: {
        create: shortages.map(s => ({
          productId: s.productId,
          quantity:  s.gap,
          unitPrice: s.unitPrice,
          lineTotal:  s.gap * Number(s.unitPrice),
        })),
      },
    },
  });

  console.log(`[Automation] PO ${poNumber} created for ${shortages.length} shortage(s)`);

  // Approval engine
  const { autoApprove, escalateTo } = await approvalService.createApprovalRequest({
    entityType:      'PURCHASE_ORDER',
    entityId:        po.id,
    entityNumber:    poNumber,
    amount:          totalAmount,
    requestedById:   requestingUserId,
    notes:           `Auto-generated for MO ${mo.orderNumber}`,
  });

  // Notify purchase team
  const purchaseUsers = await usersOfRole('PURCHASE');
  await notificationService.broadcastNotification(
    purchaseUsers.map(u => u.id),
    'SHORTAGE',
    `PO ${poNumber}: Approval Required`,
    `${shortages.length} material shortage(s) detected. PO ${poNumber} (₹${totalAmount.toLocaleString()}) awaiting approval.`,
    `/purchase-orders`
  );

  // Email shortage alert to purchase team
  if (purchaseUsers.length) {
    emailService.sendShortageAlert({
      to:            purchaseUsers[0].email,
      recipientName: purchaseUsers[0].name,
      shortages,
    }).catch(() => {});
  }

  if (!autoApprove && escalateTo) {
    emailService.sendPoApprovalRequest({
      to:           escalateTo.email,
      approverName: escalateTo.name,
      entityNumber: poNumber,
      amount:       totalAmount,
      requesterName: 'System (Auto)',
      notes:        `Shortage for MO ${mo.orderNumber}`,
    }).catch(() => {});
  }
};

// ─── TRIGGER: Work Order Completed ───────────────────────────────────────────
/**
 * WHEN WO status → DONE
 * IF all WOs for parent MO are DONE → mark MO as DONE, update inventory
 */
const processWorkOrderComplete = async (workOrderId) => {
  const wo = await prisma.workOrder.findUnique({
    where: { id: workOrderId },
    include: {
      manufacturingOrder: {
        include: {
          workOrders: true,
          product:    true,
          bom: { include: { bomLines: { include: { product: true } } } },
        },
      },
    },
  });
  if (!wo) return;

  const mo = wo.manufacturingOrder;
  const allDone = mo.workOrders.every(w => w.status === 'DONE');

  if (!allDone) return;

  // Mark MO as DONE
  await prisma.manufacturingOrder.update({
    where: { id: mo.id },
    data: { status: 'DONE', completedQuantity: mo.plannedQuantity, endDate: new Date() },
  });

  // ACTION: Consume raw materials, add finished goods
  for (const bomLine of mo.bom.bomLines) {
    const consumed = bomLine.quantity * mo.plannedQuantity;
    await prisma.product.update({
      where: { id: bomLine.productId },
      data:  { onHandQty: { decrement: consumed } },
    });
    await prisma.stockLedger.create({
      data: {
        productId:       bomLine.productId,
        transactionType: 'OUT',
        quantity:        consumed,
        reason:          'manufacturing_consumption',
        referenceType:   'ManufacturingOrder',
        referenceId:     mo.id,
      },
    });
  }

  // Add finished goods to stock
  await prisma.product.update({
    where: { id: mo.productId },
    data:  { onHandQty: { increment: mo.plannedQuantity } },
  });
  await prisma.stockLedger.create({
    data: {
      productId:       mo.productId,
      transactionType: 'IN',
      quantity:        mo.plannedQuantity,
      reason:          'manufacturing_output',
      referenceType:   'ManufacturingOrder',
      referenceId:     mo.id,
    },
  });

  console.log(`[Automation][MO:${mo.orderNumber}] Completed — stock updated`);

  // Audit — only write if an admin user exists
  const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' }, select: { id: true } });
  if (adminUser) {
    await prisma.auditLog.create({
      data: {
        userId:   adminUser.id,
        action:   'UPDATE',
        entity:   'ManufacturingOrder',
        entityId: mo.id,
        details:  { event: 'MO_COMPLETED', moNumber: mo.orderNumber },
      },
    }).catch(() => {});
  }

  // Notify sales team — delivery may now be ready
  const salesUsers = await usersOfRole('SALES');
  if (salesUsers.length) {
    await notificationService.broadcastNotification(
      salesUsers.map(u => u.id),
      'DELIVERY_READY',
      `${mo.product.name} production complete`,
      `MO ${mo.orderNumber} finished. ${mo.plannedQuantity} × ${mo.product.name} now in stock.`,
      `/manufacturing/orders`
    );
  }
};

// ─── TRIGGER: Purchase Order Approved ────────────────────────────────────────
const processPoApproval = async (purchaseOrderId) => {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id: purchaseOrderId },
    include: {
      user:  { select: { id: true, name: true, email: true } },
      lines: { include: { product: true } },
    },
  });
  if (!po) return;

  // Notify the requester
  await notificationService.createNotification(
    po.userId,
    'APPROVAL_DONE',
    `${po.orderNumber} Approved`,
    `Purchase Order ${po.orderNumber} has been approved and is now active.`,
    `/purchase-orders`
  );

  // Email confirmation
  emailService.sendApprovalResult({
    to:           po.user.email,
    userName:     po.user.name,
    entityNumber: po.orderNumber,
    approved:     true,
  }).catch(() => {});
};

module.exports = {
  processOrderConfirm,
  processWorkOrderComplete,
  processPoApproval,
};
