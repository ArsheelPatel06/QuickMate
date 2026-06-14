const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { errorResponse } = require('../utils/response');
const { envConfig } = require('../config/env');
const { getFirebaseAdmin, getFirebaseAuth } = require('../config/firebase');

/**
 * Auth middleware — supports two modes:
 *
 * 1. Firebase ID Token  (when Firebase is configured)
 *    Header: Authorization: Bearer <firebase-id-token>
 *    → Verifies with Firebase Admin SDK
 *    → Finds user in DB by firebaseUid
 *
 * 2. Legacy JWT  (fallback when Firebase is not yet configured)
 *    Header: Authorization: Bearer <jwt>
 *    → Verifies with JWT_SECRET
 *    → Finds user in DB by id
 */
const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return errorResponse(res, 401, 'Not authorized, no token');
  }

  const token = authHeader.split(' ')[1];
  const firebaseApp = getFirebaseAdmin();

  // ── Mode 1: Firebase (when configured) ────────────────────────────────────
  if (firebaseApp) {
    try {
      const decoded = await getFirebaseAuth().verifyIdToken(token);

      let user = await prisma.user.findUnique({
        where: { firebaseUid: decoded.uid },
        select: { id: true, email: true, role: true, name: true, department: true, approvalLimit: true, isActive: true },
      });

      if (!user) {
        return errorResponse(res, 401, 'User account not found. Please contact your administrator.');
      }

      if (!user.isActive) {
        return errorResponse(res, 403, 'Account disabled. Contact administrator.');
      }

      req.user = user;
      req.firebaseUid = decoded.uid;
      return next();
    } catch {
      // Fall through to JWT — supports seeded demo login alongside Firebase UI auth
    }
  }

  // ── Mode 2: Legacy JWT ────────────────────────────────────────────────────
  try {
    const decoded = jwt.verify(token, envConfig.jwtSecret);
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, role: true, name: true, department: true, approvalLimit: true, isActive: true },
    });

    if (!user) return errorResponse(res, 401, 'User not found');
    if (!user.isActive) return errorResponse(res, 403, 'Account disabled');

    req.user = user;
    return next();
  } catch {
    return errorResponse(res, 401, 'Not authorized, token failed');
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return errorResponse(res, 403, `Role '${req.user.role}' cannot access this resource`);
  }
  next();
};

module.exports = { protect, authorize };
