const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get(
  '/', 
  // Let all roles view the dashboard, or adjust as needed
  authorize('ADMIN', 'OWNER', 'SALES', 'PURCHASE', 'MANUFACTURING', 'INVENTORY'), 
  dashboardController.getDashboard
);

router.post(
  '/seed',
  authorize('ADMIN', 'OWNER'),
  dashboardController.seedDatabase
);

module.exports = router;
