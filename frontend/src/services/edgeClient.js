const resolveEdgeBaseUrl = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) return "http://localhost:54321/functions/v1"; // Local fallback
  return `${supabaseUrl}/functions/v1`;
};

export const EDGE_API_BASE_URL = resolveEdgeBaseUrl();

const parseResponse = async (response) => {
  const contentType = response.headers.get("content-type");
  let data = null;

  if (contentType && contentType.includes("application/json")) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const error = new Error(data?.message || data?.error || "Request failed");
    error.status = response.status;
    if (data?.details) {
      error.details = data.details;
    }
    throw error;
  }

  return data;
};

const request = async (
  path,
  { method = "GET", body, token, headers: customHeaders, signal } = {}
) => {
  const headers = new Headers(customHeaders || {});

  if (!(body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const fetchOptions = {
    method,
    headers,
  };

  if (signal) {
    fetchOptions.signal = signal;
  }

  if (body !== undefined) {
    fetchOptions.body = body instanceof FormData ? body : JSON.stringify(body);
  }

  // Remove leading slash if present in path to append correctly
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  const url = `${EDGE_API_BASE_URL}/${normalizedPath}`;

  const response = await fetch(url, fetchOptions);
  return parseResponse(response);
};

const edgeClient = {
  get: (path, options = {}) => request(path, { ...options, method: "GET" }),
  post: (path, body, options = {}) =>
    request(path, { ...options, method: "POST", body }),
  put: (path, body, options = {}) =>
    request(path, { ...options, method: "PUT", body }),
  del: (path, options = {}) => request(path, { ...options, method: "DELETE" }),
};

export default edgeClient;
