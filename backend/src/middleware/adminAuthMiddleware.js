const asyncHandler = require('express-async-handler');
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const AdminUser = require('../models/AdminUser');

const protectAdmin = asyncHandler(async (req, res, next) => {
  let token = null;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    res.status(401);
    throw new Error('Not authorized, token missing');
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    const admin = await AdminUser.findById(decoded.sub).select('-password');

    if (!admin) {
      res.status(401);
      throw new Error('Admin account not found');
    }

    req.admin = admin;
    next();
  } catch (error) {
    res.status(401);
    throw new Error('Not authorized, token invalid or expired');
  }
});

module.exports = { protectAdmin };