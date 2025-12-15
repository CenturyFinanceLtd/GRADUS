import { API_BASE_URL } from "../constants";
import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "admin_token";

export async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function removeToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `${response.statusText || 'Error'} - ${endpoint}`);
  }

  return response.json();
}

// Auth
export const adminApi = {
  login: (email: string, password: string) =>
    request<{ token: string; admin: any }>("/admin/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  getProfile: () => request<{ admin: any }>("/admin/auth/profile"),

  // Dashboard - use visitor summary for stats
  getAnalyticsSummary: () =>
    request<any>("/admin/analytics/visitors/summary"),

  // Courses
  getCourses: () =>
    request<{ items: any[] }>("/admin/courses/raw"),

  getCourseBySlug: (slug: string) =>
    request<{ course: any }>(`/admin/courses/raw/${encodeURIComponent(slug)}`),

  updateCourse: (slug: string, data: any) =>
    request<{ course: any }>(`/admin/courses/raw/${encodeURIComponent(slug)}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  getCourseEnrollments: (slug?: string) =>
    request<{ items: any[] }>(
      `/admin/courses/enrollments${slug ? `?slug=${encodeURIComponent(slug)}` : ""}`
    ),

  getCourseProgress: (slug: string) =>
    request<any>(`/admin/courses/progress/${encodeURIComponent(slug)}`),

  // Website Users (public users)
  getWebsiteUsers: (page = 1, limit = 20, search = "") =>
    request<{ users: any[]; total: number; page: number }>(
      `/admin/website-users?page=${page}&limit=${limit}${search ? `&search=${encodeURIComponent(search)}` : ""}`
    ),

  getUserById: (id: string) =>
    request<{ user: any }>(`/admin/website-users/${id}`),

  // Admin Users (admin accounts)
  getAdminUsers: (status?: string, search?: string) =>
    request<{ users: any[] }>(
      `/admin/users?${status ? `status=${status}&` : ""}${search ? `search=${encodeURIComponent(search)}` : ""}`
    ),

  updateAdminStatus: (id: string, status: "active" | "inactive") =>
    request<any>(`/admin/users/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  updateAdminRole: (id: string, role: string) =>
    request<any>(`/admin/users/${id}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    }),

  deleteAdminUser: (id: string) =>
    request<any>(`/admin/users/${id}`, {
      method: "DELETE",
    }),

  // Events
  getEvents: () =>
    request<{ items: any[] }>("/admin/events"),

  createEvent: (data: any) =>
    request<{ event: any }>("/admin/events", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateEvent: (id: string, data: any) =>
    request<{ event: any }>(`/admin/events/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteEvent: (id: string) =>
    request<{ message: string }>(`/admin/events/${id}`, {
      method: "DELETE",
    }),

  // Tickets
  getTickets: (status?: string) =>
    request<{ items: any[] }>(
      `/admin/tickets${status ? `?status=${status}` : ""}`
    ),

  getTicketById: (id: string) =>
    request<{ ticket: any }>(`/admin/tickets/${id}`),

  replyToTicket: (id: string, message: string) =>
    request<{ ticket: any }>(`/admin/tickets/${id}/reply`, {
      method: "POST",
      body: JSON.stringify({ message }),
    }),

  // Email (actual backend routes - /api/admin/email)
  getEmailAccounts: () =>
    request<{ accounts: any[] }>("/admin/email/accounts"),

  getEmailMessages: (account?: string, labelId?: string) => {
    const params = new URLSearchParams();
    if (account) params.append("account", account);
    if (labelId) params.append("labelId", labelId);
    const query = params.toString();
    return request<{ messages: any[] }>(
      `/admin/email/messages${query ? `?${query}` : ""}`
    );
  },

  getEmailMessage: (messageId: string, account?: string) => {
    const params = new URLSearchParams();
    if (account) params.append("account", account);
    const query = params.toString();
    return request<{ message: any }>(`/admin/email/messages/${messageId}${query ? `?${query}` : ""}`);
  },

  sendEmail: (data: { to: string; subject: string; body: string }) =>
    request<{ message: string }>("/admin/email/send", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Blogs
  getBlogs: () =>
    request<{ items: any[] }>("/admin/blogs"),

  // Banners
  getBanners: () =>
    request<{ items: any[] }>("/admin/banners"),

  // Testimonials
  getTestimonials: () =>
    request<{ items: any[] }>("/admin/testimonials"),
};
