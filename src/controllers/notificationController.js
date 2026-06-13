const notificationService = require('../services/notificationService');
const { successResponse, errorResponse } = require('../utils/responseHelper');

const getMyNotifications = async (req, res, next) => {
  try {
    const notifications = await notificationService.getUserNotifications(req.user.id);
    const unread = await notificationService.getUnreadCount(req.user.id);
    return successResponse(res, { notifications, unreadCount: unread });
  } catch (err) {
    next(err);
  }
};

const markRead = async (req, res, next) => {
  try {
    await notificationService.markAsRead(req.params.id, req.user.id);
    return successResponse(res, { message: 'Marked as read' });
  } catch (err) {
    next(err);
  }
};

const markAllRead = async (req, res, next) => {
  try {
    await notificationService.markAllRead(req.user.id);
    return successResponse(res, { message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getMyNotifications, markRead, markAllRead };
