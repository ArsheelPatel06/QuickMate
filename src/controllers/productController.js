const productService = require('../services/productService');
const { successResponse, errorResponse } = require('../utils/response');

const createProduct = async (req, res, next) => {
  try {
    const product = await productService.createProduct(req.body);
    successResponse(res, 201, 'Product created successfully', product);
  } catch (error) {
    if (error.code === 'P2002') {
      return errorResponse(res, 400, 'Product with this SKU already exists');
    }
    next(error);
  }
};

const getProducts = async (req, res, next) => {
  try {
    const { page, limit, search } = req.query;
    const result = await productService.getProducts(page, limit, search);
    successResponse(res, 200, 'Products retrieved successfully', result);
  } catch (error) {
    next(error);
  }
};

const getProductById = async (req, res, next) => {
  try {
    const product = await productService.getProductById(req.params.id);
    successResponse(res, 200, 'Product retrieved successfully', product);
  } catch (error) {
    if (error.message === 'Product not found') {
      return errorResponse(res, 404, error.message);
    }
    next(error);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    const product = await productService.updateProduct(req.params.id, req.body);
    successResponse(res, 200, 'Product updated successfully', product);
  } catch (error) {
    if (error.message === 'Product not found') {
      return errorResponse(res, 404, error.message);
    }
    if (error.code === 'P2002') {
      return errorResponse(res, 400, 'Product with this SKU already exists');
    }
    next(error);
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    await productService.deleteProduct(req.params.id);
    successResponse(res, 200, 'Product deleted successfully');
  } catch (error) {
    if (error.message === 'Product not found') {
      return errorResponse(res, 404, error.message);
    }
    next(error);
  }
};

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct
};
