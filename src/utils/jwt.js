const jwt = require('jsonwebtoken');
const { envConfig } = require('../config/env');

const generateToken = (id) => {
  return jwt.sign({ id }, envConfig.jwtSecret, {
    expiresIn: envConfig.jwtExpiresIn,
  });
};

module.exports = { generateToken };
