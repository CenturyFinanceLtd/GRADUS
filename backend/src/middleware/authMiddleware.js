/*
  Hybrid Auth Middleware
  - Supports both legacy JWT tokens and Supabase Auth tokens
  - Verifies tokens and fetches user from database
  - Maintains backward compatibility with existing users
*/
const asyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");
const config = require("../config/env");
const supabase = require("../config/supabase");
const supabaseAdmin = require("../config/supabaseAdmin");

const resolveTokenFromRequest = (req) => {
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    return req.headers.authorization.split(" ")[1];
  }

  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }

  if (req.query && req.query.token) {
    return req.query.token;
  }

  return null;
};

/**
 * Detect if token is Supabase JWT or legacy JWT
 * Supabase JWTs have specific claims like 'aud', 'role', 'sub' with UUID format
 */
const detectTokenType = (token) => {
  try {
    const decoded = jwt.decode(token);
    if (!decoded) return null;

    // Check for Supabase-specific claims
    if (
      decoded.aud === "authenticated" &&
      decoded.role &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        decoded.sub
      )
    ) {
      return "supabase";
    }

    // Legacy JWT
    return "legacy";
  } catch (error) {
    return null;
  }
};

/**
 * Verify Supabase JWT token
 */
const verifySupabaseToken = async (token) => {
  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data.user) {
      return null;
    }
    return data.user;
  } catch (error) {
    console.error("[auth] Supabase token verification failed:", error.message);
    return null;
  }
};

/**
 * Fetch user by ID or Supabase ID
 */
const fetchUser = async (userId, supabaseId = null) => {
  let query = supabase.from("users").select("*");

  if (supabaseId) {
    query = query.eq("supabase_id", supabaseId);
  } else {
    query = query.eq("id", userId);
  }

  const { data: user, error } = await query.single();

  if (error || !user) return null;

  // Map to camelCase for compatibility
  return {
    _id: user.id,
    id: user.id,
    supabaseId: user.supabase_id,
    firstName: user.first_name,
    lastName: user.last_name,
    email: user.email,
    mobile: user.mobile,
    emailVerified: user.email_verified,
    role: user.role,
    authProvider: user.auth_provider,
    personalDetails: user.personal_details,
    parentDetails: user.parent_details,
    educationDetails: user.education_details,
    jobDetails: user.job_details,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
};

/**
 * Authenticate user from token (hybrid: supports both JWT and Supabase)
 */
const authenticateUser = async (token) => {
  const tokenType = detectTokenType(token);

  if (tokenType === "supabase") {
    // Verify Supabase token
    const supabaseUser = await verifySupabaseToken(token);
    if (!supabaseUser) {
      return null;
    }

    // Fetch user from database using supabase_id
    const user = await fetchUser(null, supabaseUser.id);
    return user;
  } else if (tokenType === "legacy") {
    // Verify legacy JWT
    try {
      const decoded = jwt.verify(token, config.jwtSecret);
      const user = await fetchUser(decoded.sub);
      return user;
    } catch (error) {
      return null;
    }
  }

  return null;
};

/**
 * Middleware: Require valid authentication (JWT or Supabase)
 */
const protect = asyncHandler(async (req, res, next) => {
  const token = resolveTokenFromRequest(req);

  if (!token) {
    res.status(401);
    throw new Error("Not authorized, token missing");
  }

  const user = await authenticateUser(token);

  if (!user) {
    res.status(401);
    throw new Error("Not authorized, token invalid or expired");
  }

  req.user = user;
  next();
});

/**
 * Middleware: Attach user if token present, otherwise continue anonymously
 */
const attachUserIfPresent = asyncHandler(async (req, res, next) => {
  const token = resolveTokenFromRequest(req);

  if (!token) {
    return next();
  }

  try {
    const user = await authenticateUser(token);

    if (user) {
      req.user = user;
    }

    return next();
  } catch (error) {
    // Clear stale cookie if present
    try {
      if (req.cookies?.token) {
        res.clearCookie("token", { path: "/" });
      }
    } catch (_) {
      // no-op
    }
    return next();
  }
});

module.exports = { protect, attachUserIfPresent };
