/*
  Admin auth middleware
  - protectAdmin: require admin JWT and ensure account is active
  - requireAdminRole: enforce role-based authorization for admin endpoints
*/
const asyncHandler = require('express-async-handler');
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const AdminUser = require('../models/AdminUser');

const normalizeRole = (role) => (role ? String(role).toLowerCase() : '');

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

    if (admin.status && admin.status !== 'active') {
      res.status(403);
      throw new Error('Your admin account is inactive. Please contact a Programmer(Admin).');
    }

    req.admin = admin;
    next();
  } catch (error) {
    res.status(401);
    throw new Error('Not authorized, token invalid or expired');
  }
});

const EMAIL_ACCESS_WHITELIST = Array.isArray(config.admin?.emailAccessUsers)
  ? config.admin.emailAccessUsers.map((email) => email.toLowerCase())
  : [];

const requireAdminRole = (...roles) => (req, res, next) => {
  const allowedRoles = roles.map((role) => normalizeRole(role));
  const currentRole = normalizeRole(req.admin?.role);

  if (allowedRoles.includes(currentRole)) {
    next();
    return;
  }

  res.status(403);
  throw new Error('You do not have permission to perform this action.');
};

const requireProgrammerEmailAccess = (req, res, next) => {
  const currentRole = normalizeRole(req.admin?.role);
  const email = (req.admin?.email || '').toLowerCase();

  if (currentRole === 'programmer_admin' && EMAIL_ACCESS_WHITELIST.includes(email)) {
    next();
    return;
  }

  res.status(403);
  throw new Error('You do not have permission to perform this action.');
};

module.exports = { protectAdmin, requireAdminRole, requireProgrammerEmailAccess };
