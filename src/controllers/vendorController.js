const vendorService = require('../services/vendorService');
const { successResponse, errorResponse } = require('../utils/response');

const createVendor = async (req, res, next) => {
  try {
    const vendor = await vendorService.createVendor(req.body);
    successResponse(res, 201, 'Vendor created successfully', vendor);
  } catch (err) { next(err); }
};
const getVendors = async (req, res, next) => {
  try {
    const vendors = await vendorService.getVendors();
    successResponse(res, 200, 'Vendors retrieved successfully', vendors);
  } catch (err) { next(err); }
};
const getVendorById = async (req, res, next) => {
  try {
    const vendor = await vendorService.getVendorById(req.params.id);
    if (!vendor) return errorResponse(res, 404, 'Vendor not found');
    successResponse(res, 200, 'Vendor retrieved successfully', vendor);
  } catch (err) { next(err); }
};
const updateVendor = async (req, res, next) => {
  try {
    const vendor = await vendorService.updateVendor(req.params.id, req.body);
    successResponse(res, 200, 'Vendor updated successfully', vendor);
  } catch (err) { next(err); }
};
const deleteVendor = async (req, res, next) => {
  try {
    await vendorService.deleteVendor(req.params.id);
    successResponse(res, 200, 'Vendor deleted successfully');
  } catch (err) { next(err); }
};

module.exports = { createVendor, getVendors, getVendorById, updateVendor, deleteVendor };
