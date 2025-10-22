const asyncHandler = require('express-async-handler');
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const User = require('../models/User');

const resolveTokenFromRequest = (req) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    return req.headers.authorization.split(' ')[1];
  }

  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }

  return null;
};

const protect = asyncHandler(async (req, res, next) => {
  const token = resolveTokenFromRequest(req);

  if (!token) {
    res.status(401);
    throw new Error('Not authorized, token missing');
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    const user = await User.findById(decoded.sub).select('-password');

    if (!user) {
      res.status(401);
      throw new Error('User not found');
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401);
    throw new Error('Not authorized, token invalid or expired');
  }
});

const attachUserIfPresent = asyncHandler(async (req, res, next) => {
  const token = resolveTokenFromRequest(req);

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    const user = await User.findById(decoded.sub).select('-password');

    if (user) {
      req.user = user;
    }

    return next();
  } catch (error) {
    // If a token is present but invalid/expired, treat the request as anonymous
    // rather than failing the request. This middleware is intended to be
    // non-blocking and should not turn public routes into 401s when a stale
    // cookie is sent by the browser.
    try {
      if (req.cookies?.token) {
        // Best-effort clear of stale token cookie; ignore failures
        res.clearCookie('token', { path: '/' });
      }
    } catch (_) {
      // no-op
    }
    return next();
  }
});

module.exports = { protect, attachUserIfPresent };
