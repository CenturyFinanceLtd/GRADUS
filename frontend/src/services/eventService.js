import apiClient from "./apiClient";

const buildQueryString = (params = {}) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== undefined && item !== null && item !== "") {
          searchParams.append(key, item);
        }
      });
      return;
    }

    searchParams.append(key, value);
  });

  const query = searchParams.toString();
  return query ? `?${query}` : "";
};

export const fetchEvents = (options = {}) => {
  const { signal, ...queryOptions } = options;
  const query = buildQueryString(queryOptions);
  return apiClient.get(`/events${query}`, { signal });
};

export const fetchEventBySlug = (slugOrId, options = {}) => {
  if (!slugOrId) {
    return Promise.reject(new Error("Event identifier is required"));
  }
  return apiClient.get(`/events/${slugOrId}`, options);
};

export default {
  fetchEvents,
  fetchEventBySlug,
};
