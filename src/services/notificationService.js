const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Create a notification for a specific user.
 * Fire-and-forget safe — caller should not await if non-critical.
 */
const createNotification = async (userId, type, title, body, link = null) => {
  try {
    return await prisma.notification.create({
      data: { userId, type, title, body, link },
    });
  } catch (err) {
    console.error('[NotificationService] Failed to create notification:', err.message);
  }
};

/**
 * Create the same notification for multiple users at once.
 */
const broadcastNotification = async (userIds, type, title, body, link = null) => {
  try {
    const data = userIds.map(userId => ({ userId, type, title, body, link }));
    return await prisma.notification.createMany({ data });
  } catch (err) {
    console.error('[NotificationService] Failed to broadcast:', err.message);
  }
};

/**
 * Get all notifications for a user (unread first, capped at 50).
 */
const getUserNotifications = async (userId) => {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: [{ read: 'asc' }, { createdAt: 'desc' }],
    take: 50,
  });
};

/**
 * Count unread notifications for the bell badge.
 */
const getUnreadCount = async (userId) => {
  return prisma.notification.count({ where: { userId, read: false } });
};

const markAsRead = async (notificationId, userId) => {
  return prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { read: true },
  });
};

const markAllRead = async (userId) => {
  return prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
};

/**
 * Find users who have a given role — useful for targeting department managers.
 */
const getUsersByRole = async (role) => {
  return prisma.user.findMany({
    where: { role, isActive: true },
    select: { id: true, name: true, email: true },
  });
};

module.exports = {
  createNotification,
  broadcastNotification,
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllRead,
  getUsersByRole,
};
