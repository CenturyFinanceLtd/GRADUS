/*
  Express application bootstrap
  - Configures dev-only CORS (production CORS is handled by reverse proxy)
  - Parses JSON/urlencoded bodies, cookies, and attaches an HTTP session
  - Serves static assets needed by the app (frontend)
  - Mounts feature routes (ONLY LIVE CLASSES RETAINED)
  - Registers 404 and centralized error handlers
*/
const express = require("express");
const path = require("path");
const http = require("http");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const config = require("./config/env");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");
const liveRoutes = require("./live/routes");

const app = express();
app.set("trust proxy", 1); // Trust first proxy (Nginx)

// Allowed CORS methods/headers and a strict origin allow‑list
const corsOptions = {
  origin(origin, callback) {
    if (
      !origin ||
      (config.clientOrigins && config.clientOrigins.includes(origin))
    ) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: ${origin} is not an allowed origin`));
    }
  },
  credentials: true,
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

// In production, rely on the reverse proxy (Nginx/Cloudflare) to set CORS.
// Enabling Express CORS in production can emit duplicate CORS headers.
if (config.nodeEnv !== "production") {
  app.use(
    cors({
      origin: true, // reflect request origin for local dev
      credentials: true,
      methods: corsOptions.methods,
      allowedHeaders: corsOptions.allowedHeaders,
    })
  );
}

// Core middleware: body parsers, cookies, lightweight session
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Security Middleware
app.use(helmet());

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10000,
});
app.use("/api", limiter);

app.use(cookieParser());
const sessionOptions = {
  secret: config.sessionSecret || "gradus_secret",
  resave: false,
  saveUninitialized: true,
  cookie: {
    // Session cookie lifetime (24h). For production, consider SameSite/Lax and Secure behind HTTPS.
    maxAge: 1000 * 60 * 60 * 24,
  },
};

if (config.nodeEnv === "production") {
  console.log("[session] Using default in-memory store for sessions.");
}

app.use(session(sessionOptions));

// Simple health check for uptime monitoring and orchestration
app.get("/api/health", (req, res) => {
  const config = require("./config/env");
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "backend-live-only",
  });
});

// Route mounts
// ONLY Live Routes are retained as other features are migrated to Supabase Edge Functions.
app.use("/api/live", liveRoutes);

// Serve Static Frontend Files (Must be after API routes)
const frontendPath = path.join(__dirname, "../../frontend/dist");

// Serve built assets with aggressive caching; index will be handled separately
app.use(
  express.static(frontendPath, {
    maxAge: "1y",
    index: false,
    immutable: true,
  })
);

// SPA Fallback: Serve index.html for any unknown route NOT starting with /api
app.get(/.*/, (req, res, next) => {
  if (req.path.startsWith("/api")) {
    return next();
  }
  // Always serve the latest HTML to avoid stale chunk references in browsers/CDNs
  res.set("Cache-Control", "no-store");
  res.sendFile(path.join(frontendPath, "index.html"));
});

// 404 and error handling (must be last)
app.use(notFound);
app.use(errorHandler);

module.exports = app;
