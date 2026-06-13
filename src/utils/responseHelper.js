/**
 * Thin wrapper with a simplified signature:
 *   successResponse(res, data, statusCode = 200)
 *   errorResponse(res, message, statusCode = 400)
 */
const successResponse = (res, data, statusCode = 200) => {
  return res.status(statusCode).json({ success: true, data });
};

const errorResponse = (res, message, statusCode = 400) => {
  return res.status(statusCode).json({ success: false, message });
};

module.exports = { successResponse, errorResponse };
