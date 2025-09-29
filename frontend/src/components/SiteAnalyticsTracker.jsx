import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { logSiteVisit } from '../services/analyticsService';

const SiteAnalyticsTracker = () => {
  const location = useLocation();
  const lastPathRef = useRef(null);

  useEffect(() => {
    const path = `${location.pathname}${location.search}`;

    if (lastPathRef.current === path) {
      return undefined;
    }

    lastPathRef.current = path;

    const abortController = new AbortController();

    logSiteVisit({
      path,
      pageTitle: typeof document !== 'undefined' ? document.title : undefined,
      referrer: typeof document !== 'undefined' ? document.referrer : undefined,
      signal: abortController.signal,
    });

    return () => {
      abortController.abort();
    };
  }, [location]);

  return null;
};

export default SiteAnalyticsTracker;
