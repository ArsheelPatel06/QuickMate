-- setup database seed data for Shiv Furniture Works
-- Truncate existing tables
TRUNCATE TABLE "AuditLog", "StockLedger", "WorkOrder", "ManufacturingOrder", 
               "PurchaseOrderLine", "PurchaseOrder", "SalesOrderLine", "SalesOrder", 
               "BOMOperation", "BOMLine", "BOM", "Product", "WorkCenter", "Vendor", "User" CASCADE;

-- Insert Users (Password: password123, pre-hashed using bcrypt salt round 10)
INSERT INTO "User" (id, name, email, "passwordHash", role, "createdAt", "updatedAt") VALUES
('u-admin', 'Admin User', 'admin@shivfurniture.com', '$2b$10$k1617iV.3.15Q8Z8lD6tEu0pD/7/4949494949494949494949', 'ADMIN', NOW(), NOW()),
('u-sales', 'Sales Manager', 'sales@shivfurniture.com', '$2b$10$k1617iV.3.15Q8Z8lD6tEu0pD/7/4949494949494949494949', 'SALES', NOW(), NOW()),
('u-purchase', 'Purchase Manager', 'purchase@shivfurniture.com', '$2b$10$k1617iV.3.15Q8Z8lD6tEu0pD/7/4949494949494949494949', 'PURCHASE', NOW(), NOW()),
('u-mfg', 'Manufacturing Manager', 'manufacturing@shivfurniture.com', '$2b$10$k1617iV.3.15Q8Z8lD6tEu0pD/7/4949494949494949494949', 'MANUFACTURING', NOW(), NOW()),
('u-inv', 'Inventory Manager', 'inventory@shivfurniture.com', '$2b$10$k1617iV.3.15Q8Z8lD6tEu0pD/7/4949494949494949494949', 'INVENTORY', NOW(), NOW());

-- Insert Vendors
INSERT INTO "Vendor" (id, name, contact, email, "createdAt", "updatedAt") VALUES
('v-wood', 'ABC Wood Suppliers', 'Ramesh Kumar', 'ramesh@abcwood.com', NOW(), NOW()),
('v-hw', 'Premium Hardware Ltd', 'Amit Sharma', 'sales@premiumhardware.com', NOW(), NOW()),
('v-fastener', 'Fastener Solutions Pvt Ltd', 'Vijay Patel', 'info@fastenersolutions.in', NOW(), NOW()),
('v-paint', 'PaintCo Industries', 'Sanjay Gupta', 'orders@paintco.com', NOW(), NOW());

-- Insert Work Centers
INSERT INTO "WorkCenter" (id, name, capacity, "costPerHour", "createdAt", "updatedAt") VALUES
('wc-cut', 'Assembly Line 1', 2.0, 50.00, NOW(), NOW()),
('wc-ass', 'Assembly Line 2', 3.0, 45.00, NOW(), NOW()),
('wc-paint', 'Paint Shop', 1.0, 60.00, NOW(), NOW()),
('wc-pack', 'Packaging Unit', 4.0, 30.00, NOW(), NOW());

-- Insert Raw Materials
INSERT INTO "Product" (id, name, sku, "salesPrice", "costPrice", "onHandQty", "reservedQty", "procurementStrategy", "procureOnDemand", "procurementType", "createdAt", "updatedAt") VALUES
('p-rm-leg', 'Wooden Legs', 'RM-LEG', 0.00, 10.00, 200.0, 0.0, 'MAKE_TO_STOCK', false, 'PURCHASE', NOW(), NOW()),
('p-rm-top', 'Wooden Tops', 'RM-TOP', 0.00, 35.00, 100.0, 0.0, 'MAKE_TO_STOCK', false, 'PURCHASE', NOW(), NOW()),
('p-rm-screw', 'Screws', 'RM-SCREW', 0.00, 0.10, 1000.0, 0.0, 'MAKE_TO_STOCK', false, 'PURCHASE', NOW(), NOW()),
('p-rm-polish', 'Wood Polish', 'RM-POLISH', 0.00, 15.00, 50.0, 0.0, 'MAKE_TO_STOCK', false, 'PURCHASE', NOW(), NOW()),
('p-rm-box', 'Packing Box', 'RM-BOX', 0.00, 5.00, 120.0, 0.0, 'MAKE_TO_STOCK', false, 'PURCHASE', NOW(), NOW());

-- Insert Finished Goods
INSERT INTO "Product" (id, name, sku, "salesPrice", "costPrice", "onHandQty", "reservedQty", "procurementStrategy", "procureOnDemand", "procurementType", "createdAt", "updatedAt") VALUES
('p-fg-table', 'Wooden Table', 'FG-TABLE', 180.00, 90.00, 10.0, 0.0, 'MAKE_TO_STOCK', false, 'MANUFACTURE', NOW(), NOW()),
('p-fg-desk', 'Office Desk', 'FG-DESK', 280.00, 150.00, 5.0, 0.0, 'MAKE_TO_STOCK', false, 'MANUFACTURE', NOW(), NOW()),
('p-fg-dining', 'Dining Table', 'FG-DINING', 450.00, 220.00, 3.0, 0.0, 'MAKE_TO_STOCK', false, 'MANUFACTURE', NOW(), NOW()),
('p-fg-study', 'Study Table', 'FG-STUDY', 220.00, 110.00, 8.0, 0.0, 'MAKE_TO_STOCK', false, 'MANUFACTURE', NOW(), NOW()),
('p-fg-coffee', 'Coffee Table', 'FG-COFFEE', 120.00, 60.00, 15.0, 0.0, 'MAKE_TO_STOCK', false, 'MANUFACTURE', NOW(), NOW());

-- Insert BOMs
INSERT INTO "BOM" (id, name, "productId", quantity, "createdAt", "updatedAt") VALUES
('b-table', 'Wooden Table Standard BOM', 'p-fg-table', 1.0, NOW(), NOW()),
('b-desk', 'Office Desk Premium BOM', 'p-fg-desk', 1.0, NOW(), NOW());

-- Insert BOM Lines
INSERT INTO "BOMLine" (id, "bomId", "productId", quantity, "createdAt", "updatedAt") VALUES
('bl-table-1', 'b-table', 'p-rm-leg', 4.0, NOW(), NOW()),
('bl-table-2', 'b-table', 'p-rm-top', 1.0, NOW(), NOW()),
('bl-table-3', 'b-table', 'p-rm-screw', 12.0, NOW(), NOW()),
('bl-table-4', 'b-table', 'p-rm-polish', 1.0, NOW(), NOW()),
('bl-desk-1', 'b-desk', 'p-rm-leg', 4.0, NOW(), NOW()),
('bl-desk-2', 'b-desk', 'p-rm-top', 2.0, NOW(), NOW()),
('bl-desk-3', 'b-desk', 'p-rm-screw', 20.0, NOW(), NOW()),
('bl-desk-4', 'b-desk', 'p-rm-polish', 1.0, NOW(), NOW()),
('bl-desk-5', 'b-desk', 'p-rm-box', 1.0, NOW(), NOW());

-- Insert BOM Operations
INSERT INTO "BOMOperation" (id, "bomId", "workCenterId", "operationName", sequence, duration, "createdAt", "updatedAt") VALUES
('bo-table-1', 'b-table', 'wc-cut', 'Cutting & Sizing', 10, 15.0, NOW(), NOW()),
('bo-table-2', 'b-table', 'wc-ass', 'Assembly', 20, 30.0, NOW(), NOW()),
('bo-table-3', 'b-table', 'wc-paint', 'Polishing & Finish', 30, 45.0, NOW(), NOW()),
('bo-table-4', 'b-table', 'wc-pack', 'Quality Check & Packing', 40, 10.0, NOW(), NOW()),
('bo-desk-1', 'b-desk', 'wc-cut', 'Frame Cutting', 10, 20.0, NOW(), NOW()),
('bo-desk-2', 'b-desk', 'wc-ass', 'Structure Joining', 20, 40.0, NOW(), NOW()),
('bo-desk-3', 'b-desk', 'wc-paint', 'Lacquering', 30, 60.0, NOW(), NOW()),
('bo-desk-4', 'b-desk', 'wc-pack', 'Final Boxing', 40, 15.0, NOW(), NOW());

-- Insert Stock Ledger records
INSERT INTO "StockLedger" (id, "productId", "transactionType", quantity, reason, date, "createdAt", "updatedAt") VALUES
('sl-1', 'p-rm-leg', 'IN', 200.0, 'initial_stocking', NOW(), NOW(), NOW()),
('sl-2', 'p-rm-top', 'IN', 100.0, 'initial_stocking', NOW(), NOW(), NOW()),
('sl-3', 'p-rm-screw', 'IN', 1000.0, 'initial_stocking', NOW(), NOW(), NOW()),
('sl-4', 'p-rm-polish', 'IN', 50.0, 'initial_stocking', NOW(), NOW(), NOW()),
('sl-5', 'p-rm-box', 'IN', 120.0, 'initial_stocking', NOW(), NOW(), NOW()),
('sl-6', 'p-fg-table', 'IN', 10.0, 'initial_stocking', NOW(), NOW(), NOW()),
('sl-7', 'p-fg-desk', 'IN', 5.0, 'initial_stocking', NOW(), NOW(), NOW()),
('sl-8', 'p-fg-dining', 'IN', 3.0, 'initial_stocking', NOW(), NOW(), NOW()),
('sl-9', 'p-fg-study', 'IN', 8.0, 'initial_stocking', NOW(), NOW(), NOW()),
('sl-10', 'p-fg-coffee', 'IN', 15.0, 'initial_stocking', NOW(), NOW(), NOW());

-- Insert Audit Logs
INSERT INTO "AuditLog" (id, "userId", action, entity, "entityId", details, "ipAddress", "createdAt") VALUES
('al-1', 'u-admin', 'CREATE', 'Product', 'p-fg-table', '{"name":"Wooden Table","sku":"FG-TABLE"}', '127.0.0.1', NOW()),
('al-2', 'u-admin', 'CREATE', 'Product', 'p-fg-desk', '{"name":"Office Desk","sku":"FG-DESK"}', '127.0.0.1', NOW()),
('al-3', 'u-admin', 'CREATE', 'BOM', 'b-table', '{"name":"Wooden Table Standard BOM"}', '127.0.0.1', NOW()),
('al-4', 'u-admin', 'LOGIN', 'User', 'u-admin', '{"email":"admin@shivfurniture.com"}', '127.0.0.1', NOW());
