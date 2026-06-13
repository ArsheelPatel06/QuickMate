const { errorResponse } = require('../utils/response');

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
  
  if (error) {
    const errors = error.details.map((detail) => detail.message);
    return errorResponse(res, 400, 'Validation Error', errors);
  }
  
  next();
};

module.exports = { validate };
