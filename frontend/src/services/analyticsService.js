import { API_BASE_URL } from "./apiClient";

// Simple in-memory circuit breaker + dedupe to avoid spamming the API when it's down.
let analyticsDisabledUntil = 0; // ms epoch
let lastSent = { path: "", at: 0 };

const shouldSkip = (path) => {
  const now = Date.now();

  // If we recently detected the API was down, skip until the cool‑off elapses.
  if (now < analyticsDisabledUntil) return true;

  // Dedupe: avoid sending the same path more than once every 60s.
  if (lastSent.path === path && now - lastSent.at < 60_000) return true;

  return false;
};

export const logSiteVisit = async ({
  path,
  pageTitle,
  referrer,
  signal,
} = {}) => {
  // ANALYTICS STUBBED FOR EDGE MIGRATION
  // const finalPath = typeof path === 'string' && path.trim() ? path : window.location.pathname + window.location.search;
  // if (shouldSkip(finalPath)) return;
  return;
};

export default { logSiteVisit };
