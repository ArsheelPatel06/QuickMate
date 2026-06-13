const express = require('express');
const router = express.Router();
const { successResponse } = require('../utils/response');

router.get('/', (req, res) => {
  successResponse(res, 200, 'Server is healthy', {
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

module.exports = router;
