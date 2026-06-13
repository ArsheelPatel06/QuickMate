const express = require('express');
const router = express.Router();
const moController = require('../controllers/manufacturingOrderController');
const { protect, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const Joi = require('joi');

const createMOSchema = Joi.object({
  productId: Joi.string().required(),
  plannedQuantity: Joi.number().min(0.0001).required(),
  bomId: Joi.string().optional()
});

const completeWOSchema = Joi.object({
  actualDuration: Joi.number().min(0).optional()
});

router.use(protect);

router.post(
  '/',
  authorize('ADMIN', 'MANUFACTURING', 'OWNER'),
  validate(createMOSchema),
  moController.createManufacturingOrder
);

router.get(
  '/',
  authorize('ADMIN', 'MANUFACTURING', 'OWNER', 'INVENTORY'),
  moController.getManufacturingOrders
);

router.get(
  '/:id',
  authorize('ADMIN', 'MANUFACTURING', 'OWNER', 'INVENTORY'),
  moController.getManufacturingOrderById
);

router.post(
  '/:id/work-orders/:workOrderId/complete',
  authorize('ADMIN', 'MANUFACTURING', 'OWNER'),
  validate(completeWOSchema),
  moController.completeWorkOrder
);

module.exports = router;
