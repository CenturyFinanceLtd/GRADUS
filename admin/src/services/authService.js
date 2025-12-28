/*
  Admin Auth Service (Edge Function)
  - Uses Supabase Edge Functions for admin auth
  - Supports legacy fallback to Node.js backend
*/
import { supabase } from "./supabaseClient";
import {
  ADMIN_AUTH_API_URL,
  API_BASE_URL,
  SUPABASE_ANON_KEY,
} from "../config/env";

// Helper to make API calls to the Edge Function
const callAuthApi = async (endpoint, { method = "GET", data, token } = {}) => {
  const baseUrl = ADMIN_AUTH_API_URL || `${API_BASE_URL}/admin/auth`;
  const url = `${baseUrl}${endpoint}`;

  const headers = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  } else if (SUPABASE_ANON_KEY) {
    headers["Authorization"] = `Bearer ${SUPABASE_ANON_KEY}`;
  }

  const options = {
    method,
    headers,
    credentials: "include",
  };

  if (data && method !== "GET") {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(url, options);
  const responseBody = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(
      responseBody.error || responseBody.message || "Request failed"
    );
    error.status = response.status;
    throw error;
  }

  return responseBody;
};

/**
 * Check if user should use Supabase or Legacy Auth
 */
export const checkAuthType = async (email) => {
  try {
    const response = await callAuthApi("/check-auth-type", {
      method: "POST",
      data: { email },
    });
    return response.type; // 'supabase' or 'legacy'
  } catch (error) {
    console.warn("Auth type check failed, defaulting to legacy", error);
    return "legacy";
  }
};

/**
 * Admin login - tries appropriate method based on pre-check
 */
export const login = async (email, password) => {
  // Step 1: Check which auth method to use
  const authType = await checkAuthType(email);

  // Step 2: Authenticate using detected method
  if (authType === "supabase") {
    // Supabase Auth
    const { data: supabaseData, error: supabaseError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (supabaseError) {
      throw new Error(supabaseError.message);
    }

    if (supabaseData.user) {
      try {
        const adminCheck = await callAuthApi("/me", {
          token: supabaseData.session.access_token,
        });

        return {
          admin: adminCheck,
          token: supabaseData.session.access_token,
          type: "supabase",
        };
      } catch (error) {
        await supabase.auth.signOut();
        throw new Error("Not authorized as admin");
      }
    }
  }

  // Legacy/Edge Function JWT Auth (via Edge Function)
  try {
    const response = await callAuthApi("/login", {
      method: "POST",
      data: { email, password },
    });

    return {
      admin: response.admin,
      token: response.token,
      type: "jwt",
    };
  } catch (error) {
    throw new Error(error.message || "Invalid credentials");
  }
};

/**
 * Logout - handles both auth types
 */
export const logout = async () => {
  try {
    await supabase.auth.signOut();
  } catch (error) {
    console.log("Supabase logout failed");
  }
};

/**
 * Get admin profile
 */
export const getProfile = async (token) => {
  return await callAuthApi("/me", { token });
};

/**
 * Update admin profile
 */
export const updateProfile = async (token, data) => {
  return await callAuthApi("/me", {
    method: "PUT",
    data,
    token,
  });
};

/**
 * Update admin password
 */
export const updatePassword = async (token, currentPassword, newPassword) => {
  return await callAuthApi("/me/password", {
    method: "PUT",
    data: { currentPassword, newPassword },
    token,
  });
};

/**
 * Start password reset
 */
export const startPasswordReset = async (email) => {
  return await callAuthApi("/password/reset/start", {
    method: "POST",
    data: { email },
  });
};

/**
 * Verify password reset OTP
 */
export const verifyPasswordResetOtp = async (sessionId, otp) => {
  return await callAuthApi("/password/reset/verify-otp", {
    method: "POST",
    data: { sessionId, otp },
  });
};

/**
 * Complete password reset
 */
export const completePasswordReset = async (
  sessionId,
  verificationToken,
  password
) => {
  return await callAuthApi("/password/reset/complete", {
    method: "POST",
    data: { sessionId, verificationToken, password },
  });
};

/**
 * Start email change
 */
export const startEmailChange = async (token, newEmail) => {
  return await callAuthApi("/email/change/start", {
    method: "POST",
    data: { newEmail },
    token,
  });
};

/**
 * Verify current email OTP for email change
 */
export const verifyEmailChangeCurrent = async (token, sessionId, otp) => {
  return await callAuthApi("/email/change/verify-current", {
    method: "POST",
    data: { sessionId, otp },
    token,
  });
};

/**
 * Verify new email OTP for email change
 */
export const verifyEmailChangeNew = async (token, sessionId, otp) => {
  return await callAuthApi("/email/change/verify-new", {
    method: "POST",
    data: { sessionId, otp },
    token,
  });
};

/**
 * Start admin signup
 */
export const startSignup = async (data) => {
  return await callAuthApi("/signup/start", {
    method: "POST",
    data,
  });
};

/**
 * Get signup session status
 */
export const getSignupSession = async (sessionId) => {
  return await callAuthApi(`/signup/session/${sessionId}`);
};

/**
 * Verify signup OTP
 */
export const verifySignupOtp = async (sessionId, otp) => {
  return await callAuthApi("/signup/verify-otp", {
    method: "POST",
    data: { sessionId, otp },
  });
};

/**
 * Complete signup
 */
export const completeSignup = async (
  sessionId,
  verificationToken,
  password
) => {
  return await callAuthApi("/signup/complete", {
    method: "POST",
    data: { sessionId, verificationToken, password },
  });
};

/**
 * Get current session
 */
export const getCurrentSession = async () => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.user) {
    return {
      user: session.user,
      token: session.access_token,
      type: "supabase",
    };
  }

  return null;
};
