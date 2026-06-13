const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  console.log('Clearing database...');
  await prisma.auditLog.deleteMany();
  await prisma.stockLedger.deleteMany();
  await prisma.workOrder.deleteMany();
  await prisma.manufacturingOrder.deleteMany();
  await prisma.purchaseOrderLine.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.salesOrderLine.deleteMany();
  await prisma.salesOrder.deleteMany();
  await prisma.bOMOperation.deleteMany();
  await prisma.bOMLine.deleteMany();
  await prisma.bOM.deleteMany();
  await prisma.product.deleteMany();
  await prisma.workCenter.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.user.deleteMany();

  console.log('Seeding Users...');
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync('password123', salt);

  const adminUser = await prisma.user.create({
    data: { name: 'Admin User', email: 'admin@shivfurniture.com', passwordHash, role: 'ADMIN' }
  });
  const salesManager = await prisma.user.create({
    data: { name: 'Sales Manager', email: 'sales@shivfurniture.com', passwordHash, role: 'SALES' }
  });
  const purchaseManager = await prisma.user.create({
    data: { name: 'Purchase Manager', email: 'purchase@shivfurniture.com', passwordHash, role: 'PURCHASE' }
  });
  const manufacturingManager = await prisma.user.create({
    data: { name: 'Manufacturing Manager', email: 'manufacturing@shivfurniture.com', passwordHash, role: 'MANUFACTURING' }
  });
  const inventoryManager = await prisma.user.create({
    data: { name: 'Inventory Manager', email: 'inventory@shivfurniture.com', passwordHash, role: 'INVENTORY' }
  });

  console.log('Seeding Vendors...');
  const vendorWood = await prisma.vendor.create({
    data: { name: 'ABC Wood Suppliers', contact: 'Ramesh Kumar', email: 'ramesh@abcwood.com' }
  });
  const vendorHardware = await prisma.vendor.create({
    data: { name: 'Premium Hardware Ltd', contact: 'Amit Sharma', email: 'sales@premiumhardware.com' }
  });
  const vendorFasteners = await prisma.vendor.create({
    data: { name: 'Fastener Solutions Pvt Ltd', contact: 'Vijay Patel', email: 'info@fastenersolutions.in' }
  });
  const vendorPaint = await prisma.vendor.create({
    data: { name: 'PaintCo Industries', contact: 'Sanjay Gupta', email: 'orders@paintco.com' }
  });

  const vendors = [vendorWood, vendorHardware, vendorFasteners, vendorPaint];

  console.log('Seeding Work Centers...');
  const wcCutting = await prisma.workCenter.create({
    data: { name: 'Assembly Line 1', capacity: 2, costPerHour: 50.00 }
  });
  const wcAssembly = await prisma.workCenter.create({
    data: { name: 'Assembly Line 2', capacity: 3, costPerHour: 45.00 }
  });
  const wcPainting = await prisma.workCenter.create({
    data: { name: 'Paint Shop', capacity: 1, costPerHour: 60.00 }
  });
  const wcPackaging = await prisma.workCenter.create({
    data: { name: 'Packaging Unit', capacity: 4, costPerHour: 30.00 }
  });

  console.log('Seeding Products...');
  // Raw Materials
  const rmLeg = await prisma.product.create({
    data: { name: 'Wooden Legs', sku: 'RM-LEG', salesPrice: 0, costPrice: 10.00, onHandQty: 200, reservedQty: 0, procurementStrategy: 'MAKE_TO_STOCK', procurementType: 'PURCHASE' }
  });
  const rmTop = await prisma.product.create({
    data: { name: 'Wooden Tops', sku: 'RM-TOP', salesPrice: 0, costPrice: 35.00, onHandQty: 100, reservedQty: 0, procurementStrategy: 'MAKE_TO_STOCK', procurementType: 'PURCHASE' }
  });
  const rmScrew = await prisma.product.create({
    data: { name: 'Screws', sku: 'RM-SCREW', salesPrice: 0, costPrice: 0.10, onHandQty: 1000, reservedQty: 0, procurementStrategy: 'MAKE_TO_STOCK', procurementType: 'PURCHASE' }
  });
  const rmPolish = await prisma.product.create({
    data: { name: 'Wood Polish', sku: 'RM-POLISH', salesPrice: 0, costPrice: 15.00, onHandQty: 50, reservedQty: 0, procurementStrategy: 'MAKE_TO_STOCK', procurementType: 'PURCHASE' }
  });
  const rmBox = await prisma.product.create({
    data: { name: 'Packing Box', sku: 'RM-BOX', salesPrice: 0, costPrice: 5.00, onHandQty: 120, reservedQty: 0, procurementStrategy: 'MAKE_TO_STOCK', procurementType: 'PURCHASE' }
  });

  const rawMaterials = [rmLeg, rmTop, rmScrew, rmPolish, rmBox];

  // Finished Goods
  const fgTable = await prisma.product.create({
    data: { name: 'Wooden Table', sku: 'FG-TABLE', salesPrice: 180.00, costPrice: 90.00, onHandQty: 10, reservedQty: 0, procurementStrategy: 'MAKE_TO_STOCK', procurementType: 'MANUFACTURE' }
  });
  const fgDesk = await prisma.product.create({
    data: { name: 'Office Desk', sku: 'FG-DESK', salesPrice: 280.00, costPrice: 150.00, onHandQty: 5, reservedQty: 0, procurementStrategy: 'MAKE_TO_STOCK', procurementType: 'MANUFACTURE' }
  });
  const fgDining = await prisma.product.create({
    data: { name: 'Dining Table', sku: 'FG-DINING', salesPrice: 450.00, costPrice: 220.00, onHandQty: 3, reservedQty: 0, procurementStrategy: 'MAKE_TO_STOCK', procurementType: 'MANUFACTURE' }
  });
  const fgStudy = await prisma.product.create({
    data: { name: 'Study Table', sku: 'FG-STUDY', salesPrice: 220.00, costPrice: 110.00, onHandQty: 8, reservedQty: 0, procurementStrategy: 'MAKE_TO_STOCK', procurementType: 'MANUFACTURE' }
  });
  const fgCoffee = await prisma.product.create({
    data: { name: 'Coffee Table', sku: 'FG-COFFEE', salesPrice: 120.00, costPrice: 60.00, onHandQty: 15, reservedQty: 0, procurementStrategy: 'MAKE_TO_STOCK', procurementType: 'MANUFACTURE' }
  });

  const finishedGoods = [fgTable, fgDesk, fgDining, fgStudy, fgCoffee];

  console.log('Seeding BOMs...');
  // Wooden Table BOM
  const bomTable = await prisma.bOM.create({
    data: {
      name: 'Wooden Table Standard BOM',
      productId: fgTable.id,
      quantity: 1,
      bomLines: {
        create: [
          { productId: rmLeg.id, quantity: 4 },
          { productId: rmTop.id, quantity: 1 },
          { productId: rmScrew.id, quantity: 12 },
          { productId: rmPolish.id, quantity: 1 }
        ]
      },
      bomOperations: {
        create: [
          { workCenterId: wcCutting.id, operationName: 'Cutting & Sizing', sequence: 10, duration: 15 },
          { workCenterId: wcAssembly.id, operationName: 'Assembly', sequence: 20, duration: 30 },
          { workCenterId: wcPainting.id, operationName: 'Polishing & Finish', sequence: 30, duration: 45 },
          { workCenterId: wcPackaging.id, operationName: 'Quality Check & Packing', sequence: 40, duration: 10 }
        ]
      }
    }
  });

  // Office Desk BOM
  const bomDesk = await prisma.bOM.create({
    data: {
      name: 'Office Desk Premium BOM',
      productId: fgDesk.id,
      quantity: 1,
      bomLines: {
        create: [
          { productId: rmLeg.id, quantity: 4 },
          { productId: rmTop.id, quantity: 2 },
          { productId: rmScrew.id, quantity: 20 },
          { productId: rmPolish.id, quantity: 1 },
          { productId: rmBox.id, quantity: 1 }
        ]
      },
      bomOperations: {
        create: [
          { workCenterId: wcCutting.id, operationName: 'Frame Cutting', sequence: 10, duration: 20 },
          { workCenterId: wcAssembly.id, operationName: 'Structure Joining', sequence: 20, duration: 40 },
          { workCenterId: wcPainting.id, operationName: 'Lacquering', sequence: 30, duration: 60 },
          { workCenterId: wcPackaging.id, operationName: 'Final Boxing', sequence: 40, duration: 15 }
        ]
      }
    }
  });

  const boms = [bomTable, bomDesk];

  console.log('Seeding Sales Orders...');
  const customers = [
    'Delhi Furniture Mart', 'Royal Decorators', 'Star Office Solutions', 
    'Woodland Crafts', 'Comfort Seating', 'Apex Distributors', 
    'Vikas & Sons', 'Lotus Enterprises', 'Priya Furniture Hub', 
    'Smart Spaces Ltd', 'Heritage Furniture'
  ];

  // Sales Orders counts: 20 Delivered, 10 Confirmed, 5 Draft, 3 Partially Delivered
  const soStatuses = [
    { status: 'FULLY_DELIVERED', count: 20 },
    { status: 'CONFIRMED', count: 10 },
    { status: 'DRAFT', count: 5 },
    { status: 'PARTIALLY_DELIVERED', count: 3 }
  ];

  let soCounter = 1001;

  for (const group of soStatuses) {
    for (let i = 0; i < group.count; i++) {
      const orderNumber = `SO-${soCounter++}`;
      const customerName = customers[i % customers.length];
      const product = finishedGoods[i % finishedGoods.length];
      const quantity = (i % 3) + 1;
      const unitPrice = parseFloat(product.salesPrice.toString());
      const lineTotal = quantity * unitPrice;

      await prisma.salesOrder.create({
        data: {
          orderNumber,
          customerName,
          status: group.status,
          totalAmount: lineTotal,
          userId: salesManager.id,
          lines: {
            create: [
              { productId: product.id, quantity, unitPrice, lineTotal }
            ]
          }
        }
      });
    }
  }

  console.log('Seeding Purchase Orders...');
  // Purchase Orders counts: 10 Received (FULLY_DELIVERED), 5 Partially Received (PARTIALLY_DELIVERED), 5 Draft (DRAFT)
  const poStatuses = [
    { status: 'FULLY_DELIVERED', count: 10 },
    { status: 'PARTIALLY_DELIVERED', count: 5 },
    { status: 'DRAFT', count: 5 }
  ];

  let poCounter = 1001;

  for (const group of poStatuses) {
    for (let i = 0; i < group.count; i++) {
      const orderNumber = `PO-${poCounter++}`;
      const vendor = vendors[i % vendors.length];
      const product = rawMaterials[i % rawMaterials.length];
      const quantity = (i % 2 === 0) ? 50 : 100;
      const unitPrice = parseFloat(product.costPrice.toString());
      const lineTotal = quantity * unitPrice;
      const receivedQty = group.status === 'FULLY_DELIVERED' ? quantity : group.status === 'PARTIALLY_DELIVERED' ? quantity / 2 : 0;

      await prisma.purchaseOrder.create({
        data: {
          orderNumber,
          vendorId: vendor.id,
          status: group.status,
          totalAmount: lineTotal,
          userId: purchaseManager.id,
          lines: {
            create: [
              { productId: product.id, quantity, unitPrice, lineTotal, receivedQty }
            ]
          }
        }
      });
    }
  }

  console.log('Seeding Manufacturing Orders...');
  // Manufacturing Orders counts: 8 Done (DONE), 4 In Progress (IN_PROGRESS), 3 Confirmed (PLANNED), 2 Draft (DRAFT)
  const moStatuses = [
    { status: 'DONE', count: 8 },
    { status: 'IN_PROGRESS', count: 4 },
    { status: 'PLANNED', count: 3 },
    { status: 'DRAFT', count: 2 }
  ];

  let moCounter = 1001;

  for (const group of moStatuses) {
    for (let i = 0; i < group.count; i++) {
      const orderNumber = `MO-${moCounter++}`;
      // Alternate between Wooden Table and Office Desk finished goods
      const isTable = i % 2 === 0;
      const product = isTable ? fgTable : fgDesk;
      const bom = isTable ? bomTable : bomDesk;
      const plannedQuantity = (i % 3) + 2;
      const completedQuantity = group.status === 'DONE' ? plannedQuantity : 0;

      // Operations for work orders
      const bomOps = isTable ? 
        [
          { wc: wcCutting, name: 'Cutting & Sizing', seq: 10, dur: 15 },
          { wc: wcAssembly, name: 'Assembly', seq: 20, dur: 30 },
          { wc: wcPainting, name: 'Polishing & Finish', seq: 30, dur: 45 },
          { wc: wcPackaging, name: 'Quality Check & Packing', seq: 40, dur: 10 }
        ] : 
        [
          { wc: wcCutting, name: 'Frame Cutting', seq: 10, dur: 20 },
          { wc: wcAssembly, name: 'Structure Joining', seq: 20, dur: 40 },
          { wc: wcPainting, name: 'Lacquering', seq: 30, dur: 60 },
          { wc: wcPackaging, name: 'Final Boxing', seq: 40, dur: 15 }
        ];

      const mo = await prisma.manufacturingOrder.create({
        data: {
          orderNumber,
          productId: product.id,
          bomId: bom.id,
          status: group.status,
          plannedQuantity,
          completedQuantity,
          startDate: new Date(),
          endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3) // 3 days from now
        }
      });

      // Insert WorkOrders for MO
      for (const op of bomOps) {
        await prisma.workOrder.create({
          data: {
            manufacturingOrderId: mo.id,
            workCenterId: op.wc.id,
            operationName: op.name,
            sequence: op.seq,
            status: group.status === 'DONE' ? 'DONE' : group.status === 'IN_PROGRESS' && op.seq === 10 ? 'IN_PROGRESS' : 'PENDING',
            plannedDuration: op.dur,
            actualDuration: group.status === 'DONE' ? op.dur : null
          }
        });
      }
    }
  }

  console.log('Seeding Stock Ledgers...');
  // Initial inventory input records
  for (const rm of rawMaterials) {
    await prisma.stockLedger.create({
      data: {
        productId: rm.id,
        transactionType: 'IN',
        quantity: rm.onHandQty,
        reason: 'initial_stocking',
        date: new Date()
      }
    });
  }
  for (const fg of finishedGoods) {
    await prisma.stockLedger.create({
      data: {
        productId: fg.id,
        transactionType: 'IN',
        quantity: fg.onHandQty,
        reason: 'initial_stocking',
        date: new Date()
      }
    });
  }

  console.log('Seeding Audit Logs...');
  const auditLogs = [
    { entity: 'Product', entityId: fgTable.id, action: 'CREATE', details: { name: fgTable.name, sku: fgTable.sku } },
    { entity: 'Product', entityId: fgDesk.id, action: 'CREATE', details: { name: fgDesk.name, sku: fgDesk.sku } },
    { entity: 'BOM', entityId: bomTable.id, action: 'CREATE', details: { name: bomTable.name } },
    { entity: 'User', entityId: adminUser.id, action: 'LOGIN', details: { email: adminUser.email } },
    { entity: 'User', entityId: salesManager.id, action: 'LOGIN', details: { email: salesManager.email } },
    { entity: 'SalesOrder', entityId: 'so-id-dummy-1', action: 'CREATE', details: { orderNumber: 'SO-1001', customerName: 'Delhi Furniture Mart' } },
    { entity: 'SalesOrder', entityId: 'so-id-dummy-1', action: 'UPDATE', details: { status: 'FULLY_DELIVERED' } },
    { entity: 'PurchaseOrder', entityId: 'po-id-dummy-1', action: 'CREATE', details: { orderNumber: 'PO-1001', vendor: 'ABC Wood Suppliers' } },
    { entity: 'ManufacturingOrder', entityId: 'mo-id-dummy-1', action: 'UPDATE', details: { orderNumber: 'MO-1001', status: 'DONE' } },
    { entity: 'Product', entityId: rmLeg.id, action: 'UPDATE', details: { onHandQty: 200, adjustment: '+200' } }
  ];

  for (const log of auditLogs) {
    await prisma.auditLog.create({
      data: {
        userId: adminUser.id,
        action: log.action,
        entity: log.entity,
        entityId: log.entityId,
        details: log.details,
        ipAddress: '127.0.0.1'
      }
    });
  }

  console.log('Database seeding successfully finished!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
