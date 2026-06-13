const authService = require('../services/authService');
const { successResponse, errorResponse } = require('../utils/response');

const register = async (req, res, next) => {
  try {
    const { email, password, name, role } = req.body;
    const { user, token } = await authService.registerUser(email, password, name, role);
    
    successResponse(res, 201, 'User registered successfully', { user, token });
  } catch (error) {
    if (error.message === 'User already exists') {
        return errorResponse(res, 400, error.message);
    }
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { user, token } = await authService.loginUser(email, password);
    
    successResponse(res, 200, 'User logged in successfully', { user, token });
  } catch (error) {
    if (error.message === 'Invalid credentials') {
        return errorResponse(res, 401, error.message);
    }
    next(error);
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

module.exports = {
  register,
  login,
  getUsers
};
