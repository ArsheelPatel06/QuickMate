const moService = require('../services/manufacturingOrderService');
const { successResponse, errorResponse } = require('../utils/response');

const createManufacturingOrder = async (req, res, next) => {
  try {
    const order = await moService.createManufacturingOrder(req.body);
    successResponse(res, 201, 'Manufacturing Order created successfully', order);
  } catch (error) {
    if (error.message.includes('No BOM found')) return errorResponse(res, 400, error.message);
    next(error);
  }
};

const getManufacturingOrders = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const result = await moService.getManufacturingOrders(page, limit);
    successResponse(res, 200, 'Manufacturing Orders retrieved successfully', result);
  } catch (error) {
    next(error);
  }
};

const getManufacturingOrderById = async (req, res, next) => {
  try {
    const order = await moService.getManufacturingOrderById(req.params.id);
    successResponse(res, 200, 'Manufacturing Order retrieved successfully', order);
  } catch (error) {
    if (error.message === 'Manufacturing Order not found') return errorResponse(res, 404, error.message);
    next(error);
  }
};

const completeWorkOrder = async (req, res, next) => {
  try {
    const { actualDuration } = req.body;
    const result = await moService.completeWorkOrder(req.params.id, req.params.workOrderId, actualDuration);
    successResponse(res, 200, result.message, result.order);
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('already completed')) {
      return errorResponse(res, 400, error.message);
    }
    next(error);
  }
};

module.exports = {
  createManufacturingOrder,
  getManufacturingOrders,
  getManufacturingOrderById,
  completeWorkOrder
};
