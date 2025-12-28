/*
  Environment configuration loader
  - Central place for reading and normalizing all process.env values for the LIVE SERVER
  - Provides sensible defaults for local development
  - Emits warnings for missing critical variables
*/
const dotenv = require("dotenv");

dotenv.config();

const nodeEnv = process.env.NODE_ENV || "development";
const isProduction = nodeEnv === "production";
const port = process.env.PORT ? Number(process.env.PORT) : 5000;
const serverUrl =
  process.env.SERVER_PUBLIC_URL ||
  (isProduction ? "https://api.gradusindia.in" : `http://localhost:${port}`);

const trimTrailingSlash = (value) =>
  typeof value === "string" ? value.replace(/\/+$/, "") : value;

// CORS Configuration
const rawClientOrigins =
  process.env.CLIENT_URLS || process.env.CLIENT_URL || "http://localhost:5173";
const clientOrigins = rawClientOrigins
  .split(",")
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);

const DEV_DEFAULT_ORIGINS = ["http://localhost:5173", "http://localhost:5174"];
if (!isProduction) {
  DEV_DEFAULT_ORIGINS.forEach((origin) => {
    if (!clientOrigins.includes(origin)) {
      clientOrigins.push(origin);
    }
  });
}

// Session Configuration
const sessionSecret = process.env.SESSION_SECRET;
const DEFAULT_SESSION_SECRET = "gradus_secret";

const ensureLeadingSlash = (value, fallback = "/") => {
  if (!value || typeof value !== "string") {
    return fallback;
  }
  const normalized = value.startsWith("/") ? value : `/${value}`;
  return normalized.replace(/\/{2,}/g, "/");
};

// LiveKit / WebRTC Configuration
const DEFAULT_LIVE_ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

const parseLiveIceServers = (rawValue) => {
  if (!rawValue || typeof rawValue !== "string") {
    return DEFAULT_LIVE_ICE_SERVERS;
  }
  const trimmed = rawValue.trim();
  if (!trimmed) {
    return DEFAULT_LIVE_ICE_SERVERS;
  }
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.length > 0 ? parsed : DEFAULT_LIVE_ICE_SERVERS;
    }
  } catch (_) {
    // Fallback to comma-separated parsing
  }
  const parsedServers = trimmed
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .map((urls) => ({ urls }));
  return parsedServers.length > 0 ? parsedServers : DEFAULT_LIVE_ICE_SERVERS;
};

const liveSignalingPath = ensureLeadingSlash(
  process.env.LIVE_SIGNALING_PATH || "/live-signaling"
);
const liveIceServers = parseLiveIceServers(process.env.LIVE_WEBRTC_ICE_SERVERS);

const config = {
  nodeEnv,
  port,
  serverUrl,
  clientUrl: clientOrigins[0],
  clientOrigins,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  live: {
    signalingPath: liveSignalingPath,
    iceServers: liveIceServers,
  },
  sessionSecret: sessionSecret || DEFAULT_SESSION_SECRET,
};

// Validation
const requiredKeys = ["JWT_SECRET", "SUPABASE_URL", "SUPABASE_SERVICE_KEY"];
if (isProduction) {
  requiredKeys.push("SESSION_SECRET");
}

requiredKeys.forEach((key) => {
  if (!process.env[key]) {
    console.warn(`[config] Warning: environment variable ${key} is not set.`);
  }
});

if (!sessionSecret && isProduction) {
  console.warn(
    "[config] Warning: environment variable SESSION_SECRET is not set. Set this value in production to secure sessions."
  );
}

module.exports = config;
