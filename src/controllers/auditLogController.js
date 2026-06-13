const auditLogService = require('../services/auditLogService');
const { successResponse } = require('../utils/response');

const getAuditLogs = async (req, res, next) => {
  try {
    const { page, limit, entity, startDate, endDate, userId, action } = req.query;
    const filters = { entity, startDate, endDate, userId, action };
    
    const result = await auditLogService.getAuditLogs(filters, page, limit);
    successResponse(res, 200, 'Audit logs retrieved successfully', result);
  } catch (error) {
    next(error);
  }
};

module.exports = { getAuditLogs };
