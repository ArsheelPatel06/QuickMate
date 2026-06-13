const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const notificationService = require('./notificationService');

/**
 * Determine whether an action requires human approval.
 * Returns { autoApprove: true } or { autoApprove: false, escalateTo: User }
 */
const needsApproval = async (amount, requestingUserId) => {
  const user = await prisma.user.findUnique({
    where: { id: requestingUserId },
    select: { approvalLimit: true, department: true, role: true },
  });

  if (!user) throw new Error('Requesting user not found');

  // Auto-approve if within the user's own approval limit
  if (amount <= user.approvalLimit) {
    return { autoApprove: true };
  }

  // Find a manager (ADMIN or PURCHASE role) in the same department, or any ADMIN
  const manager = await prisma.user.findFirst({
    where: {
      isActive: true,
      id: { not: requestingUserId },
      OR: [
        { role: 'ADMIN' },
        { role: 'PURCHASE', department: user.department ?? undefined },
      ],
    },
    select: { id: true, name: true, email: true, role: true },
  });

  return { autoApprove: false, escalateTo: manager };
};

/**
 * Create a pending approval record and notify the approver.
 */
const createApprovalRequest = async ({
  entityType,
  entityId,
  entityNumber,
  amount,
  requestedById,
  notes = null,
}) => {
  const { autoApprove, escalateTo } = await needsApproval(amount, requestedById);

  const approval = await prisma.pendingApproval.create({
    data: {
      entityType,
      entityId,
      entityNumber,
      amount,
      requestedById,
      notes,
      status: autoApprove ? 'APPROVED' : 'PENDING',
      resolvedAt: autoApprove ? new Date() : null,
    },
  });

  if (!autoApprove && escalateTo) {
    await notificationService.createNotification(
      escalateTo.id,
      'PO_APPROVAL',
      `Approval required: ${entityNumber}`,
      `${entityType.replace('_', ' ')} ${entityNumber} for ₹${amount.toLocaleString()} requires your approval.`,
      `/purchase-orders`
    );
  }

  return { approval, autoApprove, escalateTo };
};

/**
 * Approve a pending request.
 */
const approveRequest = async (approvalId, approvingUserId) => {
  const approval = await prisma.pendingApproval.update({
    where: { id: approvalId },
    data: { status: 'APPROVED', approvedById: approvingUserId, resolvedAt: new Date() },
  });

  // Notify the requester
  await notificationService.createNotification(
    approval.requestedById,
    'APPROVAL_DONE',
    `${approval.entityNumber} approved`,
    `Your ${approval.entityType.replace('_', ' ')} ${approval.entityNumber} has been approved.`,
    null
  );

  return approval;
};

/**
 * Reject a pending request with a reason.
 */
const rejectRequest = async (approvalId, approvingUserId, reason) => {
  const approval = await prisma.pendingApproval.update({
    where: { id: approvalId },
    data: {
      status: 'REJECTED',
      approvedById: approvingUserId,
      reason,
      resolvedAt: new Date(),
    },
  });

  await notificationService.createNotification(
    approval.requestedById,
    'APPROVAL_DONE',
    `${approval.entityNumber} rejected`,
    `Your ${approval.entityType.replace('_', ' ')} ${approval.entityNumber} was rejected. Reason: ${reason}`,
    null
  );

  return approval;
};

const getPendingApprovals = async () => {
  return prisma.pendingApproval.findMany({
    where: { status: 'PENDING' },
    include: {
      requestedBy: { select: { id: true, name: true, email: true, role: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
};

module.exports = {
  needsApproval,
  createApprovalRequest,
  approveRequest,
  rejectRequest,
  getPendingApprovals,
};
