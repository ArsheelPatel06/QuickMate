const approvalService = require('../services/approvalService');
const { successResponse, errorResponse } = require('../utils/responseHelper');

const getPending = async (req, res, next) => {
  try {
    const approvals = await approvalService.getPendingApprovals();
    return successResponse(res, approvals);
  } catch (err) {
    next(err);
  }
};

const approve = async (req, res, next) => {
  try {
    const approval = await approvalService.approveRequest(req.params.id, req.user.id);
    return successResponse(res, approval);
  } catch (err) {
    next(err);
  }
};

const reject = async (req, res, next) => {
  try {
    const { reason } = req.body;
    if (!reason) return errorResponse(res, 'Rejection reason is required', 400);
    const approval = await approvalService.rejectRequest(req.params.id, req.user.id, reason);
    return successResponse(res, approval);
  } catch (err) {
    next(err);
  }
};

module.exports = { getPending, approve, reject };
