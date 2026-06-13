const bomService = require('../services/bomService');
const { successResponse, errorResponse } = require('../utils/response');

const createBom = async (req, res, next) => {
  try {
    const bom = await bomService.createBom(req.body);
    successResponse(res, 201, 'BOM created successfully', bom);
  } catch (error) {
    next(error);
  }
};

const getBoms = async (req, res, next) => {
  try {
    const { page, limit, search } = req.query;
    const result = await bomService.getBoms(page, limit, search);
    successResponse(res, 200, 'BOMs retrieved successfully', result);
  } catch (error) {
    next(error);
  }
};

const getBomById = async (req, res, next) => {
  try {
    const bom = await bomService.getBomById(req.params.id);
    successResponse(res, 200, 'BOM retrieved successfully', bom);
  } catch (error) {
    if (error.message === 'BOM not found') return errorResponse(res, 404, error.message);
    next(error);
  }
};

const updateBom = async (req, res, next) => {
  try {
    const bom = await bomService.updateBom(req.params.id, req.body);
    successResponse(res, 200, 'BOM updated successfully', bom);
  } catch (error) {
    if (error.message === 'BOM not found') return errorResponse(res, 404, error.message);
    next(error);
  }
};

const deleteBom = async (req, res, next) => {
  try {
    await bomService.deleteBom(req.params.id);
    successResponse(res, 200, 'BOM deleted successfully');
  } catch (error) {
    if (error.message === 'BOM not found') return errorResponse(res, 404, error.message);
    next(error);
  }
};

const explodeBom = async (req, res, next) => {
  try {
    const explosion = await bomService.explodeBom(req.params.id);
    successResponse(res, 200, 'BOM exploded successfully', explosion);
  } catch (error) {
    if (error.message === 'BOM not found') return errorResponse(res, 404, error.message);
    next(error);
  }
};

module.exports = {
  createBom,
  getBoms,
  getBomById,
  updateBom,
  deleteBom,
  explodeBom
};
