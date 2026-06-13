const express = require('express');
const router = express.Router();
const auditLogController = require('../controllers/auditLogController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// Admin only endpoint to retrieve system audit logs
router.get('/', authorize('ADMIN'), auditLogController.getAuditLogs);

module.exports = router;
