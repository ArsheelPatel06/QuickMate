const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const triggerProcurement = async (productId, shortageQty, salesOrderId, { forcePurchase = false, forceManufacture = false } = {}) => {
  return await prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({ where: { id: productId } });
    if (!product) throw new Error(`Product ${productId} not found`);

    const salesOrder = await tx.salesOrder.findUnique({ where: { id: salesOrderId } });
    if (!salesOrder) throw new Error(`Sales Order ${salesOrderId} not found`);

    const bom = await tx.bOM.findFirst({
      where: { productId: product.id },
      include: { bomLines: { include: { product: true } }, bomOperations: true },
    });

    const vendorCost = Number(product.costPrice) * shortageQty;
    let manufacturingCost = null;
    if (bom) {
      const ratio = shortageQty / bom.quantity;
      manufacturingCost = bom.bomLines.reduce(
        (sum, line) => sum + Number(line.product.costPrice) * line.quantity * ratio,
        0
      );
    }

    // Smart routing: compare costs when BOM exists; otherwise purchase
    const useManufacture = forceManufacture
      ? !!bom
      : forcePurchase
      ? false
      : bom && manufacturingCost !== null && manufacturingCost <= vendorCost;

    let generatedDocument = null;
    let documentType = '';

    if (useManufacture) {
      const orderNumber = `MO-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const ratio = shortageQty / bom.quantity;

      generatedDocument = await tx.manufacturingOrder.create({
        data: {
          orderNumber,
          productId: product.id,
          bomId: bom.id,
          status: 'DRAFT',
          plannedQuantity: shortageQty,
          sourceSalesOrderId: salesOrderId,
          workOrders: {
            create: bom.bomOperations.map(op => ({
              workCenterId: op.workCenterId,
              operationName: op.operationName,
              sequence: op.sequence,
              plannedDuration: op.duration * ratio,
              status: 'PENDING',
            })),
          },
        },
        include: { workOrders: true },
      });
      documentType = 'ManufacturingOrder';
    } else {
      let vendor = await tx.vendor.findFirst();
      if (!vendor) {
        vendor = await tx.vendor.create({
          data: { name: 'Default System Vendor', contact: 'Auto-generated' },
        });
      }

      const orderNumber = `PO-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      generatedDocument = await tx.purchaseOrder.create({
        data: {
          orderNumber,
          vendorId: vendor.id,
          userId: salesOrder.userId,
          status: 'DRAFT',
          totalAmount: vendorCost,
          sourceSalesOrderId: salesOrderId,
          lines: {
            create: [{
              productId: product.id,
              quantity: shortageQty,
              unitPrice: product.costPrice,
              lineTotal: vendorCost,
            }],
          },
        },
      });
      documentType = 'PurchaseOrder';
    }

    await tx.auditLog.create({
      data: {
        userId: salesOrder.userId,
        action: 'CREATE',
        entity: documentType,
        entityId: generatedDocument.id,
        details: {
          message: `Auto-generated from ${salesOrder.orderNumber} — ${useManufacture ? 'manufacture' : 'purchase'} (vendor ₹${Math.round(vendorCost)} vs make ₹${manufacturingCost ? Math.round(manufacturingCost) : 'N/A'})`,
          shortageQty,
          productId: product.id,
          salesOrderId,
          routing: useManufacture ? 'MANUFACTURE' : 'PURCHASE',
          vendorCost,
          manufacturingCost,
        },
      },
    });

    return { type: documentType, document: generatedDocument };
  });
};

module.exports = { triggerProcurement };
