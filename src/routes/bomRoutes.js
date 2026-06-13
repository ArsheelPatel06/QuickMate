const express = require('express');
const router = express.Router();
const bomController = require('../controllers/bomController');
const { protect, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const Joi = require('joi');

const componentSchema = Joi.object({
  productId: Joi.string().required(),
  quantity: Joi.number().min(0.0001).required()
});

const operationSchema = Joi.object({
  operationName: Joi.string().required(),
  durationMinutes: Joi.number().min(0).required(),
  sequence: Joi.number().integer().min(1).required(),
  workCenterId: Joi.string().required()
});

const bomSchema = Joi.object({
  name: Joi.string().required(),
  productId: Joi.string().required(),
  quantity: Joi.number().min(0.0001).required(),
  components: Joi.array().items(componentSchema).min(1).required(),
  operations: Joi.array().items(operationSchema).min(1).required()
});

router.use(protect);

router.post('/', authorize('ADMIN', 'MANUFACTURING', 'OWNER'), validate(bomSchema), bomController.createBom);
router.get('/', bomController.getBoms);
router.get('/:id', bomController.getBomById);
router.put('/:id', authorize('ADMIN', 'MANUFACTURING', 'OWNER'), validate(bomSchema), bomController.updateBom);
router.delete('/:id', authorize('ADMIN', 'MANUFACTURING', 'OWNER'), bomController.deleteBom);
router.get('/:id/explode', bomController.explodeBom);

module.exports = router;
