const purchaseOrderService = require('../services/purchaseOrderService');
const { successResponse, errorResponse } = require('../utils/response');

const createPurchaseOrder = async (req, res, next) => {
  try {
    const order = await purchaseOrderService.createPurchaseOrder(req.user.id, req.body);
    successResponse(res, 201, 'Purchase Order created successfully', order);
  } catch (error) {
    next(error);
  }
};

const getPurchaseOrders = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const result = await purchaseOrderService.getPurchaseOrders(page, limit);
    successResponse(res, 200, 'Purchase Orders retrieved successfully', result);
  } catch (error) {
    next(error);
  }
};

const getPurchaseOrderById = async (req, res, next) => {
  try {
    const order = await purchaseOrderService.getPurchaseOrderById(req.params.id);
    successResponse(res, 200, 'Purchase Order retrieved successfully', order);
  } catch (error) {
    if (error.message === 'Purchase Order not found') return errorResponse(res, 404, error.message);
    next(error);
  }
};

const confirmPurchaseOrder = async (req, res, next) => {
  try {
    const order = await purchaseOrderService.confirmPurchaseOrder(req.params.id);
    successResponse(res, 200, 'Purchase Order confirmed successfully', order);
  } catch (error) {
    if (error.message.includes('cannot be confirmed')) return errorResponse(res, 400, error.message);
    next(error);
  }
};

const receivePurchaseOrder = async (req, res, next) => {
  try {
    // req.body.receipts: [{ lineId: 'uuid', receivedQty: 10 }]
    const order = await purchaseOrderService.receivePurchaseOrder(req.params.id, req.body.receipts);
    successResponse(res, 200, 'Purchase Order received successfully', order);
  } catch (error) {
    if (error.message.includes('Cannot receive')) return errorResponse(res, 400, error.message);
    next(error);
  }
};

module.exports = {
  createPurchaseOrder,
  getPurchaseOrders,
  getPurchaseOrderById,
  confirmPurchaseOrder,
  receivePurchaseOrder
};
