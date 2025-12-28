/*
  Hybrid Admin Auth Middleware
  - Supports both legacy JWT tokens and Supabase Auth tokens
  - Verifies admin role and status
  - Maintains backward compatibility
*/
const asyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");
const config = require("../config/env");
const adminUserService = require("../services/adminUserService");
const supabaseAdmin = require("../config/supabaseAdmin");

const normalizeRole = (role) => (role ? String(role).toLowerCase() : "");

/**
 * Detect token type (Supabase vs Legacy JWT)
 */
const detectTokenType = (token) => {
  try {
    const decoded = jwt.decode(token);
    if (!decoded) return null;

    if (
      decoded.aud === "authenticated" &&
      decoded.role &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        decoded.sub
      )
    ) {
      return "supabase";
    }

    return "legacy";
  } catch (error) {
    return null;
  }
};

/**
 * Verify Supabase token and fetch admin by supabase_id
 */
const verifySupabaseAdmin = async (token) => {
  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data.user) {
      return null;
    }

    // Fetch admin by supabase_id
    const admin = await adminUserService.getAdminBySupabaseId(data.user.id);
    return admin;
  } catch (error) {
    console.error(
      "[admin-auth] Supabase token verification failed:",
      error.message
    );
    return null;
  }
};

/**
 * Protect admin routes with hybrid authentication
 */
const protectAdmin = asyncHandler(async (req, res, next) => {
  let token = null;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    res.status(401);
    throw new Error("Not authorized, token missing");
  }

  const tokenType = detectTokenType(token);
  let admin = null;

  if (tokenType === "supabase") {
    admin = await verifySupabaseAdmin(token);
  } else if (tokenType === "legacy") {
    try {
      const decoded = jwt.verify(token, config.jwtSecret);
      admin = await adminUserService.getAdminById(decoded.sub);
    } catch (error) {
      res.status(401);
      throw new Error("Not authorized, token invalid or expired");
    }
  }

  if (!admin) {
    res.status(401);
    throw new Error("Admin account not found");
  }

  if (admin.status && admin.status !== "active") {
    res.status(403);
    throw new Error(
      "Your admin account is inactive. Please contact a Programmer(Admin)."
    );
  }

  req.admin = admin;
  next();
});

const EMAIL_ACCESS_WHITELIST = Array.isArray(config.admin?.emailAccessUsers)
  ? config.admin.emailAccessUsers.map((email) => email.toLowerCase())
  : [];

const requireAdminRole =
  (...roles) =>
  (req, res, next) => {
    const allowedRoles = roles.map((role) => normalizeRole(role));
    const currentRole = normalizeRole(req.admin?.role);

    if (allowedRoles.includes(currentRole)) {
      next();
      return;
    }

    res.status(403);
    throw new Error("You do not have permission to perform this action.");
  };

const requireProgrammerEmailAccess = (req, res, next) => {
  const currentRole = normalizeRole(req.admin?.role);
  const email = (req.admin?.email || "").toLowerCase();

  if (
    currentRole === "programmer_admin" &&
    EMAIL_ACCESS_WHITELIST.includes(email)
  ) {
    next();
    return;
  }

  res.status(403);
  throw new Error("You do not have permission to perform this action.");
};

module.exports = {
  protectAdmin,
  requireAdminRole,
  requireProgrammerEmailAccess,
};
