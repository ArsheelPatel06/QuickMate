const salesOrderService = require('../services/salesOrderService');
const automationService = require('../services/automationService');
const { successResponse, errorResponse } = require('../utils/response');

const createSalesOrder = async (req, res, next) => {
  try {
    const order = await salesOrderService.createSalesOrder(req.user.id, req.body);
    successResponse(res, 201, 'Sales Order created successfully', order);
  } catch (error) {
    next(error);
  }
};

const getSalesOrders = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const result = await salesOrderService.getSalesOrders(page, limit);
    successResponse(res, 200, 'Sales Orders retrieved successfully', result);
  } catch (error) {
    next(error);
  }
};

const getSalesOrderById = async (req, res, next) => {
  try {
    const order = await salesOrderService.getSalesOrderById(req.params.id);
    successResponse(res, 200, 'Sales Order retrieved successfully', order);
  } catch (error) {
    if (error.message === 'Sales Order not found') return errorResponse(res, 404, error.message);
    next(error);
  }
};

const confirmSalesOrder = async (req, res, next) => {
  try {
    const order = await salesOrderService.confirmSalesOrder(req.params.id);
    // Fire automation in the background — do not block the API response
    automationService.processOrderConfirm(order.id).catch(err =>
      console.error('[Automation] processOrderConfirm error:', err.message)
    );
    successResponse(res, 200, 'Sales Order confirmed. Inventory check and procurement rules triggered.', order);
  } catch (error) {
    if (error.message.includes('cannot be confirmed')) return errorResponse(res, 400, error.message);
    next(error);
  }
};

const deliverSalesOrder = async (req, res, next) => {
  try {
    const order = await salesOrderService.deliverSalesOrder(req.params.id);
    successResponse(res, 200, 'Sales Order delivered successfully', order);
  } catch (error) {
    if (error.message.includes('Cannot deliver')) return errorResponse(res, 400, error.message);
    next(error);
  }
};

module.exports = {
  createSalesOrder,
  getSalesOrders,
  getSalesOrderById,
  confirmSalesOrder,
  deliverSalesOrder
};
