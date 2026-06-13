const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/approvalController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/',                ctrl.getPending);
router.patch('/:id/approve',   authorize('ADMIN','OWNER','PURCHASE'), ctrl.approve);
router.patch('/:id/reject',    authorize('ADMIN','OWNER','PURCHASE'), ctrl.reject);

module.exports = router;
