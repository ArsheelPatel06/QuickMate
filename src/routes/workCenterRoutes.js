const express = require('express');
const router = express.Router();
const wcController = require('../controllers/workCenterController');
const { protect, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const Joi = require('joi');

const wcSchema = Joi.object({
  name: Joi.string().required(),
  code: Joi.string().required(),
  description: Joi.string().optional().allow(null, ''),
  isActive: Joi.boolean().optional()
});

router.use(protect);
router.post('/', authorize('ADMIN', 'MANUFACTURING', 'OWNER'), validate(wcSchema), wcController.createWorkCenter);
router.get('/', authorize('ADMIN', 'MANUFACTURING', 'OWNER', 'INVENTORY'), wcController.getWorkCenters);
router.get('/:id', authorize('ADMIN', 'MANUFACTURING', 'OWNER', 'INVENTORY'), wcController.getWorkCenterById);
router.put('/:id', authorize('ADMIN', 'MANUFACTURING', 'OWNER'), validate(wcSchema), wcController.updateWorkCenter);
router.delete('/:id', authorize('ADMIN', 'OWNER'), wcController.deleteWorkCenter);

module.exports = router;
