const express = require('express');
const router = express.Router();
const vendorController = require('../controllers/vendorController');
const { protect, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const Joi = require('joi');

const vendorSchema = Joi.object({
  name: Joi.string().required(),
  contact: Joi.string().optional().allow(null, ''),
  email: Joi.string().email().optional().allow(null, ''),
  isActive: Joi.boolean().optional()
});

router.use(protect);
router.post('/', authorize('ADMIN', 'PURCHASE', 'OWNER'), validate(vendorSchema), vendorController.createVendor);
router.get('/', authorize('ADMIN', 'PURCHASE', 'OWNER', 'INVENTORY'), vendorController.getVendors);
router.get('/:id', authorize('ADMIN', 'PURCHASE', 'OWNER', 'INVENTORY'), vendorController.getVendorById);
router.put('/:id', authorize('ADMIN', 'PURCHASE', 'OWNER'), validate(vendorSchema), vendorController.updateVendor);
router.delete('/:id', authorize('ADMIN', 'OWNER'), vendorController.deleteVendor);

module.exports = router;
