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

const ensureLeadingSlash = (value, fallback = '/') => {
  if (!value || typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.startsWith('/') ? value : `/${value}`;
  return normalized.replace(/\/{2,}/g, '/');
};

const DEFAULT_LIVE_ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

const parseLiveIceServers = (rawValue) => {
  if (!rawValue || typeof rawValue !== 'string') {
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
    // Fallback to comma-separated parsing below
  }

  const parsedServers = trimmed
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .map((urls) => ({ urls }));

  return parsedServers.length > 0 ? parsedServers : DEFAULT_LIVE_ICE_SERVERS;
};

const liveSignalingPath = ensureLeadingSlash(process.env.LIVE_SIGNALING_PATH || '/live-signaling');
const liveIceServers = parseLiveIceServers(process.env.LIVE_WEBRTC_ICE_SERVERS);

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
const parseEmailList = (rawValue) =>
  (rawValue || '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0);
const adminEmailAccessUsers = parseEmailList(process.env.ADMIN_EMAIL_ACCESS_USERS);

const normalizeSmtpPassword = (rawValue) => {
  if (typeof rawValue !== 'string') {
    return rawValue;
  }

  const trimmed = rawValue.trim();
  if (!trimmed.includes(' ')) {
    return trimmed;
  }

  const compact = trimmed.replace(/\s+/g, '');
  if (/^[A-Za-z0-9]{16}$/.test(compact)) {
    console.warn(
      '[config] SMTP_PASS appears to be a Gmail app password with spaces. Normalizing it by removing whitespace.'
    );
    return compact;
  }

  return trimmed;
};

const resolveSmtpLoginUser = () => {
  const envLogin = process.env.SMTP_LOGIN_USER || process.env.SMTP_WORKSPACE_IMPERSONATE_EMAIL;
  if (envLogin && envLogin.trim()) {
    return envLogin.trim();
  }
  return process.env.SMTP_USER;
};

const resolveWorkspaceImpersonate = (loginUser) => {
  const explicit = process.env.SMTP_WORKSPACE_IMPERSONATE_EMAIL;
  if (explicit && explicit.trim()) {
    return explicit.trim();
  }
  return loginUser;
};

const smtpLoginUser = resolveSmtpLoginUser();
const smtpWorkspaceImpersonate = resolveWorkspaceImpersonate(smtpLoginUser);
const baseSmtpPassword = normalizeSmtpPassword(process.env.SMTP_PASS);
const defaultFromAddress =
  process.env.SMTP_FROM || (process.env.SMTP_USER ? `Gradus <${process.env.SMTP_USER}>` : '');
const verificationFromAddress = process.env.SMTP_FROM_VERIFICATION || defaultFromAddress;
const registrationFromAddress = process.env.SMTP_FROM_REGISTRATION || defaultFromAddress;
const trimOrNull = (value) => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

const buildSmtpAccount = ({ loginKey, passKey, impersonateKey }) => {
  const loginOverride = trimOrNull(process.env[loginKey]);
  const passOverride =
    typeof process.env[passKey] === 'string' ? normalizeSmtpPassword(process.env[passKey]) : null;
  const impersonateOverride = trimOrNull(process.env[impersonateKey]);

  const loginUser = loginOverride || smtpLoginUser;
  const pass = passOverride || baseSmtpPassword;
  const workspaceImpersonate = impersonateOverride || loginOverride || smtpWorkspaceImpersonate;

  return { loginUser, pass, workspaceImpersonate };
};

const smtpAccounts = {
  default: {
    loginUser: smtpLoginUser,
    pass: baseSmtpPassword,
    workspaceImpersonate: smtpWorkspaceImpersonate,
  },
  verification: buildSmtpAccount({
    loginKey: 'SMTP_VERIFICATION_LOGIN_USER',
    passKey: 'SMTP_VERIFICATION_PASS',
    impersonateKey: 'SMTP_VERIFICATION_WORKSPACE_IMPERSONATE_EMAIL',
  }),
  registration: buildSmtpAccount({
    loginKey: 'SMTP_REGISTRATION_LOGIN_USER',
    passKey: 'SMTP_REGISTRATION_PASS',
    impersonateKey: 'SMTP_REGISTRATION_WORKSPACE_IMPERSONATE_EMAIL',
  }),
};

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
    loginUser: smtpLoginUser,
    workspaceImpersonate: smtpWorkspaceImpersonate,
    pass: baseSmtpPassword,
    from: defaultFromAddress,
    verificationFrom: verificationFromAddress,
    registrationFrom: registrationFromAddress,
    deliveryMode: process.env.EMAIL_DELIVERY_MODE || 'live',
    useWorkspaceOAuth: (process.env.SMTP_USE_WORKSPACE_OAUTH || 'false').toLowerCase() === 'true',
    workspaceSendAs: process.env.SMTP_WORKSPACE_SEND_AS || process.env.SMTP_USER,
    accounts: smtpAccounts,
  },
  admin: {
    approverEmail: process.env.ADMIN_APPROVER_EMAIL || 'dvisro13@gmail.com',
    portalName: process.env.ADMIN_PORTAL_NAME || 'Gradus Admin Portal',
    approvalBaseUrl: adminApprovalBaseUrl,
    emailAccessUsers: adminEmailAccessUsers,
  },
  gmail: {
    delegatedInboxes,
  },
  live: {
    signalingPath: liveSignalingPath,
    iceServers: liveIceServers,
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
