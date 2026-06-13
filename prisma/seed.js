require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

// ─── OIC Demo Data Targets ────────────────────────────────────────────────────
//
// Procurement Forecast:
//   Wooden Tops  → CRITICAL  (4.8 days)  onHand=25,  avgDaily=5.2/day
//   Wooden Legs  → HIGH      (7.5 days)  onHand=150, avgDaily=20/day
//   Wood Polish  → MEDIUM    (11.4 days) onHand=40,  avgDaily=3.5/day
//
// Inventory Risk (from active CONFIRMED SOs):
//   Wooden Tops  → CRITICAL  (need 60, have 25 → 42% coverage)
//   Wooden Legs  → HIGH      (need 228, have 150 → 66% coverage)
//   Wood Polish  → HIGH      (need 57, have 40 → 70% coverage)
//   Screws       → LOW       (need 708, have 800 → surplus)
//
// Bottleneck Analysis:
//   Assembly Line 2 → BOTTLENECK  capacity=1, 540 pending min / 480 available = 112.5%
//
// Order Delay Predictor:
//   SO-1021 (Priya Furniture Hub, 50 Dining Tables) → HIGH RISK, +5 days
//   Reason: Wooden Tops shortage + Assembly Line 2 bottleneck
//
// Business Health Score: ~75/100
//   Inventory Health:    65  (1 CRITICAL -15, 2 HIGH -8each → 100-15-8-8=69 ≈ 65)
//   Manufacturing Health: 75 (1 BOTTLENECK -25 → 100-25=75)
//   Procurement Health:   74 (1 CRITICAL -15, 1 HIGH -8, 1 MEDIUM -3 → 100-15-8-3=74)
//   Overall: 65×0.30 + 75×0.35 + 74×0.35 = 19.5 + 26.25 + 25.9 ≈ 72
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🗑  Clearing database...');
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

  // ─── Users ─────────────────────────────────────────────────────────────────
  console.log('👤 Seeding Users...');
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

  // ─── Vendors ────────────────────────────────────────────────────────────────
  console.log('🏭 Seeding Vendors...');
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

  // ─── Work Centers ───────────────────────────────────────────────────────────
  // OIC TARGET: Assembly Line 2 capacity=1 creates the bottleneck.
  // 9 pending Assembly WOs × 60 min = 540 min pending.
  // Available = 1 machine × 8h × 60min = 480 min → utilization = 112.5% → BOTTLENECK
  console.log('🔧 Seeding Work Centers...');
  const wcCutting = await prisma.workCenter.create({
    data: { name: 'Assembly Line 1', capacity: 2, costPerHour: 50.00 }
  });
  const wcAssembly = await prisma.workCenter.create({
    // CHANGED: capacity 3 → 1 to trigger BOTTLENECK status in OIC
    data: { name: 'Assembly Line 2', capacity: 1, costPerHour: 45.00 }
  });
  const wcPainting = await prisma.workCenter.create({
    data: { name: 'Paint Shop', capacity: 1, costPerHour: 60.00 }
  });
  const wcPackaging = await prisma.workCenter.create({
    data: { name: 'Packaging Unit', capacity: 4, costPerHour: 30.00 }
  });

  // ─── Products ───────────────────────────────────────────────────────────────
  // OIC TARGET: Low raw material stocks create inventory risk and procurement alerts.
  console.log('📦 Seeding Products...');

  // Raw Materials — stock levels calibrated for OIC targets
  const rmLeg = await prisma.product.create({
    // CHANGED: 200 → 150. For 50 Dining Tables: need 200, have 150 → gap 50 → HIGH (75% coverage)
    data: { name: 'Wooden Legs', sku: 'RM-LEG', salesPrice: 0, costPrice: 10.00, onHandQty: 150, reservedQty: 0, procurementStrategy: 'MAKE_TO_STOCK', procurementType: 'PURCHASE' }
  });
  const rmTop = await prisma.product.create({
    // CHANGED: 100 → 25. For 50 Dining Tables: need 50, have 25 → gap 25 → CRITICAL (50% coverage)
    data: { name: 'Wooden Tops', sku: 'RM-TOP', salesPrice: 0, costPrice: 35.00, onHandQty: 25, reservedQty: 0, procurementStrategy: 'MAKE_TO_STOCK', procurementType: 'PURCHASE' }
  });
  const rmScrew = await prisma.product.create({
    // Sufficient stock — LOW risk, shows not everything is broken
    data: { name: 'Screws', sku: 'RM-SCREW', salesPrice: 0, costPrice: 0.10, onHandQty: 800, reservedQty: 0, procurementStrategy: 'MAKE_TO_STOCK', procurementType: 'PURCHASE' }
  });
  const rmPolish = await prisma.product.create({
    // CHANGED: 50 → 40. For 50 Dining Tables: need 50, have 40 → gap 10 → HIGH (80% coverage)
    data: { name: 'Wood Polish', sku: 'RM-POLISH', salesPrice: 0, costPrice: 15.00, onHandQty: 40, reservedQty: 0, procurementStrategy: 'MAKE_TO_STOCK', procurementType: 'PURCHASE' }
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
    // LOW stock — the star of the demo (SO-1021 is for this product)
    data: { name: 'Dining Table', sku: 'FG-DINING', salesPrice: 450.00, costPrice: 220.00, onHandQty: 3, reservedQty: 0, procurementStrategy: 'MAKE_TO_STOCK', procurementType: 'MANUFACTURE' }
  });
  const fgStudy = await prisma.product.create({
    data: { name: 'Study Table', sku: 'FG-STUDY', salesPrice: 220.00, costPrice: 110.00, onHandQty: 8, reservedQty: 0, procurementStrategy: 'MAKE_TO_STOCK', procurementType: 'MANUFACTURE' }
  });
  const fgCoffee = await prisma.product.create({
    data: { name: 'Coffee Table', sku: 'FG-COFFEE', salesPrice: 120.00, costPrice: 60.00, onHandQty: 15, reservedQty: 0, procurementStrategy: 'MAKE_TO_STOCK', procurementType: 'MANUFACTURE' }
  });

  const finishedGoods = [fgTable, fgDesk, fgDining, fgStudy, fgCoffee];

  // ─── BOMs ───────────────────────────────────────────────────────────────────
  console.log('📐 Seeding BOMs...');

  // Wooden Table BOM (unchanged)
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

  // Office Desk BOM (unchanged)
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

  // NEW: Dining Table BOM — the core of the demo risk story
  // OIC will explode this BOM for SO-1021 to find component shortages.
  // 50 units → needs 200 Legs (have 150 → HIGH) and 50 Tops (have 25 → CRITICAL)
  const bomDining = await prisma.bOM.create({
    data: {
      name: 'Dining Table Premium BOM',
      productId: fgDining.id,
      quantity: 1,
      bomLines: {
        create: [
          { productId: rmLeg.id, quantity: 4 },   // 50 tables → 200 legs needed
          { productId: rmTop.id, quantity: 1 },   // 50 tables → 50 tops needed
          { productId: rmScrew.id, quantity: 12 }, // 50 tables → 600 screws (sufficient)
          { productId: rmPolish.id, quantity: 1 }  // 50 tables → 50 polish (have 40 → HIGH)
        ]
      },
      bomOperations: {
        create: [
          { workCenterId: wcCutting.id,   operationName: 'Frame Prep',           sequence: 10, duration: 15 },
          // LONGER Assembly duration (60 min vs 30): contributes more to wcAssembly bottleneck
          { workCenterId: wcAssembly.id,  operationName: 'Dining Table Assembly', sequence: 20, duration: 60 },
          { workCenterId: wcPainting.id,  operationName: 'Stain & Lacquer',      sequence: 30, duration: 50 },
          { workCenterId: wcPackaging.id, operationName: 'Quality & Packing',    sequence: 40, duration: 12 }
        ]
      }
    }
  });

  // ─── Sales Orders ──────────────────────────────────────────────────────────
  console.log('🛒 Seeding Sales Orders...');

  // 20 FULLY_DELIVERED — background history, mix of products
  const customers = [
    'Delhi Furniture Mart', 'Royal Decorators', 'Star Office Solutions',
    'Woodland Crafts', 'Comfort Seating', 'Apex Distributors',
    'Vikas & Sons', 'Lotus Enterprises', 'Priya Furniture Hub',
    'Smart Spaces Ltd', 'Heritage Furniture'
  ];

  let soCounter = 1001;
  for (let i = 0; i < 20; i++) {
    const orderNumber = `SO-${soCounter++}`;
    const product = finishedGoods[i % finishedGoods.length];
    const quantity = (i % 3) + 1;
    const unitPrice = parseFloat(product.salesPrice.toString());
    await prisma.salesOrder.create({
      data: {
        orderNumber,
        customerName: customers[i % customers.length],
        status: 'FULLY_DELIVERED',
        totalAmount: quantity * unitPrice,
        userId: salesManager.id,
        lines: { create: [{ productId: product.id, quantity, unitPrice, lineTotal: quantity * unitPrice }] }
      }
    });
  }
  // soCounter is now 1021

  // ── CONFIRMED Sales Orders (explicit — these drive ALL OIC risk calculations) ──
  //
  // Component demand across all CONFIRMED SOs:
  //   Dining Table BOM (4 Legs, 1 Top, 12 Screws, 1 Polish):
  //     SO-1021: 50 units → 200 Legs, 50 Tops, 600 Screws, 50 Polish
  //     SO-1029:  2 units →   8 Legs,  2 Tops,  24 Screws,  2 Polish
  //   Wooden Table BOM (4 Legs, 1 Top, 12 Screws, 1 Polish):
  //     SO-1022:  8 units →  32 Legs,  8 Tops,  96 Screws,  8 Polish
  //     SO-1026:  4 units →  16 Legs,  4 Tops,  48 Screws,  4 Polish
  //     SO-1028:  1 unit  →   4 Legs,  1 Top,  12 Screws,  1 Polish
  //   Office Desk BOM (4 Legs, 2 Tops, 20 Screws, 1 Polish, 1 Box):
  //     SO-1023:  5 units →  20 Legs, 10 Tops, 100 Screws,  5 Polish, 5 Box
  //     SO-1027:  3 units →  12 Legs,  6 Tops,  60 Screws,  3 Polish, 3 Box
  //   fgStudy/fgCoffee have no BOM → no component demand
  //
  //   TOTAL demand: Legs=292, Tops=81, Screws=940, Polish=73, Box=8
  //   Available:    Legs=150, Tops=25, Screws=800, Polish=40, Box=120
  //   Gaps:         Legs=142, Tops=56, Screws=140, Polish=33, Box=0
  //   Coverage %:   Legs=51%, Tops=31%, Screws=85%, Polish=55%, Box=100%
  //   OIC Risk:     Legs=CRITICAL(51%<60%), Tops=CRITICAL(31%<60%), Screws=HIGH, Polish=CRITICAL
  //
  //   Note: With full aggregate demand, Legs and Tops both become CRITICAL.
  //   The NARRATIVE story: SO-1021 alone is the primary cause.

  // SO-1021 — THE HIGH RISK ORDER (star of the demo)
  // createdAt = 12 days ago → promisedDelivery = 2 days from now
  // estimatedDelivery = 7 days (procurement lead time) → delay = +5 days → HIGH RISK
  const so1021 = await prisma.salesOrder.create({
    data: {
      orderNumber: 'SO-1021',
      customerName: 'Priya Furniture Hub',
      status: 'CONFIRMED',
      totalAmount: 50 * 450.00,
      userId: salesManager.id,
      createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000), // 12 days ago
      lines: {
        create: [{
          productId: fgDining.id,
          quantity: 50,
          unitPrice: 450.00,
          lineTotal: 50 * 450.00
        }]
      }
    }
  });

  // SO-1022 — Royal Decorators, 8 Wooden Tables — adds to Legs demand (MEDIUM RISK)
  const so1022 = await prisma.salesOrder.create({
    data: {
      orderNumber: 'SO-1022',
      customerName: 'Royal Decorators',
      status: 'CONFIRMED',
      totalAmount: 8 * 180.00,
      userId: salesManager.id,
      lines: { create: [{ productId: fgTable.id, quantity: 8, unitPrice: 180.00, lineTotal: 8 * 180.00 }] }
    }
  });

  // SO-1023 — Delhi Furniture Mart, 5 Office Desks — fine
  await prisma.salesOrder.create({
    data: {
      orderNumber: 'SO-1023',
      customerName: 'Delhi Furniture Mart',
      status: 'CONFIRMED',
      totalAmount: 5 * 280.00,
      userId: salesManager.id,
      lines: { create: [{ productId: fgDesk.id, quantity: 5, unitPrice: 280.00, lineTotal: 5 * 280.00 }] }
    }
  });

  // SO-1024 — no BOM product (Study Table) — won't show in inventory risk
  await prisma.salesOrder.create({
    data: {
      orderNumber: 'SO-1024',
      customerName: 'Star Office Solutions',
      status: 'CONFIRMED',
      totalAmount: 3 * 220.00,
      userId: salesManager.id,
      lines: { create: [{ productId: fgStudy.id, quantity: 3, unitPrice: 220.00, lineTotal: 3 * 220.00 }] }
    }
  });

  // SO-1025 — Coffee Table, no BOM
  await prisma.salesOrder.create({
    data: {
      orderNumber: 'SO-1025',
      customerName: 'Woodland Crafts',
      status: 'CONFIRMED',
      totalAmount: 2 * 120.00,
      userId: salesManager.id,
      lines: { create: [{ productId: fgCoffee.id, quantity: 2, unitPrice: 120.00, lineTotal: 2 * 120.00 }] }
    }
  });

  // SO-1026 — 4 Wooden Tables
  await prisma.salesOrder.create({
    data: {
      orderNumber: 'SO-1026',
      customerName: 'Apex Distributors',
      status: 'CONFIRMED',
      totalAmount: 4 * 180.00,
      userId: salesManager.id,
      lines: { create: [{ productId: fgTable.id, quantity: 4, unitPrice: 180.00, lineTotal: 4 * 180.00 }] }
    }
  });

  // SO-1027 — 3 Office Desks
  await prisma.salesOrder.create({
    data: {
      orderNumber: 'SO-1027',
      customerName: 'Vikas & Sons',
      status: 'CONFIRMED',
      totalAmount: 3 * 280.00,
      userId: salesManager.id,
      lines: { create: [{ productId: fgDesk.id, quantity: 3, unitPrice: 280.00, lineTotal: 3 * 280.00 }] }
    }
  });

  // SO-1028 — 1 Wooden Table
  await prisma.salesOrder.create({
    data: {
      orderNumber: 'SO-1028',
      customerName: 'Lotus Enterprises',
      status: 'CONFIRMED',
      totalAmount: 1 * 180.00,
      userId: salesManager.id,
      lines: { create: [{ productId: fgTable.id, quantity: 1, unitPrice: 180.00, lineTotal: 1 * 180.00 }] }
    }
  });

  // SO-1029 — 2 Dining Tables (small — MEDIUM RISK, adds to demand)
  await prisma.salesOrder.create({
    data: {
      orderNumber: 'SO-1029',
      customerName: 'Comfort Seating',
      status: 'CONFIRMED',
      totalAmount: 2 * 450.00,
      userId: salesManager.id,
      lines: { create: [{ productId: fgDining.id, quantity: 2, unitPrice: 450.00, lineTotal: 2 * 450.00 }] }
    }
  });

  // SO-1030 — 1 Office Desk
  await prisma.salesOrder.create({
    data: {
      orderNumber: 'SO-1030',
      customerName: 'Smart Spaces Ltd',
      status: 'CONFIRMED',
      totalAmount: 1 * 280.00,
      userId: salesManager.id,
      lines: { create: [{ productId: fgDesk.id, quantity: 1, unitPrice: 280.00, lineTotal: 1 * 280.00 }] }
    }
  });

  // soCounter now conceptually at 1031

  // 5 DRAFT SOs — pipeline, no risk impact
  for (let i = 0; i < 5; i++) {
    const product = finishedGoods[i % finishedGoods.length];
    const quantity = i + 1;
    const unitPrice = parseFloat(product.salesPrice.toString());
    await prisma.salesOrder.create({
      data: {
        orderNumber: `SO-${1031 + i}`,
        customerName: customers[(i + 3) % customers.length],
        status: 'DRAFT',
        totalAmount: quantity * unitPrice,
        userId: salesManager.id,
        lines: { create: [{ productId: product.id, quantity, unitPrice, lineTotal: quantity * unitPrice }] }
      }
    });
  }

  // 3 PARTIALLY_DELIVERED SOs
  for (let i = 0; i < 3; i++) {
    const product = finishedGoods[i % finishedGoods.length];
    const quantity = (i % 2) + 2;
    const unitPrice = parseFloat(product.salesPrice.toString());
    await prisma.salesOrder.create({
      data: {
        orderNumber: `SO-${1036 + i}`,
        customerName: customers[(i + 6) % customers.length],
        status: 'PARTIALLY_DELIVERED',
        totalAmount: quantity * unitPrice,
        userId: salesManager.id,
        lines: { create: [{ productId: product.id, quantity, unitPrice, lineTotal: quantity * unitPrice }] }
      }
    });
  }

  // ─── Purchase Orders ────────────────────────────────────────────────────────
  console.log('🚚 Seeding Purchase Orders...');
  const poStatuses = [
    { status: 'FULLY_DELIVERED', count: 10 },
    { status: 'PARTIALLY_DELIVERED', count: 5 },
    { status: 'DRAFT', count: 5 }
  ];
  let poCounter = 1001;
  for (const group of poStatuses) {
    for (let i = 0; i < group.count; i++) {
      const vendor = vendors[i % vendors.length];
      const product = rawMaterials[i % rawMaterials.length];
      const quantity = (i % 2 === 0) ? 50 : 100;
      const unitPrice = parseFloat(product.costPrice.toString());
      const lineTotal = quantity * unitPrice;
      const receivedQty = group.status === 'FULLY_DELIVERED' ? quantity : group.status === 'PARTIALLY_DELIVERED' ? quantity / 2 : 0;
      await prisma.purchaseOrder.create({
        data: {
          orderNumber: `PO-${poCounter++}`,
          vendorId: vendor.id,
          status: group.status,
          totalAmount: lineTotal,
          userId: purchaseManager.id,
          lines: { create: [{ productId: product.id, quantity, unitPrice, lineTotal, receivedQty }] }
        }
      });
    }
  }

  // ─── Manufacturing Orders ───────────────────────────────────────────────────
  // OIC TARGET: Assembly Line 2 bottleneck via 9 PENDING/IN_PROGRESS Assembly WOs
  //
  // Queue math:
  //   Assembly Line 2 capacity = 1  → available = 1 × 8h × 60min = 480 min/day
  //   IN_PROGRESS MO-linked-to-SO-1021: 1 Assembly WO at 60 min (IN_PROGRESS)
  //   8 PLANNED MOs: 8 Assembly WOs at 60 min each (PENDING)
  //   Total Assembly queue = 9 × 60 = 540 min
  //   Utilization = 540 / 480 × 100 = 112.5% → BOTTLENECK ✓
  console.log('🏗  Seeding Manufacturing Orders...');

  let moCounter = 1001;

  // 8 DONE MOs — completed historical orders (Assembly WOs = DONE, no queue contribution)
  const doneMoOps = [
    { bom: bomTable, product: fgTable, ops: [
      { wc: wcCutting,   name: 'Cutting & Sizing',       seq: 10, dur: 15 },
      { wc: wcAssembly,  name: 'Assembly',                seq: 20, dur: 30 },
      { wc: wcPainting,  name: 'Polishing & Finish',      seq: 30, dur: 45 },
      { wc: wcPackaging, name: 'Quality Check & Packing', seq: 40, dur: 10 }
    ]},
    { bom: bomDesk, product: fgDesk, ops: [
      { wc: wcCutting,   name: 'Frame Cutting',    seq: 10, dur: 20 },
      { wc: wcAssembly,  name: 'Structure Joining', seq: 20, dur: 40 },
      { wc: wcPainting,  name: 'Lacquering',        seq: 30, dur: 60 },
      { wc: wcPackaging, name: 'Final Boxing',      seq: 40, dur: 15 }
    ]}
  ];

  for (let i = 0; i < 8; i++) {
    const template = doneMoOps[i % 2];
    const plannedQuantity = (i % 3) + 2;
    const mo = await prisma.manufacturingOrder.create({
      data: {
        orderNumber: `MO-${moCounter++}`,
        productId: template.product.id,
        bomId: template.bom.id,
        status: 'DONE',
        plannedQuantity,
        completedQuantity: plannedQuantity,
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      }
    });
    for (const op of template.ops) {
      await prisma.workOrder.create({
        data: {
          manufacturingOrderId: mo.id,
          workCenterId: op.wc.id,
          operationName: op.name,
          sequence: op.seq,
          status: 'DONE',
          plannedDuration: op.dur,
          actualDuration: op.dur,
          endDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
        }
      });
    }
  }

  // 1 IN_PROGRESS MO — linked to SO-1021 (the high-risk order)
  // The Assembly WO is IN_PROGRESS → contributes 60 min to the bottleneck queue
  const moSo1021 = await prisma.manufacturingOrder.create({
    data: {
      orderNumber: `MO-${moCounter++}`,
      productId: fgDining.id,
      bomId: bomDining.id,
      status: 'IN_PROGRESS',
      plannedQuantity: 50,
      completedQuantity: 0,
      sourceSalesOrderId: so1021.id, // Links Order Delay Predictor to this MO
      startDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    }
  });
  // Cutting is DONE, Assembly is IN_PROGRESS, others PENDING
  await prisma.workOrder.create({
    data: { manufacturingOrderId: moSo1021.id, workCenterId: wcCutting.id, operationName: 'Frame Prep', sequence: 10, status: 'DONE', plannedDuration: 15, actualDuration: 15, endDate: new Date() }
  });
  await prisma.workOrder.create({
    // IN_PROGRESS Assembly WO: 60 min → BOTTLENECK contribution #1
    data: { manufacturingOrderId: moSo1021.id, workCenterId: wcAssembly.id, operationName: 'Dining Table Assembly', sequence: 20, status: 'IN_PROGRESS', plannedDuration: 60, startDate: new Date() }
  });
  await prisma.workOrder.create({
    data: { manufacturingOrderId: moSo1021.id, workCenterId: wcPainting.id, operationName: 'Stain & Lacquer', sequence: 30, status: 'PENDING', plannedDuration: 50 }
  });
  await prisma.workOrder.create({
    data: { manufacturingOrderId: moSo1021.id, workCenterId: wcPackaging.id, operationName: 'Quality & Packing', sequence: 40, status: 'PENDING', plannedDuration: 12 }
  });

  // 8 PLANNED MOs — the backlog that overloads Assembly Line 2
  // Each has a PENDING Assembly WO at 60 min → 8 × 60 = 480 min pending
  // Combined with the IN_PROGRESS WO above: total = 9 × 60 = 540 min → 112.5% utilization
  const plannedMoBoms = [bomTable, bomDining, bomDesk, bomTable, bomDining, bomDesk, bomTable, bomDining];
  const plannedMoProducts = [fgTable, fgDining, fgDesk, fgTable, fgDining, fgDesk, fgTable, fgDining];
  const plannedMoAssemblyOps = [
    { name: 'Assembly', dur: 60 },
    { name: 'Dining Table Assembly', dur: 60 },
    { name: 'Structure Joining', dur: 60 },
    { name: 'Assembly', dur: 60 },
    { name: 'Dining Table Assembly', dur: 60 },
    { name: 'Structure Joining', dur: 60 },
    { name: 'Assembly', dur: 60 },
    { name: 'Dining Table Assembly', dur: 60 }
  ];

  for (let i = 0; i < 8; i++) {
    const mo = await prisma.manufacturingOrder.create({
      data: {
        orderNumber: `MO-${moCounter++}`,
        productId: plannedMoProducts[i].id,
        bomId: plannedMoBoms[i].id,
        status: 'PLANNED',
        plannedQuantity: (i % 3) + 2,
        completedQuantity: 0
      }
    });
    // Every PLANNED MO has a PENDING Assembly work order — fills the bottleneck queue
    await prisma.workOrder.create({
      data: {
        manufacturingOrderId: mo.id,
        workCenterId: wcAssembly.id,
        operationName: plannedMoAssemblyOps[i].name,
        sequence: 20,
        status: 'PENDING',
        plannedDuration: plannedMoAssemblyOps[i].dur  // 60 min each
      }
    });
  }

  // 2 DRAFT MOs — not yet planned
  for (let i = 0; i < 2; i++) {
    const product = i === 0 ? fgTable : fgDesk;
    const bom = i === 0 ? bomTable : bomDesk;
    await prisma.manufacturingOrder.create({
      data: {
        orderNumber: `MO-${moCounter++}`,
        productId: product.id,
        bomId: bom.id,
        status: 'DRAFT',
        plannedQuantity: 3,
        completedQuantity: 0
      }
    });
  }

  // ─── Stock Ledger ───────────────────────────────────────────────────────────
  // OIC TARGET: Procurement Forecast driven by OUT consumption history.
  //
  // Formula used by procurementForecast.service.js:
  //   avgDailyConsumption = SUM(OUT.quantity last 30 days) / 30
  //   daysRemaining = onHandQty / avgDailyConsumption
  //
  // Wooden Tops  → CRITICAL (4.8 days):
  //   24 days × 6.5 units/day = 156 total OUT → avgDaily = 156/30 = 5.2 → days = 25/5.2 = 4.8
  //
  // Wooden Legs  → HIGH (7.5 days):
  //   24 days × 25 units/day = 600 total OUT → avgDaily = 600/30 = 20 → days = 150/20 = 7.5
  //
  // Wood Polish  → MEDIUM (11.4 days):
  //   30 days × 3.5 units/day = 105 total OUT → avgDaily = 105/30 = 3.5 → days = 40/3.5 = 11.4
  //
  // Screws/Box   → STABLE (high stock, low consumption)
  console.log('📊 Seeding Stock Ledger...');

  // Initial IN records (opening stock)
  for (const rm of rawMaterials) {
    await prisma.stockLedger.create({
      data: {
        productId: rm.id,
        transactionType: 'IN',
        quantity: rm.onHandQty,
        reason: 'initial_stocking',
        date: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000) // 35 days ago
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
        date: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000)
      }
    });
  }

  // Wooden Tops — CRITICAL consumption (6.5 units/day for 24 days)
  // avgDaily = 156/30 = 5.2/day → daysRemaining = 25/5.2 = 4.8 → CRITICAL ✓
  for (let d = 1; d <= 24; d++) {
    await prisma.stockLedger.create({
      data: {
        productId: rmTop.id,
        transactionType: 'OUT',
        quantity: 6.5,
        reason: 'production_consumption',
        referenceType: 'ManufacturingOrder',
        date: new Date(Date.now() - d * 24 * 60 * 60 * 1000)
      }
    });
  }

  // Wooden Legs — HIGH consumption (25 units/day for 24 days)
  // avgDaily = 600/30 = 20/day → daysRemaining = 150/20 = 7.5 → HIGH ✓
  for (let d = 1; d <= 24; d++) {
    await prisma.stockLedger.create({
      data: {
        productId: rmLeg.id,
        transactionType: 'OUT',
        quantity: 25,
        reason: 'production_consumption',
        referenceType: 'ManufacturingOrder',
        date: new Date(Date.now() - d * 24 * 60 * 60 * 1000)
      }
    });
  }

  // Wood Polish — MEDIUM consumption (3.5 units/day for 30 days)
  // avgDaily = 105/30 = 3.5/day → daysRemaining = 40/3.5 = 11.4 → MEDIUM ✓
  for (let d = 1; d <= 30; d++) {
    await prisma.stockLedger.create({
      data: {
        productId: rmPolish.id,
        transactionType: 'OUT',
        quantity: 3.5,
        reason: 'production_consumption',
        referenceType: 'ManufacturingOrder',
        date: new Date(Date.now() - d * 24 * 60 * 60 * 1000)
      }
    });
  }

  // Screws — very low consumption, STABLE
  for (let d = 1; d <= 20; d++) {
    await prisma.stockLedger.create({
      data: {
        productId: rmScrew.id,
        transactionType: 'OUT',
        quantity: 8,
        reason: 'production_consumption',
        referenceType: 'ManufacturingOrder',
        date: new Date(Date.now() - d * 24 * 60 * 60 * 1000)
      }
    });
  }
  // avgDaily = 160/30 = 5.3/day → daysRemaining = 800/5.3 = 150 days → STABLE ✓

  // ─── Audit Logs ─────────────────────────────────────────────────────────────
  console.log('📋 Seeding Audit Logs...');
  const auditLogs = [
    { entity: 'Product', entityId: fgDining.id, action: 'CREATE', details: { name: fgDining.name, sku: fgDining.sku } },
    { entity: 'Product', entityId: fgTable.id, action: 'CREATE', details: { name: fgTable.name, sku: fgTable.sku } },
    { entity: 'BOM', entityId: bomDining.id, action: 'CREATE', details: { name: bomDining.name } },
    { entity: 'BOM', entityId: bomTable.id, action: 'CREATE', details: { name: bomTable.name } },
    { entity: 'User', entityId: adminUser.id, action: 'LOGIN', details: { email: adminUser.email } },
    { entity: 'User', entityId: salesManager.id, action: 'LOGIN', details: { email: salesManager.email } },
    { entity: 'SalesOrder', entityId: so1021.id, action: 'CREATE', details: { orderNumber: 'SO-1021', customerName: 'Priya Furniture Hub', quantity: 50 } },
    { entity: 'SalesOrder', entityId: so1021.id, action: 'UPDATE', details: { status: 'CONFIRMED', note: 'Auto-procurement triggered' } },
    { entity: 'ManufacturingOrder', entityId: moSo1021.id, action: 'CREATE', details: { orderNumber: moSo1021.orderNumber, linkedSO: 'SO-1021' } },
    { entity: 'Product', entityId: rmTop.id, action: 'UPDATE', details: { field: 'onHandQty', from: 100, to: 25, reason: 'Stock correction after audit' } }
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

  console.log('');
  console.log('✅ Database seeding complete!');
  console.log('');
  console.log('── Expected OIC Outputs ──────────────────────────────────');
  console.log('Procurement Forecast:');
  console.log('  Wooden Tops  → CRITICAL  (4.8 days)');
  console.log('  Wooden Legs  → HIGH      (7.5 days)');
  console.log('  Wood Polish  → MEDIUM    (11.4 days)');
  console.log('  Screws       → STABLE    (150 days)');
  console.log('Inventory Risk (active SOs):');
  console.log('  Wooden Tops  → CRITICAL  (need 81, have 25 → 31%)');
  console.log('  Wooden Legs  → CRITICAL  (need 292, have 150 → 51%)');
  console.log('  Wood Polish  → CRITICAL  (need 73, have 40 → 55%)');
  console.log('  Screws       → HIGH      (need 940, have 800 → 85%)');
  console.log('Bottleneck Analysis:');
  console.log('  Assembly Line 2 → BOTTLENECK (112.5% utilization, 9 WOs queued)');
  console.log('  Paint Shop      → NORMAL');
  console.log('  Packaging Unit  → NORMAL');
  console.log('Order Delay Predictor:');
  console.log('  SO-1021 (Priya Furniture Hub, 50 Dining Tables)');
  console.log('    → HIGH RISK (+5 days) | Reason: Wooden Tops shortage');
  console.log('Business Health Score:');
  console.log('  Inventory Health:    ~55');
  console.log('  Manufacturing Health: 75');
  console.log('  Procurement Health:   68');
  console.log('  Overall:             ~66 (adjust penalty weights in service to hit 72-75)');
  console.log('──────────────────────────────────────────────────────────');
  console.log('');
  console.log('Demo credentials: admin@shivfurniture.com / password123');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
