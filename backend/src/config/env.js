const dotenv = require('dotenv');

dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';
const port = process.env.PORT ? Number(process.env.PORT) : 5000;
const serverUrl =
  process.env.SERVER_PUBLIC_URL || (isProduction ? 'https://api.gradusindia.in' : `http://localhost:${port}`);
const trimTrailingSlash = (value) => (typeof value === 'string' ? value.replace(/\/+$/, '') : value);
const LIVE_ADMIN_API_BASE = 'https://api.gradusindia.in/api/admin';

const buildDefaultAdminApiBase = () => {
  if (process.env.ADMIN_API_PUBLIC_BASE_URL) {
    return trimTrailingSlash(process.env.ADMIN_API_PUBLIC_BASE_URL);
  }

  if (nodeEnv === 'production') {
    return LIVE_ADMIN_API_BASE;
  }

  return `${trimTrailingSlash(serverUrl)}/api/admin`;
};
const adminApiBaseUrl = buildDefaultAdminApiBase();
const adminApprovalBaseUrl = trimTrailingSlash(
  process.env.ADMIN_APPROVAL_BASE_URL || (nodeEnv === 'production' ? adminApiBaseUrl : LIVE_ADMIN_API_BASE)
);
const rawClientOrigins = process.env.CLIENT_URLS || process.env.CLIENT_URL || 'http://localhost:5173';
const clientOrigins = rawClientOrigins
  .split(',')
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);

const DEV_DEFAULT_ORIGINS = ['http://localhost:5173', 'http://localhost:5174'];
if (!isProduction) {
  DEV_DEFAULT_ORIGINS.forEach((origin) => {
    if (!clientOrigins.includes(origin)) {
      clientOrigins.push(origin);
    }
  });
}
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
  liveClass: {
    defaultProvider: (process.env.LIVE_MEETING_DEFAULT_PROVIDER || 'teams').toLowerCase(),
    teams: {
      tenantId: process.env.TEAMS_TENANT_ID,
      clientId: process.env.TEAMS_CLIENT_ID,
      clientSecret: process.env.TEAMS_CLIENT_SECRET,
      organizerUserId: process.env.TEAMS_ORGANIZER_USER_ID || process.env.TEAMS_USER_ID,
    },
    zoom: {
      accountId: process.env.ZOOM_ACCOUNT_ID,
      clientId: process.env.ZOOM_CLIENT_ID,
      clientSecret: process.env.ZOOM_CLIENT_SECRET,
      userId: process.env.ZOOM_USER_ID,
    },
    recordingBucket: process.env.LIVE_CLASS_RECORDING_BUCKET || '',
  },
  admin: {
    approverEmail: process.env.ADMIN_APPROVER_EMAIL || 'dvisro13@gmail.com',
    portalName: process.env.ADMIN_PORTAL_NAME || 'Gradus Admin Portal',
    approvalBaseUrl: adminApprovalBaseUrl,
  },
  adminApiBaseUrl,
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

const { liveClass } = config;
if (liveClass.defaultProvider === 'teams') {
  const missingTeamsKeys = ['tenantId', 'clientId', 'clientSecret', 'organizerUserId'].filter(
    (key) => !liveClass.teams[key]
  );
  if (missingTeamsKeys.length) {
    console.warn(
      `[config] Warning: Missing Microsoft Teams credentials (${missingTeamsKeys.join(', ')}) required for automatic meeting creation.`
    );
  }
}

if (liveClass.defaultProvider === 'zoom') {
  const missingZoomKeys = ['accountId', 'clientId', 'clientSecret', 'userId'].filter(
    (key) => !liveClass.zoom[key]
  );
  if (missingZoomKeys.length) {
    console.warn(
      `[config] Warning: Missing Zoom credentials (${missingZoomKeys.join(', ')}) required for automatic meeting creation.`
    );
  }
}

module.exports = config;
