const stockService = require('../services/stockService');
const { successResponse, errorResponse } = require('../utils/response');

const adjustInventory = async (req, res, next) => {
  try {
    const { productId, quantity, reason } = req.body;
    // Uses the authenticated user ID as the reference for Manual Adjustments
    const result = await stockService.adjustStock(
      productId,
      quantity,
      reason,
      'ManualAdjustment',
      req.user.id 
    );
    successResponse(res, 200, 'Inventory adjusted successfully', result);
  } catch (error) {
    if (error.message.includes('Insufficient stock')) return errorResponse(res, 400, error.message);
    next(error);
  }
};

module.exports = { adjustInventory };
