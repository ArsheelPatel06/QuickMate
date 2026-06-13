const express = require('express');
const cors = require('cors');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { requestLogger } = require('./middleware/logger');
const healthRoutes = require('./routes/healthRoutes');
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const bomRoutes = require('./routes/bomRoutes');
const salesOrderRoutes = require('./routes/salesOrderRoutes');
const purchaseOrderRoutes = require('./routes/purchaseOrderRoutes');
const manufacturingOrderRoutes = require('./routes/manufacturingOrderRoutes');
const auditLogRoutes = require('./routes/auditLogRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const vendorRoutes = require('./routes/vendorRoutes');
const workCenterRoutes = require('./routes/workCenterRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const intelligenceRoutes = require('./intelligence/intelligence.routes');
const userRoutes         = require('./routes/userRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const approvalRoutes     = require('./routes/approvalRoutes');
const auditLogger = require('./middleware/auditLogger');

const app = express();

// Middleware
app.use(cors()); // Enable CORS
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(requestLogger); // Custom logger middleware
app.use(auditLogger); // Global audit log tracker

// Routes
app.use('/health', healthRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/boms', bomRoutes);
app.use('/api/v1/sales-orders', salesOrderRoutes);
app.use('/api/v1/purchase-orders', purchaseOrderRoutes);
app.use('/api/v1/manufacturing-orders', manufacturingOrderRoutes);
app.use('/api/v1/audit-logs', auditLogRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/vendors', vendorRoutes);
app.use('/api/v1/work-centers', workCenterRoutes);
app.use('/api/v1/inventory', inventoryRoutes);
app.use('/api/v1/intelligence', intelligenceRoutes);
app.use('/api/v1/users',        userRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/approvals',    approvalRoutes);

// Error Handling
app.use(notFound);
app.use(errorHandler);

module.exports = app;
