/*
  Unified Auth Service with Google OAuth (Hybrid Auth)
  - Supports legacy JWT, Supabase Auth, and Google OAuth
  - New users sign up with Supabase
  - Existing users login with JWT
  - Google login via Supabase
*/
import { supabase } from "./supabaseClient";
import apiClient from "./apiClient";

/**
 * Sign up new user with Supabase Auth
 */
export const signup = async (credentials) => {
  const { email, password, fullName, phone } = credentials;
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        phone: phone,
      },
    },
  });

  if (authError) {
    throw new Error(authError.message);
  }

  if (!authData.user) {
    throw new Error("Failed to create user account");
  }

  // Create user profile in database
  try {
    await apiClient("/auth/supabase/create-profile", {
      method: "POST",
      data: {
        supabaseId: authData.user.id,
        email: authData.user.email,
        fullname: fullName,
        phone,
      },
    });
  } catch (error) {
    console.error("Failed to create user profile:", error);
  }

  return {
    user: authData.user,
    session: authData.session,
    type: "supabase",
  };
};

/**
 * Login with email/password - tries Supabase first, falls back to legacy JWT
 */
export const login = async (email, password) => {
  // Try Supabase Auth first
  const { data: supabaseData, error: supabaseError } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  if (!supabaseError && supabaseData.user) {
    return {
      user: supabaseData.user,
      session: supabaseData.session,
      token: supabaseData.session.access_token,
      type: "supabase",
    };
  }

  // Fall back to legacy JWT auth
  try {
    const response = await apiClient("/auth/login", {
      method: "POST",
      data: { email, password },
    });

    return {
      user: response.user,
      token: response.token,
      type: "jwt",
    };
  } catch (error) {
    throw new Error(error.message || "Invalid email or password");
  }
};

/**
 * Login with Google OAuth via Supabase
 */
export const loginWithGoogle = async () => {
  const redirectUrl = `${window.location.origin}/auth/google/callback`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: redirectUrl,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

// Store 2Factor sessionId for verification
let lastOtpSessionId = null;

/**
 * Trigger OTP SMS for phone login using 2Factor.in
 */
export const signInWithPhone = async (phone) => {
  // Ensure phone starts with +
  const formattedPhone = phone.startsWith("+") ? phone : `+${phone}`;

  const response = await apiClient("/auth/phone/otp/send", {
    method: "POST",
    data: { phone: formattedPhone },
  });

  // Store the 2Factor SessionId for verification
  lastOtpSessionId = response.sessionId;

  return response;
};

/**
 * Verify OTP and establish session using 2Factor.in
 */
export const verifyPhoneOtp = async (phone, token) => {
  const formattedPhone = phone.startsWith("+") ? phone : `+${phone}`;

  if (!lastOtpSessionId) {
    throw new Error("No active OTP session found. Please resend OTP.");
  }

  const response = await apiClient("/auth/phone/otp/verify", {
    method: "POST",
    data: {
      phone: formattedPhone,
      otp: token,
      sessionId: lastOtpSessionId,
    },
  });

  // response contains { token, user }
  return {
    user: response.user,
    token: response.token,
    type: "jwt", // Now using custom JWT from Edge Function
  };
};

/**
 * Handle OAuth callback and create user profile if needed
 */
/**
 * Sync Google user profile with backend
 */
export const syncGoogleUserProfile = async (user) => {
  if (!user) return;

  try {
    const { data } = await apiClient("/auth/supabase/create-profile", {
      method: "POST",
      data: {
        supabaseId: user.id,
        email: user.email,
        fullname:
          user.user_metadata?.full_name ||
          (user.user_metadata?.first_name
            ? `${user.user_metadata.first_name} ${
                user.user_metadata.last_name || ""
              }`.trim()
            : ""),
        phone: user.user_metadata?.phone || user.user_metadata?.mobile || null,
      },
    });
    return data;
  } catch (error) {
    console.error("Profile sync failed:", error);
    // Even if sync fails, we don't want to block login if the session is valid
    // but the backend might return 500 if DB issue.
    // We log it and proceed.
  }
};

/**
 * Handle OAuth callback (legacy wrapper)
 * @deprecated Use syncGoogleUserProfile directly with onAuthStateChange
 */
export const handleOAuthCallback = async () => {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session) {
    throw new Error("Failed to get session from OAuth callback");
  }

  await syncGoogleUserProfile(session.user);

  return {
    user: session.user,
    session,
    token: session.access_token,
    type: "supabase",
  };
};

/**
 * Logout from current session
 */
export const logout = async () => {
  try {
    await supabase.auth.signOut();
  } catch (error) {
    console.log("Supabase logout failed (likely JWT session)");
  }

  try {
    await apiClient("/auth/logout", { method: "POST" });
  } catch (error) {
    console.log("JWT logout failed (likely Supabase session)");
  }
};

/**
 * Get current user from Supabase session
 */
export const getCurrentUser = async () => {
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

/**
 * Reset password
 */
export const resetPassword = async (email) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });

  if (error) {
    throw new Error(error.message);
  }
};

/**
 * Update password
 */
export const updatePassword = async (newPassword) => {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    throw new Error(error.message);
  }
};
