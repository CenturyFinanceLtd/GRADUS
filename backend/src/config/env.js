/*
  Environment configuration loader
  - Central place for reading and normalizing all process.env values
  - Provides sensible defaults for local development
  - Emits warnings for missing critical variables
*/
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

const DEFAULT_ADMIN_INBOXES = [
  { email: 'contact@gradusindia.in', displayName: 'Contact' },
  { email: 'admin@gradusindia.in', displayName: 'Admin' },
  { email: 'no-reply@gradusindia.in', displayName: 'No Reply' },
  { email: 'hr@gradusindia.in', displayName: 'HR' },
  { email: 'hrishant.singh@gradusindia.in', displayName: 'HRishant' },
];

const parseAdminMailboxes = (rawValue) => {
  if (!rawValue || typeof rawValue !== 'string') {
    return [];
  }

  const seen = new Set();
  return rawValue
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .map((entry) => {
      const [emailPart, labelPart] = entry.split(':');
      const normalizedEmail = (emailPart || '').trim().toLowerCase();
      if (!normalizedEmail) {
        return null;
      }
      const displayNameRaw = (labelPart || emailPart || '').trim();
      const displayName = displayNameRaw || normalizedEmail;
      if (seen.has(normalizedEmail)) {
        return null;
      }
      seen.add(normalizedEmail);
      return { email: normalizedEmail, displayName };
    })
    .filter(Boolean);
};

const adminMailboxes = parseAdminMailboxes(process.env.ADMIN_GMAIL_INBOXES);
const delegatedInboxes = adminMailboxes.length > 0 ? adminMailboxes : DEFAULT_ADMIN_INBOXES;

const config = {
  nodeEnv,
  port,
  serverUrl,
  clientUrl: clientOrigins[0],
  clientOrigins,
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  payments: {
    razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
    razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || '',
    enableSandbox: (process.env.RAZORPAY_SANDBOX || 'true').toLowerCase() !== 'false',
    gstRate: process.env.GST_RATE ? Number(process.env.GST_RATE) : 0.18,
  },
  smtp: {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM,
    deliveryMode: process.env.EMAIL_DELIVERY_MODE || 'live',
    useWorkspaceOAuth: (process.env.SMTP_USE_WORKSPACE_OAUTH || 'false').toLowerCase() === 'true',
    workspaceSendAs: process.env.SMTP_WORKSPACE_SEND_AS || process.env.SMTP_USER,
  },
  admin: {
    approverEmail: process.env.ADMIN_APPROVER_EMAIL || 'dvisro13@gmail.com',
    portalName: process.env.ADMIN_PORTAL_NAME || 'Gradus Admin Portal',
    approvalBaseUrl: adminApprovalBaseUrl,
  },
  gmail: {
    delegatedInboxes,
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

module.exports = config;
