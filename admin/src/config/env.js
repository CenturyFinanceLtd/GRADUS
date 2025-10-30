/*
  Admin runtime config (Vite)
  - Reads VITE_* variables, enforces required vars, and trims trailing slashes
*/
const getEnvVar = (name, { required = false } = {}) => {
  const value = import.meta.env[name];
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed) {
      return trimmed;
    }
  }

  if (required) {
    throw new Error(`Environment variable ${name} is required. Add it to your .env file.`);
  }

  return undefined;
};

const removeTrailingSlash = (value) => {
  if (typeof value !== 'string') {
    return value;
  }
  return value.replace(/\/+$/, '');
};

const rawApiBaseUrl = getEnvVar('VITE_API_BASE_URL', { required: true });
const API_BASE_URL = removeTrailingSlash(rawApiBaseUrl);
const ASSET_BASE_URL = removeTrailingSlash(API_BASE_URL.replace(/\/api$/i, ''));
const PUBLIC_SITE_BASE = removeTrailingSlash(getEnvVar('VITE_PUBLIC_SITE_URL') || '');

export { API_BASE_URL, ASSET_BASE_URL, PUBLIC_SITE_BASE, getEnvVar };
