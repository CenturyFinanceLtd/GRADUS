import { API_BASE_URL } from './apiClient';

// Simple in-memory circuit breaker + dedupe to avoid spamming the API when it's down.
let analyticsDisabledUntil = 0; // ms epoch
let lastSent = { path: '', at: 0 };

const shouldSkip = (path) => {
  const now = Date.now();

  // If we recently detected the API was down, skip until the cool‑off elapses.
  if (now < analyticsDisabledUntil) return true;

  // Dedupe: avoid sending the same path more than once every 60s.
  if (lastSent.path === path && now - lastSent.at < 60_000) return true;

  return false;
};

export const logSiteVisit = async ({ path, pageTitle, referrer, signal } = {}) => {
  const finalPath = typeof path === 'string' && path.trim() ? path : window.location.pathname + window.location.search;
  if (shouldSkip(finalPath)) return;

  try {
    const payload = { path: finalPath };
    if (typeof pageTitle === 'string' && pageTitle.trim()) payload.pageTitle = pageTitle.trim();
    if (typeof referrer === 'string' && referrer.trim()) payload.referrer = referrer.trim();

    const url = `${API_BASE_URL}/analytics/visits`;

    // Prefer sendBeacon for fire‑and‑forget if available and not aborted.
    if (!signal && typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      const ok = navigator.sendBeacon(url, blob);
      if (ok) {
        lastSent = { path: finalPath, at: Date.now() };
        return;
      }
      // Fall through to fetch if beacon fails (returns false)
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      signal,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      // On server error, back off for 5 minutes.
      if (res.status >= 500) analyticsDisabledUntil = Date.now() + 5 * 60_000;
      return;
    }

    lastSent = { path: finalPath, at: Date.now() };
  } catch (error) {
    if (error?.name === 'AbortError') return;
    // On network failure, back off for 5 minutes to avoid console noise.
    analyticsDisabledUntil = Date.now() + 5 * 60_000;
  }
};

export default { logSiteVisit };
