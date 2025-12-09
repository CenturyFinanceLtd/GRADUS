import { useCallback, useEffect, useState } from "react";
import { fetchMonthlyVisitors, fetchPageViewStats, fetchVisitorSummary, fetchVisitorLocationStats } from "../services/adminAnalytics";
import useAuth from "./useAuth";

const defaultSummary = {
  uniqueVisitors: 0,
  totalVisits: 0,
  todayVisits: 0,
  weekVisits: 0,
  monthVisits: 0,
};

const defaultPageSummary = {
  totalVisits: 0,
  uniqueVisitors: 0,
};

const useVisitorAnalytics = ({ months = 12, pageViewRange = 30, includePageViews = true } = {}) => {
  const { token } = useAuth();
  const [state, setState] = useState({
    loading: true,
    error: null,
    summary: defaultSummary,
    monthly: [],
    pageViews: { range: pageViewRange, summary: defaultPageSummary },
    locations: [],
  });

  const load = useCallback(
    async (signal) => {
      if (!token) {
        if (signal?.aborted) {
          return;
        }
        setState({
          loading: false,
          error: null,
          summary: defaultSummary,
          monthly: [],
          pageViews: { range: pageViewRange, summary: defaultPageSummary },
          locations: [],
        });
        return;
      }

      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const requests = [
          fetchVisitorSummary({ token }),
          fetchMonthlyVisitors({ token, months }),
          fetchVisitorLocationStats({ token }),
        ];

        if (includePageViews) {
          requests.push(fetchPageViewStats({ token, range: `${pageViewRange}d`, limit: 5 }));
        }

        const [summaryResponse, monthlyResponse, locationsResponse, pageViewsResponse] = await Promise.all(requests);

        if (signal?.aborted) {
          return;
        }

        // Handle variable response based on includePageViews push
        const finalPageViews = includePageViews ? pageViewsResponse : undefined;

        setState({
          loading: false,
          error: null,
          summary: {
            uniqueVisitors: summaryResponse?.uniqueVisitors || 0,
            totalVisits: summaryResponse?.totalVisits || 0,
            todayVisits: summaryResponse?.todayVisits || 0,
            weekVisits: summaryResponse?.weekVisits || 0,
            monthVisits: summaryResponse?.monthVisits || 0,
          },
          monthly: Array.isArray(monthlyResponse?.months) ? monthlyResponse.months : [],
          locations: Array.isArray(locationsResponse?.locations) ? locationsResponse.locations : [],
          pageViews: includePageViews
            ? {
              range: finalPageViews?.range || pageViewRange,
              summary: finalPageViews?.summary || defaultPageSummary,
            }
            : { range: pageViewRange, summary: defaultPageSummary },
        });
      } catch (error) {
        if (signal?.aborted) {
          return;
        }
        setState({
          loading: false,
          error: error?.message || "Unable to load analytics",
          summary: defaultSummary,
          monthly: [],
          locations: [],
          pageViews: { range: pageViewRange, summary: defaultPageSummary },
        });
      }
    },
    [token, months, pageViewRange, includePageViews]
  );

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);

    return () => controller.abort();
  }, [load]);

  return { ...state, refresh: () => load() };
};

export default useVisitorAnalytics;
