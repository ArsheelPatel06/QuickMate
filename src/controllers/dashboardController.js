const dashboardService = require('../services/dashboardService');
const { successResponse } = require('../utils/response');
const { exec } = require('child_process');
const path = require('path');

const getDashboard = async (req, res, next) => {
  try {
    const scope = req.query.scope || 'all';
    // If 'my' scope is requested, pass the authenticated user ID
    const userId = scope === 'my' ? req.user.id : null;
    
    const stats = await dashboardService.getDashboardStats(scope, userId);
    successResponse(res, 200, 'Dashboard statistics retrieved successfully', stats);
  } catch (error) {
    next(error);
  }
};

const seedDatabase = async (req, res, next) => {
  try {
    const seedScriptPath = path.join(__dirname, '../../prisma/seed.js');
    exec(`node "${seedScriptPath}"`, (error, stdout, stderr) => {
      if (error) {
        console.error('Seeding error:', error);
        return res.status(500).json({ success: false, message: 'Seeding failed', error: error.message, stderr });
      }
      successResponse(res, 200, 'Database seeded successfully', { stdout });
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboard,
  seedDatabase
};
