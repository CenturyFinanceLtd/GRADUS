import { useEffect, useMemo, useRef } from "react";
import { useLocation } from "react-router-dom";
import apiClient from "../services/apiClient.js";
import { useAuth } from "../context/AuthContext.jsx";
import { getCurrentOrigin, getGoogleAllowedOrigins } from "../utils/googleOrigins.js";

const EXCLUDED_PATHS = new Set(["/sign-in", "/sign-up", "/forgot-password", "/auth/google/callback"]);
const SCRIPT_ID = "google-identity-services";

const loadGoogleScript = () =>
  new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Window is not available"));
      return;
    }

    if (document.getElementById(SCRIPT_ID)) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.id = SCRIPT_ID;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Identity Services"));
    document.head.appendChild(script);
  });

const supportsFedCM = () => {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }

  return (
    "IdentityCredential" in window ||
    "FederatedCredential" in window ||
    "fedcm" in navigator ||
    typeof window.FedCM !== "undefined"
  );
};

const GoogleOneTap = () => {
  const location = useLocation();
  const { isAuthenticated, loading, setAuth } = useAuth();
  const clientId = useMemo(() => import.meta.env.VITE_GOOGLE_CLIENT_ID, []);
  const allowedOrigins = useMemo(getGoogleAllowedOrigins, []);
  const initializedRef = useRef(false);

  useEffect(() => {
    const path = location?.pathname || "/";
    if (loading || isAuthenticated || !clientId || EXCLUDED_PATHS.has(path)) {
      return;
    }

    let cancelled = false;
    const currentOrigin = getCurrentOrigin();
    const hasAllowlist = allowedOrigins.length > 0;

    const startPrompt = async () => {
      const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
      const isSecure = window.location.protocol === "https:";
      if (!isLocalhost && !isSecure) {
        // FedCM/One Tap requires a secure context unless on localhost
        return;
      }

      if (hasAllowlist && (!currentOrigin || !allowedOrigins.includes(currentOrigin))) {
        if (import.meta.env.DEV) {
          console.info(
            `[OneTap] Skipping Google prompt on ${
              currentOrigin || "an unknown origin"
            } because it is not in VITE_GOOGLE_ALLOWED_ORIGINS.`
          );
        }
        return;
      }

      const shouldUseFedCM = !isLocalhost && isSecure && supportsFedCM();

      try {
        await loadGoogleScript();
        if (cancelled || initializedRef.current) {
          return;
        }

        initializedRef.current = true;

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response) => {
            const credential = response?.credential;
            if (!credential) {
              return;
            }

            try {
              const result = await apiClient.post("/auth/social/google/onetap", { credential });
              setAuth({ token: result.token, user: result.user });
            } catch (error) {
              console.warn("[OneTap] signin failed", error);
              window.google?.accounts?.id?.cancel?.();
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
          use_fedcm_for_prompt: shouldUseFedCM,
          itp_support: true,
        });

        try {
          window.google.accounts.id.prompt();
        } catch (promptError) {
          console.warn("[OneTap] prompt failed", promptError);
        }
      } catch (error) {
        console.warn("[OneTap] Unable to start Google One Tap", error);
      }
    };

    startPrompt();

    return () => {
      cancelled = true;
      if (window.google?.accounts?.id?.cancel) {
        window.google.accounts.id.cancel();
      }
    };
  }, [allowedOrigins, clientId, isAuthenticated, loading, location, setAuth]);

  return null;
};

export default GoogleOneTap;
