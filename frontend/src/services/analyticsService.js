import { API_BASE_URL } from './apiClient';

export const logSiteVisit = async ({ path, pageTitle, referrer, signal } = {}) => {
  try {
    const payload = {
      path: typeof path === 'string' && path.trim() ? path : window.location.pathname + window.location.search,
    };

    if (typeof pageTitle === 'string' && pageTitle.trim()) {
      payload.pageTitle = pageTitle.trim();
    }

    if (typeof referrer === 'string' && referrer.trim()) {
      payload.referrer = referrer.trim();
    }

    await fetch(`${API_BASE_URL}/analytics/visits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      signal,
      body: JSON.stringify(payload),
    });
  } catch (error) {
    if (error?.name === 'AbortError') {
      return;
    }
    console.warn('[analytics] Failed to record site visit', error);
  }
};

export default { logSiteVisit };
