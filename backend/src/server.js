const http = require('http');
const config = require('./config/env');
const connectDB = require('./config/db');
const app = require('./app');
const ensureCourseContent = require('./utils/ensureCourseContent');
const ensureLiveSessionIndexes = require('./utils/ensureLiveSessionIndexes');
const { initSocket } = require('./realtime/socket');

const startServer = async () => {
  await connectDB();

  try {
    await ensureCourseContent();
  } catch (error) {
    console.error('[server] Failed to ensure course content:', error);
  }

  try {
    await ensureLiveSessionIndexes();
  } catch (error) {
    console.warn('[server] Failed to ensure live session indexes:', error.message);
  }

  const httpServer = http.createServer(app);
  initSocket(httpServer);

  httpServer.listen(config.port, () => {
    console.log(`[server] Listening on port ${config.port}`);
  });

  const shutdown = (error) => {
    console.error('[server] Shutting down due to error:', error);
    httpServer.close(() => {
      process.exit(1);
    });
  };

  process.on('unhandledRejection', shutdown);
  process.on('uncaughtException', shutdown);
};

startServer();
