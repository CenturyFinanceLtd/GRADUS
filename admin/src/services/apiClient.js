/*
  Admin fetch wrapper
  - Uses API_BASE_URL from config/env and supports JSON or FormData bodies
  - Includes credentials/cookies for session-based flows
*/
import {
  API_BASE_URL,
  SUPABASE_FUNCTIONS_URL,
  SUPABASE_ANON_KEY,
} from "../config/env";

// Map of path prefixes to Function names
const FUNCTION_MAP = {
  "/admin/blogs": "admin-blogs-api",
  "/admin/banners": "admin-banners-api",
  "/admin/courses": "admin-courses-api",
  "/admin/events": "admin-events-api",
  "/admin/testimonials": "admin-testimonials-api",
  "/admin/partners": "admin-partners-api",
  "/admin/expert-videos": "admin-expert-videos-api",
  "/admin/why-gradus-video": "admin-why-gradus-api",
  "/admin/jobs": "admin-jobs-api",
  "/admin/page-meta": "admin-page-meta-api",
  "/admin/gallery": "admin-gallery-api",
  "/admin/sitemaps": "admin-sitemaps-api",
  "/admin/users": "admin-users-api",
  "/admin/website-users": "admin-website-users-api",
  "/admin/permissions": "admin-permissions-api",
  "/admin/tickets": "admin-tickets-api",
  "/admin/assignments": "admin-assignments-api",
  "/admin/emails": "admin-emails-api",
  "/admin/email": "admin-emails-api",
  "/admin/auth": "admin-auth-api",
  "/admin/email-templates": "admin-email-templates-api",
  "/admin/assessments": "admin-assessments-api",
  "/admin/analytics": "admin-analytics-api",
  "/admin/uploads": "admin-uploads-api",
  "/admin/course-details": "admin-course-details-api",
  "/admin/inquiries": "inquiries-api",
  "/admin/callback-requests": "inquiries-api",
  "/admin/event-registrations": "event-registrations-api",
  "/admin/landing-pages": "admin-landing-pages-api",
};

const apiClient = async (
  endpoint,
  { method = "GET", data, token, headers } = {}
) => {
  const hasFormData =
    typeof FormData !== "undefined" && data instanceof FormData;
  const requestHeaders = new Headers(headers || {});

  if (!hasFormData) {
    requestHeaders.set("Content-Type", "application/json");
  }

  if (token) {
    // console.log("Using provided token for", endpoint);
    requestHeaders.set("Authorization", "Bearer " + token);
  } else if (SUPABASE_ANON_KEY) {
    // console.log("Using Anon Key for", endpoint);
    // If no user token, pass Anon Key to satisfy Gateway (for public endpoints or initial fetch)
    requestHeaders.set("Authorization", "Bearer " + SUPABASE_ANON_KEY);
  } else {
    console.warn("No token and no Anon Key for", endpoint);
  }

  const fetchOptions = {
    method,
    headers: requestHeaders,
    credentials: "include",
  };

  if (data !== undefined) {
    fetchOptions.body = hasFormData ? data : JSON.stringify(data);
  }

  let url = API_BASE_URL + endpoint;

  if (SUPABASE_FUNCTIONS_URL) {
    for (const [prefix, funcName] of Object.entries(FUNCTION_MAP)) {
      if (endpoint.startsWith(prefix)) {
        const suffix = endpoint.slice(prefix.length);
        url = `${SUPABASE_FUNCTIONS_URL}/${funcName}${suffix}`;
        break;
      }
    }
  }

  const response = await fetch(url, fetchOptions);

  const contentType = response.headers.get("content-type");
  let responseBody = null;

  if (contentType && contentType.includes("application/json")) {
    responseBody = await response.json();
  } else {
    responseBody = await response.text();
  }

  if (!response.ok) {
    let message = "Request failed";
    if (
      responseBody &&
      typeof responseBody === "object" &&
      responseBody.message
    ) {
      message = responseBody.message;
    } else if (typeof responseBody === "string") {
      const trimmed = responseBody.trim();
      const looksLikeHtml =
        /^<!DOCTYPE/i.test(trimmed) || /^<html/i.test(trimmed);
      if (looksLikeHtml) {
        message =
          `${response.status} ${response.statusText || ""}`.trim() ||
          "Request failed";
      } else {
        message = trimmed || message;
      }
    } else if (response.status) {
      message =
        `${response.status} ${response.statusText || ""}`.trim() || message;
    }
    const error = new Error(message);
    error.status = response.status;
    error.data = responseBody;
    throw error;
  }

  return responseBody;
};

export default apiClient;
