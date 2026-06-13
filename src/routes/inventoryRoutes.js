const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { protect, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const Joi = require('joi');

const adjustSchema = Joi.object({
  productId: Joi.string().required(),
  quantity: Joi.number().required().invalid(0), // Can be positive or negative
  reason: Joi.string().required()
});

router.use(protect);

router.post(
  '/adjust',
  authorize('ADMIN', 'INVENTORY', 'OWNER'),
  validate(adjustSchema),
  inventoryController.adjustInventory
);

module.exports = router;
