const FALLBACK_SUPABASE_URL = "https://utxxhgoxsywhrdblwhbx.supabase.co";

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL || FALLBACK_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

const edgeBaseUrl = `${supabaseUrl}/functions/v1`;

type EdgeOptions = {
  method?: string;
  body?: unknown;
  token?: string;
  headers?: Record<string, string>;
};

export const edgeRequest = async <T>(
  path: string,
  options: EdgeOptions = {}
): Promise<T> => {
  const {
    method = "GET",
    body,
    token,
    headers: extraHeaders = {},
  } = options;

  const url = path.startsWith("http")
    ? path
    : `${edgeBaseUrl}${path.startsWith("/") ? "" : "/"}${path}`;

  const headers = new Headers(extraHeaders);
  const authToken = token || supabaseAnonKey;

  if (authToken) {
    headers.set("Authorization", `Bearer ${authToken}`);
  }

  if (body !== undefined && !(body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const requestBody =
    body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body);

  const response = await fetch(url, {
    method,
    headers,
    body: requestBody,
  });

  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message =
      typeof data === "string" ? data : data?.error || "Request failed";
    throw new Error(message);
  }

  return data as T;
};
