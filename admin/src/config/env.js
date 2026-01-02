/*
  Admin runtime config (Vite)
  - Reads VITE_* variables, enforces required vars, and trims trailing slashes
*/
const getEnvVar = (name, { required = false } = {}) => {
  const value = import.meta.env[name];
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed) {
      return trimmed;
    }
  }

  if (required) {
    throw new Error(
      `Environment variable ${name} is required. Add it to your .env file.`
    );
  }

  return undefined;
};

const removeTrailingSlash = (value) => {
  if (typeof value !== "string") {
    return value;
  }
  return value.replace(/\/+$/, "");
};

const rawApiBaseUrl = getEnvVar("VITE_API_BASE_URL", { required: true });
const API_BASE_URL = removeTrailingSlash(rawApiBaseUrl);
const ASSET_BASE_URL = removeTrailingSlash(API_BASE_URL.replace(/\/api$/i, ""));
const PUBLIC_SITE_BASE = removeTrailingSlash(
  getEnvVar("VITE_PUBLIC_SITE_URL") || ""
);
const SIGNALING_BASE_URL = removeTrailingSlash(
  getEnvVar("VITE_SIGNALING_BASE_URL") || API_BASE_URL
);

// Supabase Edge Functions
const SUPABASE_FUNCTIONS_URL = removeTrailingSlash(
  getEnvVar("VITE_SUPABASE_FUNCTIONS_URL") || ""
);
const SUPABASE_ANON_KEY = getEnvVar("VITE_SUPABASE_ANON_KEY");

const ADMIN_AUTH_API_URL = SUPABASE_FUNCTIONS_URL
  ? `${SUPABASE_FUNCTIONS_URL}/admin-auth-api`
  : null;
const ADMIN_COURSES_API_URL = SUPABASE_FUNCTIONS_URL
  ? `${SUPABASE_FUNCTIONS_URL}/admin-courses-api`
  : null;

// 100ms Config
const HMS_SYSTEM_SUBDOMAIN = getEnvVar("VITE_HMS_SYSTEM_SUBDOMAIN") || "gradus";

export {
  API_BASE_URL,
  ADMIN_AUTH_API_URL,
  ADMIN_COURSES_API_URL,
  ASSET_BASE_URL,
  PUBLIC_SITE_BASE,
  SIGNALING_BASE_URL,
  SUPABASE_FUNCTIONS_URL,
  SUPABASE_ANON_KEY,
  HMS_SYSTEM_SUBDOMAIN,
  getEnvVar,
};
