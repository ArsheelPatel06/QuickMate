const express = require('express');
const router  = express.Router();
const controller = require('./intelligence.controller');
const { protect, authorize } = require('../middleware/auth');

const ALL_ROLES = ['ADMIN', 'OWNER', 'SALES', 'PURCHASE', 'MANUFACTURING', 'INVENTORY'];

router.use(protect);

// Sprint 1
router.get('/inventory-risk',      authorize(...ALL_ROLES), controller.getInventoryRiskHandler);
router.get('/procurement-forecast', authorize(...ALL_ROLES), controller.getProcurementForecastHandler);

// Sprint 2
router.get('/bottleneck',          authorize(...ALL_ROLES), controller.getBottleneckHandler);

// Sprint 3
router.get('/order-risk',          authorize(...ALL_ROLES), controller.getOrderRiskHandler);
router.get('/health-score',        authorize(...ALL_ROLES), controller.getHealthScoreHandler);
router.get('/advisor',             authorize(...ALL_ROLES), controller.getAdvisorHandler);

// Overview — single call that powers the entire frontend page
router.get('/overview',            authorize(...ALL_ROLES), controller.getOverviewHandler);

module.exports = router;
