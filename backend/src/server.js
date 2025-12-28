/*
  HTTP server entrypoint
  - Starts the Express app (Live Server)
  - Wires graceful shutdown on fatal errors
*/
const http = require("http");
const config = require("./config/env");
const app = require("./app");
const { attachLiveSignalingServer } = require("./live/signalingServer");

const startServer = async () => {
  // Start HTTP server
  const server = http.createServer(app);

  // Attach LiveKit Signaling Server (WebSocket)
  attachLiveSignalingServer(server);

  // LiveKit Integration Check
  if (
    process.env.LIVEKIT_API_KEY &&
    process.env.LIVEKIT_API_SECRET &&
    process.env.LIVEKIT_URL
  ) {
    console.log(`[livekit] Configured with URL: ${process.env.LIVEKIT_URL}`);
  } else {
    // Only warn if we expect LiveKit to be active
    console.log("[livekit] LiveKit configuration not present.");
  }

  server.listen(config.port, () => {
    console.log(`[server] Listening on port ${config.port}`);
    console.log(
      `[server] Live Class Signaling active on ${config.live.signalingPath}`
    );
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
