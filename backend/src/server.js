/*
  HTTP server entrypoint
  - Connects to MongoDB
  - Performs one-time/data-ensuring tasks (e.g., default course content)
  - Starts the Express app and wires graceful shutdown on fatal errors
*/
const http = require('http');
const config = require('./config/env');
const connectDB = require('./config/db');
const app = require('./app');
const ensureCourseContent = require('./utils/ensureCourseContent');
const startLiveSfu = require('./liveSfu');

const startServer = async () => {
  await connectDB();

  try {
    await ensureCourseContent();
  } catch (error) {
    console.error('[server] Failed to ensure course content:', error);
  }

  // Start HTTP server
  const server = http.createServer(app);
  startLiveSfu(server);

  server.listen(config.port, () => {
    console.log(`[server] Listening on port ${config.port}`);
  });

  const shutdown = (error) => {
    console.error('[server] Shutting down due to error:', error);
    server.close(() => {
      process.exit(1);
    });
  };

  // Fail fast on unexpected errors to avoid undefined state
  process.on('unhandledRejection', shutdown);
  process.on('uncaughtException', shutdown);
};

startServer();
