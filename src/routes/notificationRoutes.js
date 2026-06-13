const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/',             ctrl.getMyNotifications);
router.patch('/read-all',   ctrl.markAllRead);
router.patch('/:id/read',   ctrl.markRead);

module.exports = router;
