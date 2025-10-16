const config = require('./config/env');
const connectDB = require('./config/db');
const app = require('./app');
const ensureCourseContent = require('./utils/ensureCourseContent');

const startServer = async () => {
  await connectDB();

  try {
    await ensureCourseContent();
  } catch (error) {
    console.error('[server] Failed to ensure course content:', error);
  }

  const server = app.listen(config.port, () => {
    console.log(`[server] Listening on port ${config.port}`);
  });

  const shutdown = (error) => {
    console.error('[server] Shutting down due to error:', error);
    server.close(() => {
      process.exit(1);
    });
  };

  process.on('unhandledRejection', shutdown);
  process.on('uncaughtException', shutdown);
};

startServer();
