import apiClient from "./apiClient";

export const startAdminPasswordReset = (data) =>
  apiClient("/admin/auth/password/reset/start", {
    method: "POST",
    data,
  });

export const verifyAdminPasswordResetOtp = (data) =>
  apiClient("/admin/auth/password/reset/verify-otp", {
    method: "POST",
    data,
  });

export const completeAdminPasswordReset = (data) =>
  apiClient("/admin/auth/password/reset/complete", {
    method: "POST",
    data,
  });