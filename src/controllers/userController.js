const userService = require('../services/userService');
const emailService = require('../services/emailService');
const { successResponse, errorResponse } = require('../utils/responseHelper');

const getUsers = async (req, res, next) => {
  try {
    const users = await userService.getAllUsers();
    return successResponse(res, users);
  } catch (err) {
    next(err);
  }
};

const getUserById = async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.params.id);
    if (!user) return errorResponse(res, 'User not found', 404);
    return successResponse(res, user);
  } catch (err) {
    next(err);
  }
};

const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, department, approvalLimit } = req.body;
    if (!name || !email || !password || !role) {
      return errorResponse(res, 'name, email, password and role are required', 400);
    }
    const user = await userService.createUser({ name, email, password, role, department, approvalLimit });

    // Send welcome email (non-blocking)
    emailService.sendWelcomeEmail({ to: email, name, tempPassword: password }).catch(() => {});

    return successResponse(res, user, 201);
  } catch (err) {
    if (err.message.includes('already exists')) return errorResponse(res, err.message, 409);
    next(err);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const user = await userService.updateUser(req.params.id, req.body);
    return successResponse(res, user);
  } catch (err) {
    next(err);
  }
};

const disableUser = async (req, res, next) => {
  try {
    const user = await userService.disableUser(req.params.id);
    return successResponse(res, user);
  } catch (err) {
    next(err);
  }
};

const enableUser = async (req, res, next) => {
  try {
    const user = await userService.enableUser(req.params.id);
    return successResponse(res, user);
  } catch (err) {
    next(err);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const tempPassword = await userService.resetPassword(req.params.id);
    const user = await userService.getUserById(req.params.id);

    // Email new temp password (non-blocking)
    emailService.sendWelcomeEmail({
      to: user.email,
      name: user.name,
      tempPassword,
    }).catch(() => {});

    return successResponse(res, { message: 'Password reset. Temporary password sent via email.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getUsers, getUserById, createUser, updateUser, disableUser, enableUser, resetPassword };
