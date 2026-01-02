/*
  HTTP server entrypoint
  - Starts the Express app
  - Wires graceful shutdown on fatal errors
*/
const http = require("http");
const config = require("./config/env");
const app = require("./app");

const startServer = async () => {
  // Start HTTP server
  const server = http.createServer(app);

  // 100ms Integration Check
  if (process.env.HMS_ACCESS_KEY && process.env.HMS_SECRET) {
    console.log(`[100ms] Configured and ready`);
  } else {
    console.log("[100ms] HMS credentials not configured.");
  }

  server.listen(config.port, () => {
    console.log(`[server] Listening on port ${config.port}`);
  });

  const shutdown = (error) => {
    console.error("[server] Shutting down due to error:", error);
    server.close(() => {
      process.exit(1);
    });
  };

  // Fail fast on unexpected errors to avoid undefined state
  process.on("unhandledRejection", shutdown);
  process.on("uncaughtException", shutdown);
};

startServer();
