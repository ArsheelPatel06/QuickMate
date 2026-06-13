const express = require('express');
const router = express.Router();
const salesOrderController = require('../controllers/salesOrderController');
const { protect, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const Joi = require('joi');

const orderLineSchema = Joi.object({
  productId: Joi.string().required(),
  quantity: Joi.number().min(0.0001).required(),
  unitPrice: Joi.number().min(0).required()
});

const createOrderSchema = Joi.object({
  customerName: Joi.string().required(),
  lines: Joi.array().items(orderLineSchema).min(1).required()
});

router.use(protect);

router.post(
  '/',
  authorize('ADMIN', 'SALES', 'OWNER'),
  validate(createOrderSchema),
  salesOrderController.createSalesOrder
);

router.get(
  '/',
  authorize('ADMIN', 'SALES', 'OWNER', 'INVENTORY'),
  salesOrderController.getSalesOrders
);

router.get(
  '/:id',
  authorize('ADMIN', 'SALES', 'OWNER', 'INVENTORY'),
  salesOrderController.getSalesOrderById
);

router.post(
  '/:id/confirm',
  authorize('ADMIN', 'SALES', 'OWNER'),
  salesOrderController.confirmSalesOrder
);

router.post(
  '/:id/deliver',
  authorize('ADMIN', 'INVENTORY', 'OWNER'),
  salesOrderController.deliverSalesOrder
);

module.exports = router;
