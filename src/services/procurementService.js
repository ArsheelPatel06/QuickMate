const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const triggerProcurement = async (productId, shortageQty, salesOrderId) => {
  return await prisma.$transaction(async (tx) => {
    // 1. Fetch Product rules
    const product = await tx.product.findUnique({
      where: { id: productId }
    });

    if (!product) throw new Error(`Product ${productId} not found`);

    // 2. Fetch Sales Order to link to audit log
    const salesOrder = await tx.salesOrder.findUnique({
      where: { id: salesOrderId }
    });

    let generatedDocument = null;
    let documentType = '';

    if (product.procurementType === 'PURCHASE') {
      // Find a default vendor or create a system dummy vendor
      let vendor = await tx.vendor.findFirst();
      if (!vendor) {
        vendor = await tx.vendor.create({
          data: { name: 'Default System Vendor', contact: 'Auto-generated' }
        });
      }

      const orderNumber = `PO-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      const purchaseOrder = await tx.purchaseOrder.create({
        data: {
          orderNumber,
          vendorId: vendor.id,
          userId: salesOrder.userId,
          status: 'DRAFT',
          totalAmount: product.costPrice * shortageQty,
          sourceSalesOrderId: salesOrderId,
          lines: {
            create: [{
              productId: product.id,
              quantity: shortageQty,
              unitPrice: product.costPrice,
              lineTotal: product.costPrice * shortageQty
            }]
          }
        }
      });
      
      generatedDocument = purchaseOrder;
      documentType = 'PurchaseOrder';

    } else if (product.procurementType === 'MANUFACTURE') {
      const bom = await tx.bOM.findFirst({
        where: { productId: product.id },
        include: { bomOperations: true }
      });

      if (!bom) {
         console.warn(`Cannot auto-manufacture ${product.name}: No BOM found`);
         return null;
      }

      const orderNumber = `MO-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const ratio = shortageQty / bom.quantity;

      const manufacturingOrder = await tx.manufacturingOrder.create({
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
              status: 'PENDING'
            }))
          }
        },
        include: { workOrders: true }
      });

      generatedDocument = manufacturingOrder;
      documentType = 'ManufacturingOrder';
    } else {
      // E.g., SUBCONTRACT -> ignored for this exact snippet.
      return null;
    }

    // Create Audit Log
    await tx.auditLog.create({
      data: {
        userId: salesOrder.userId,
        action: 'CREATE',
        entity: documentType,
        entityId: generatedDocument.id,
        details: {
          message: `Auto-generated from Sales Order ${salesOrder.orderNumber} due to shortage`,
          shortageQty,
          productId: product.id,
          salesOrderId: salesOrderId
        }
      }
    });

    return {
      type: documentType,
      document: generatedDocument
    };
  });
};

module.exports = {
  triggerProcurement
};
