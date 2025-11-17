/*
  Lightweight fetch wrapper for REST calls
  - Picks API base URL from Vite env, with sensible localhost defaults
  - Parses JSON/text automatically and throws enriched errors
*/
const DEFAULT_LOCAL_API_BASE_URL = 'http://localhost:5000/api';
const DEFAULT_REMOTE_API_BASE_URL = 'https://api.gradusindia.in/api';

const isLocalhost = (hostname) => {
  if (!hostname) {
    return false;
  }

  const normalizedHost = hostname.toLowerCase();
  return (
    normalizedHost === 'localhost' ||
    normalizedHost === '127.0.0.1' ||
    normalizedHost === '[::1]' ||
    normalizedHost.endsWith('.local')
  );
};

const resolveApiBaseUrl = () => {
  const envValue = import.meta.env.VITE_API_BASE_URL;
  const forceRemoteOnLocal = String(import.meta.env.VITE_API_FORCE_REMOTE || '').toLowerCase() === 'true';

  if (typeof window !== 'undefined') {
    const { hostname } = window.location;

    // When running on localhost, prefer a localhost API base unless explicitly forced remote.
    if (isLocalhost(hostname)) {
      if (forceRemoteOnLocal && envValue) {
        return envValue;
      }
      if (envValue && /^https?:\/\/localhost(?::\d+)?\/.*/i.test(envValue)) {
        return envValue;
      }
      return DEFAULT_LOCAL_API_BASE_URL;
    }

    // When NOT on localhost (production/staging), never use a localhost API base
    // even if it was accidentally bundled at build time.
    if (envValue && !/https?:\/\/localhost(?::\d+)?\/.*/i.test(envValue)) {
      return envValue;
    }
  }

  // Fallback to the remote API base when no safe env override is present.
  return DEFAULT_REMOTE_API_BASE_URL;
};

export const API_BASE_URL = resolveApiBaseUrl();

const parseResponse = async (response) => {
  const contentType = response.headers.get('content-type');
  let data = null;

  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const error = new Error(data?.message || 'Request failed');
    error.status = response.status;
    if (data?.details) {
      error.details = data.details;
    }
    throw error;
  }

  return data;
};

const request = async (path, { method = 'GET', body, token, headers: customHeaders, signal } = {}) => {
  const headers = new Headers(customHeaders || {});

  if (!(body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const fetchOptions = {
    method,
    headers,
    credentials: 'include',
  };

  if (signal) {
    fetchOptions.signal = signal;
  }

  if (body !== undefined) {
    fetchOptions.body = body instanceof FormData ? body : JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, fetchOptions);
  return parseResponse(response);
};

const apiClient = {
  get: (path, options = {}) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options = {}) => request(path, { ...options, method: 'POST', body }),
  put: (path, body, options = {}) => request(path, { ...options, method: 'PUT', body }),
};

export default apiClient;
