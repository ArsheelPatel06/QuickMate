const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/',                                   ctrl.getUsers);
router.get('/:id',                                ctrl.getUserById);
router.post('/',         authorize('ADMIN','OWNER'), ctrl.createUser);
router.patch('/:id',     authorize('ADMIN','OWNER'), ctrl.updateUser);
router.patch('/:id/disable', authorize('ADMIN','OWNER'), ctrl.disableUser);
router.patch('/:id/enable',  authorize('ADMIN','OWNER'), ctrl.enableUser);
router.post('/:id/reset-password', authorize('ADMIN','OWNER'), ctrl.resetPassword);
router.delete('/:id',              authorize('ADMIN','OWNER'), ctrl.deleteUser);

module.exports = router;
