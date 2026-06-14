const authService = require('../services/authService');
const { successResponse, errorResponse } = require('../utils/response');
const { getFirebaseAdmin, getFirebaseAuth } = require('../config/firebase');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const register = async (req, res, next) => {
  try {
    const { email, password, name, role } = req.body;
    const { user, token } = await authService.registerUser(email, password, name, role);
    successResponse(res, 201, 'User registered successfully', { user, token });
  } catch (error) {
    if (error.message === 'User already exists') return errorResponse(res, 400, error.message);
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { user, token } = await authService.loginUser(email, password);
    successResponse(res, 200, 'User logged in successfully', { user, token });
  } catch (error) {
    if (error.message === 'Invalid credentials') return errorResponse(res, 401, error.message);
    next(error);
  }
};

/**
 * POST /api/v1/auth/sync
 *
 * Called by the frontend immediately after Firebase sign-in / sign-up.
 * Body: { idToken, name?, role? }
 *
 * Flow:
 *  1. Verify Firebase ID token
 *  2. Find existing DB user by firebaseUid  →  return it
 *  3. If not found, find by email (existing seeded user)  →  link firebaseUid
 *  4. If still not found, create new DB user (first user = ADMIN, rest = SALES)
 */
const syncFirebaseUser = async (req, res, next) => {
  const firebaseApp = getFirebaseAdmin();
  if (!firebaseApp) {
    return errorResponse(res, 503, 'Firebase is not configured on this server');
  }

  try {
    const { idToken, name, role } = req.body;
    if (!idToken) return errorResponse(res, 400, 'idToken is required');

    // Verify Firebase token
    const decoded = await getFirebaseAuth().verifyIdToken(idToken);
    const { uid, email } = decoded;

    // 1. Already linked?
    let user = await prisma.user.findUnique({ where: { firebaseUid: uid } });

    // 2. Existing seed user with same email? Link them.
    if (!user && email) {
      user = await prisma.user.findUnique({ where: { email } });
      if (user) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { firebaseUid: uid },
        });
      }
    }

    // 3. Brand new user — create in DB
    if (!user) {
      const existingCount = await prisma.user.count();
      const assignedRole = role || (existingCount === 0 ? 'ADMIN' : 'SALES');
      user = await prisma.user.create({
        data: {
          email,
          name:        name || email.split('@')[0],
          firebaseUid: uid,
          passwordHash: '', // not used with Firebase
          role:         assignedRole,
          isActive:     true,
        },
      });
    }

    if (!user.isActive) {
      return errorResponse(res, 403, 'Account has been disabled. Contact administrator.');
    }

    const { passwordHash, ...safeUser } = user;
    successResponse(res, 200, 'User synced', { user: safeUser });
  } catch (err) {
    if (err.code?.startsWith('auth/')) {
      return errorResponse(res, 401, 'Invalid Firebase token');
    }
    next(err);
  }
};

const getUsers = async (req, res, next) => {
  try {
    const users = await authService.getAllUsers();
    successResponse(res, 200, 'Users retrieved successfully', users);
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, syncFirebaseUser, getUsers };
