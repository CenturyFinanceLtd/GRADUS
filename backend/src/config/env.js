const dotenv = require('dotenv');

dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';
const port = process.env.PORT ? Number(process.env.PORT) : 5000;
const serverUrl = process.env.SERVER_PUBLIC_URL || `http://localhost:${port}`;
const rawClientOrigins = process.env.CLIENT_URLS || process.env.CLIENT_URL || 'http://localhost:5173';
const clientOrigins = rawClientOrigins
  .split(',')
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);
const sessionSecret = process.env.SESSION_SECRET;
const DEFAULT_SESSION_SECRET = 'gradus_secret';

const config = {
  nodeEnv,
  port,
  serverUrl,
  clientUrl: clientOrigins[0],
  clientOrigins,
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  smtp: {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM,
    deliveryMode: process.env.EMAIL_DELIVERY_MODE || 'live',
  },
  admin: {
    approverEmail: process.env.ADMIN_APPROVER_EMAIL || 'dvisro13@gmail.com',
    portalName: process.env.ADMIN_PORTAL_NAME || 'Gradus Admin Portal',
  },
  sessionSecret: sessionSecret || DEFAULT_SESSION_SECRET,
};

const requiredKeys = ['MONGODB_URI', 'JWT_SECRET'];
if (isProduction) {
  requiredKeys.push('SESSION_SECRET');
}
const smtpKeys = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'];

if ((config.smtp.deliveryMode || 'live') === 'live') {
  requiredKeys.push(...smtpKeys);
}

requiredKeys.forEach((key) => {
  if (!process.env[key]) {
    console.warn(`[config] Warning: environment variable ${key} is not set.`);
  }
});

if (!sessionSecret && isProduction) {
  console.warn(
    '[config] Warning: environment variable SESSION_SECRET is not set. Set this value in production to secure sessions.'
  );
}

module.exports = config;
