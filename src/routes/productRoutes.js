const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { protect, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const Joi = require('joi');

const productSchema = Joi.object({
  name: Joi.string().required(),
  sku: Joi.string().required(),
  salesPrice: Joi.number().min(0).required(),
  costPrice: Joi.number().min(0).required(),
  onHandQty: Joi.number().min(0).optional(),
  reservedQty: Joi.number().min(0).optional(),
  procurementStrategy: Joi.string().valid('MAKE_TO_ORDER', 'MAKE_TO_STOCK').optional(),
  procureOnDemand: Joi.boolean().optional(),
  procurementType: Joi.string().valid('MANUFACTURE', 'PURCHASE', 'SUBCONTRACT').optional()
});

const productUpdateSchema = productSchema.fork(
  Object.keys(productSchema.describe().keys),
  (schema) => schema.optional()
);

// All product routes require authentication
router.use(protect);

router.post(
  '/',
  authorize('ADMIN', 'INVENTORY', 'OWNER'),
  validate(productSchema),
  productController.createProduct
);

router.get('/', productController.getProducts);

router.get('/:id', productController.getProductById);

router.put(
  '/:id',
  authorize('ADMIN', 'INVENTORY', 'OWNER'),
  validate(productUpdateSchema),
  productController.updateProduct
);

router.delete(
  '/:id',
  authorize('ADMIN', 'OWNER'),
  productController.deleteProduct
);

module.exports = router;
