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

// Error Handling
app.use(notFound);
app.use(errorHandler);

module.exports = app;
