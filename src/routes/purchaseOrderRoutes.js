const express = require('express');
const router = express.Router();
const purchaseOrderController = require('../controllers/purchaseOrderController');
const { protect, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const Joi = require('joi');

const orderLineSchema = Joi.object({
  productId: Joi.string().required(),
  quantity: Joi.number().min(0.0001).required(),
  unitPrice: Joi.number().min(0).required()
});

const createOrderSchema = Joi.object({
  vendorId: Joi.string().required(),
  lines: Joi.array().items(orderLineSchema).min(1).required()
});

const receiptSchema = Joi.object({
  lineId: Joi.string().required(),
  receivedQty: Joi.number().min(0.0001).required()
});

const receiveOrderSchema = Joi.object({
  receipts: Joi.array().items(receiptSchema).min(1).required()
});

router.use(protect);

router.post(
  '/',
  authorize('ADMIN', 'PURCHASE', 'OWNER'),
  validate(createOrderSchema),
  purchaseOrderController.createPurchaseOrder
);

router.get(
  '/',
  authorize('ADMIN', 'PURCHASE', 'OWNER', 'INVENTORY'),
  purchaseOrderController.getPurchaseOrders
);

router.get(
  '/:id',
  authorize('ADMIN', 'PURCHASE', 'OWNER', 'INVENTORY'),
  purchaseOrderController.getPurchaseOrderById
);

router.post(
  '/:id/confirm',
  authorize('ADMIN', 'PURCHASE', 'OWNER'),
  purchaseOrderController.confirmPurchaseOrder
);

router.post(
  '/:id/receive',
  authorize('ADMIN', 'INVENTORY', 'OWNER'),
  validate(receiveOrderSchema),
  purchaseOrderController.receivePurchaseOrder
);

router.post(
  '/:id/cancel',
  authorize('ADMIN', 'PURCHASE', 'OWNER'),
  purchaseOrderController.cancelPurchaseOrder
);

module.exports = router;
