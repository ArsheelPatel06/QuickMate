const wcService = require('../services/workCenterService');
const { successResponse, errorResponse } = require('../utils/response');

const createWorkCenter = async (req, res, next) => {
  try {
    const wc = await wcService.createWorkCenter(req.body);
    successResponse(res, 201, 'Work Center created successfully', wc);
  } catch (err) { next(err); }
};
const getWorkCenters = async (req, res, next) => {
  try {
    const wcs = await wcService.getWorkCenters();
    successResponse(res, 200, 'Work Centers retrieved successfully', wcs);
  } catch (err) { next(err); }
};
const getWorkCenterById = async (req, res, next) => {
  try {
    const wc = await wcService.getWorkCenterById(req.params.id);
    if (!wc) return errorResponse(res, 404, 'Work Center not found');
    successResponse(res, 200, 'Work Center retrieved successfully', wc);
  } catch (err) { next(err); }
};
const updateWorkCenter = async (req, res, next) => {
  try {
    const wc = await wcService.updateWorkCenter(req.params.id, req.body);
    successResponse(res, 200, 'Work Center updated successfully', wc);
  } catch (err) { next(err); }
};
const deleteWorkCenter = async (req, res, next) => {
  try {
    await wcService.deleteWorkCenter(req.params.id);
    successResponse(res, 200, 'Work Center deleted successfully');
  } catch (err) { next(err); }
};

module.exports = { createWorkCenter, getWorkCenters, getWorkCenterById, updateWorkCenter, deleteWorkCenter };
