import { PrismaClient, Role, ProcurementStrategy, ProcurementType, OrderStatus, MoStatus, WoStatus, StockTransactionType, ActionType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

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
    data: { name: 'Admin', email: 'admin@shivfurniture.com', passwordHash, role: Role.ADMIN }
  });
  const salesManager = await prisma.user.create({
    data: { name: 'Sales Manager', email: 'sales@shivfurniture.com', passwordHash, role: Role.SALES }
  });
  const purchaseManager = await prisma.user.create({
    data: { name: 'Purchase Manager', email: 'purchase@shivfurniture.com', passwordHash, role: Role.PURCHASE }
  });
  const manufacturingManager = await prisma.user.create({
    data: { name: 'Manufacturing Manager', email: 'manufacturing@shivfurniture.com', passwordHash, role: Role.MANUFACTURING }
  });

  const usersList = [adminUser, salesManager, purchaseManager, manufacturingManager];

  console.log('Seeding Vendors...');
  const vendorWood = await prisma.vendor.create({
    data: { name: 'ABC Wood Suppliers', contact: 'Ramesh Kumar', email: 'ramesh@abcwood.com' }
  });
  const vendorHardware = await prisma.vendor.create({
    data: { name: 'Premium Hardware Ltd', contact: 'Amit Sharma', email: 'sales@premiumhardware.com' }
  });
  const vendorPaint = await prisma.vendor.create({
    data: { name: 'PaintCo Industries', contact: 'Sanjay Gupta', email: 'orders@paintco.com' }
  });

  const vendorsList = [vendorWood, vendorHardware, vendorPaint];

  console.log('Seeding Work Centers...');
  const wcAssembly = await prisma.workCenter.create({
    data: { name: 'Assembly Line', capacity: 3, costPerHour: 45.00 }
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
    data: { name: 'Wooden Legs', sku: 'RM-LEG', salesPrice: 0, costPrice: 10.00, onHandQty: 100, reservedQty: 0, procurementStrategy: ProcurementStrategy.MAKE_TO_STOCK, procurementType: ProcurementType.PURCHASE }
  });
  const rmTop = await prisma.product.create({
    data: { name: 'Wooden Tops', sku: 'RM-TOP', salesPrice: 0, costPrice: 35.00, onHandQty: 100, reservedQty: 0, procurementStrategy: ProcurementStrategy.MAKE_TO_STOCK, procurementType: ProcurementType.PURCHASE }
  });
  const rmScrew = await prisma.product.create({
    data: { name: 'Screws', sku: 'RM-SCREW', salesPrice: 0, costPrice: 0.10, onHandQty: 500, reservedQty: 0, procurementStrategy: ProcurementStrategy.MAKE_TO_STOCK, procurementType: ProcurementType.PURCHASE }
  });
  const rmPolish = await prisma.product.create({
    data: { name: 'Wood Polish', sku: 'RM-POLISH', salesPrice: 0, costPrice: 15.00, onHandQty: 50, reservedQty: 0, procurementStrategy: ProcurementStrategy.MAKE_TO_STOCK, procurementType: ProcurementType.PURCHASE }
  });
  const rmBox = await prisma.product.create({
    data: { name: 'Packing Box', sku: 'RM-BOX', salesPrice: 0, costPrice: 5.00, onHandQty: 200, reservedQty: 0, procurementStrategy: ProcurementStrategy.MAKE_TO_STOCK, procurementType: ProcurementType.PURCHASE }
  });

  const rawMaterials = [rmLeg, rmTop, rmScrew, rmPolish, rmBox];

  // Finished Goods
  const fgTable = await prisma.product.create({
    data: { name: 'Wooden Table', sku: 'FG-TABLE', salesPrice: 180.00, costPrice: 90.00, onHandQty: 10, reservedQty: 0, procurementStrategy: ProcurementStrategy.MAKE_TO_STOCK, procurementType: ProcurementType.MANUFACTURE }
  });
  const fgDesk = await prisma.product.create({
    data: { name: 'Office Desk', sku: 'FG-DESK', salesPrice: 280.00, costPrice: 150.00, onHandQty: 5, reservedQty: 0, procurementStrategy: ProcurementStrategy.MAKE_TO_STOCK, procurementType: ProcurementType.MANUFACTURE }
  });
  const fgDining = await prisma.product.create({
    data: { name: 'Dining Table', sku: 'FG-DINING', salesPrice: 450.00, costPrice: 220.00, onHandQty: 3, reservedQty: 0, procurementStrategy: ProcurementStrategy.MAKE_TO_STOCK, procurementType: ProcurementType.MANUFACTURE }
  });
  const fgCoffee = await prisma.product.create({
    data: { name: 'Coffee Table', sku: 'FG-COFFEE', salesPrice: 120.00, costPrice: 60.00, onHandQty: 15, reservedQty: 0, procurementStrategy: ProcurementStrategy.MAKE_TO_STOCK, procurementType: ProcurementType.MANUFACTURE }
  });

  const finishedGoods = [fgTable, fgDesk, fgDining, fgCoffee];

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
          { workCenterId: wcAssembly.id, operationName: 'Assembly', sequence: 10, duration: 30 },
          { workCenterId: wcPainting.id, operationName: 'Painting', sequence: 20, duration: 45 },
          { workCenterId: wcPackaging.id, operationName: 'Packaging', sequence: 30, duration: 10 }
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
          { productId: rmScrew.id, quantity: 20 }
        ]
      },
      bomOperations: {
        create: [
          { workCenterId: wcAssembly.id, operationName: 'Assembly', sequence: 10, duration: 40 },
          { workCenterId: wcPackaging.id, operationName: 'Packaging', sequence: 20, duration: 15 }
        ]
      }
    }
  });

  console.log('Seeding Sales Orders...');
  const customers = [
    'Delhi Furniture Mart', 'Royal Decorators', 'Star Office Solutions', 
    'Woodland Crafts', 'Comfort Seating', 'Apex Distributors', 
    'Vikas & Sons', 'Lotus Enterprises', 'Priya Furniture Hub', 
    'Smart Spaces Ltd', 'Heritage Furniture'
  ];

  // Sales Orders counts: 20 Delivered, 10 Confirmed, 5 Draft, 3 Partially Delivered
  const soStatuses = [
    { status: OrderStatus.FULLY_DELIVERED, count: 20 },
    { status: OrderStatus.CONFIRMED, count: 10 },
    { status: OrderStatus.DRAFT, count: 5 },
    { status: OrderStatus.PARTIALLY_DELIVERED, count: 3 }
  ];

  let soCounter = 1001;
  const createdSalesOrders: any[] = [];

  for (const group of soStatuses) {
    for (let i = 0; i < group.count; i++) {
      const orderNumber = `SO-${soCounter++}`;
      const customerName = customers[i % customers.length];
      const product = finishedGoods[i % finishedGoods.length];
      const quantity = (i % 3) + 1;
      const unitPrice = parseFloat(product.salesPrice.toString());
      const lineTotal = quantity * unitPrice;

      const so = await prisma.salesOrder.create({
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
      createdSalesOrders.push(so);
    }
  }

  console.log('Seeding Purchase Orders...');
  // Purchase Orders counts: 10 Received, 5 Partially Received, 5 Draft
  const poStatuses = [
    { status: OrderStatus.FULLY_DELIVERED, count: 10 },
    { status: OrderStatus.PARTIALLY_DELIVERED, count: 5 },
    { status: OrderStatus.DRAFT, count: 5 }
  ];

  let poCounter = 1001;
  const createdPurchaseOrders: any[] = [];

  for (const group of poStatuses) {
    for (let i = 0; i < group.count; i++) {
      const orderNumber = `PO-${poCounter++}`;
      const vendor = vendorsList[i % vendorsList.length];
      const product = rawMaterials[i % rawMaterials.length];
      const quantity = (i % 2 === 0) ? 50 : 100;
      const unitPrice = parseFloat(product.costPrice.toString());
      const lineTotal = quantity * unitPrice;
      const receivedQty = group.status === OrderStatus.FULLY_DELIVERED ? quantity : group.status === OrderStatus.PARTIALLY_DELIVERED ? quantity / 2 : 0;

      const po = await prisma.purchaseOrder.create({
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
      createdPurchaseOrders.push(po);
    }
  }

  console.log('Seeding Manufacturing Orders...');
  // Manufacturing Orders counts: 8 Done, 4 In Progress, 3 Confirmed, 2 Draft
  const moStatuses = [
    { status: MoStatus.DONE, count: 8 },
    { status: MoStatus.IN_PROGRESS, count: 4 },
    { status: MoStatus.PLANNED, count: 3 },
    { status: MoStatus.DRAFT, count: 2 }
  ];

  let moCounter = 1001;
  const createdMOs: any[] = [];

  for (const group of moStatuses) {
    for (let i = 0; i < group.count; i++) {
      const orderNumber = `MO-${moCounter++}`;
      const isTable = i % 2 === 0;
      const product = isTable ? fgTable : fgDesk;
      const bom = isTable ? bomTable : bomDesk;
      const plannedQuantity = (i % 3) + 2;
      const completedQuantity = group.status === MoStatus.DONE ? plannedQuantity : 0;

      const bomOps = isTable ? 
        [
          { wc: wcAssembly, name: 'Assembly', seq: 10, dur: 30 },
          { wc: wcPainting, name: 'Painting', seq: 20, dur: 45 },
          { wc: wcPackaging, name: 'Packaging', seq: 30, dur: 10 }
        ] : 
        [
          { wc: wcAssembly, name: 'Assembly', seq: 10, dur: 40 },
          { wc: wcPackaging, name: 'Packaging', seq: 20, dur: 15 }
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
          endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3)
        }
      });
      createdMOs.push(mo);

      for (const op of bomOps) {
        await prisma.workOrder.create({
          data: {
            manufacturingOrderId: mo.id,
            workCenterId: op.wc.id,
            operationName: op.name,
            sequence: op.seq,
            status: group.status === MoStatus.DONE ? WoStatus.DONE : group.status === MoStatus.IN_PROGRESS && op.seq === 10 ? WoStatus.IN_PROGRESS : WoStatus.PENDING,
            plannedDuration: op.dur,
            actualDuration: group.status === MoStatus.DONE ? op.dur : null
          }
        });
      }
    }
  }

  console.log('Seeding Stock Ledgers...');
  for (const rm of rawMaterials) {
    await prisma.stockLedger.create({
      data: { productId: rm.id, transactionType: StockTransactionType.IN, quantity: rm.onHandQty, reason: 'initial_stocking', date: new Date() }
    });
  }
  for (const fg of finishedGoods) {
    await prisma.stockLedger.create({
      data: { productId: fg.id, transactionType: StockTransactionType.IN, quantity: fg.onHandQty, reason: 'initial_stocking', date: new Date() }
    });
  }

  console.log('Seeding Audit Logs (100+ records)...');
  const auditLogsData: any[] = [];

  const entities = ['Product', 'SalesOrder', 'PurchaseOrder', 'ManufacturingOrder', 'BOM', 'User'];
  const actions = [ActionType.CREATE, ActionType.UPDATE, ActionType.DELETE, ActionType.LOGIN];
  
  const baseLogs = [
    { entity: 'Product', entityId: fgTable.id, action: ActionType.CREATE, details: { sku: fgTable.sku, message: 'Created product Wooden Table' } },
    { entity: 'Product', entityId: fgDesk.id, action: ActionType.CREATE, details: { sku: fgDesk.sku, message: 'Created product Office Desk' } },
    { entity: 'BOM', entityId: bomTable.id, action: ActionType.CREATE, details: { name: bomTable.name, message: 'BOM created for Wooden Table' } },
    { entity: 'User', entityId: adminUser.id, action: ActionType.LOGIN, details: { email: adminUser.email, message: 'Admin login' } },
    { entity: 'User', entityId: salesManager.id, action: ActionType.LOGIN, details: { email: salesManager.email, message: 'Sales Manager login' } },
  ];

  for (const log of baseLogs) {
    auditLogsData.push({
      userId: adminUser.id,
      action: log.action,
      entity: log.entity,
      entityId: log.entityId,
      details: log.details,
      ipAddress: '127.0.0.1',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5)
    });
  }

  for (let j = 0; j < 100; j++) {
    const user = usersList[j % usersList.length];
    const action = actions[j % actions.length];
    const entity = entities[j % entities.length];
    
    let entityId = '';
    let details: any = {};

    if (entity === 'Product') {
      const p = finishedGoods[j % finishedGoods.length];
      entityId = p.id;
      details = { sku: p.sku, onHandQty: p.onHandQty, message: `Updated stock quantities for product ${p.name}` };
    } else if (entity === 'SalesOrder') {
      const so = createdSalesOrders[j % createdSalesOrders.length];
      entityId = so.id;
      details = { orderNumber: so.orderNumber, status: so.status, message: `Processed Sales Order ${so.orderNumber}` };
    } else if (entity === 'PurchaseOrder') {
      const po = createdPurchaseOrders[j % createdPurchaseOrders.length];
      entityId = po.id;
      details = { orderNumber: po.orderNumber, status: po.status, message: `Processed Purchase Order ${po.orderNumber}` };
    } else if (entity === 'ManufacturingOrder') {
      const mo = createdMOs[j % createdMOs.length];
      entityId = mo.id;
      details = { orderNumber: mo.orderNumber, status: mo.status, message: `Updated Manufacturing Order ${mo.orderNumber}` };
    } else {
      entityId = user.id;
      details = { email: user.email, message: `User session activity: ${action}` };
    }

    const timeOffset = 1000 * 60 * 60 * (j % 120);
    auditLogsData.push({
      userId: user.id,
      action,
      entity,
      entityId,
      details,
      ipAddress: `192.168.1.${10 + (j % 50)}`,
      createdAt: new Date(Date.now() - timeOffset)
    });
  }

  for (const log of auditLogsData) {
    await prisma.auditLog.create({ data: log });
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
