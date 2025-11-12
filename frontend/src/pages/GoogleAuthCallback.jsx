import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../services/apiClient.js";
import { useAuth } from "../context/AuthContext.jsx";
import resolveGoogleRedirectUri from "../utils/googleRedirect.js";
import resolvePostAuthRedirect from "../utils/resolvePostAuthRedirect.js";
import Preloader from "../helper/Preloader.jsx";

const STORAGE_KEY = "gradus_google_redirect";

const readStoredIntent = () => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw);
  } catch (error) {
    console.warn("Failed to parse stored Google redirect payload", error);
    return null;
  }
};

const consumeStoredIntent = () => {
  const payload = readStoredIntent();
  sessionStorage.removeItem(STORAGE_KEY);
  return payload;
};

const buildLocationStateFromIntent = (intent) => {
  if (!intent) {
    return undefined;
  }

  return {
    redirectTo: intent.redirectOverride || intent.redirectTo,
    redirectOverride: intent.redirectOverride,
    targetPath: intent.targetPath,
    from: intent.fromPath ? { pathname: intent.fromPath } : undefined,
    fromPath: intent.fromPath,
  };
};

const GoogleAuthCallback = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuth();
  const redirectUri = useMemo(resolveGoogleRedirectUri, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authError = params.get("error");
    const code = params.get("code");
    const intent = consumeStoredIntent();

    const redirectWithMessage = (message) => {
      const locationState = buildLocationStateFromIntent(intent);
      const redirectTo = resolvePostAuthRedirect({ locationState });
      navigate(redirectTo || "/sign-in", {
        replace: true,
        state: { ...locationState, authError: message },
      });
    };

    if (authError) {
      redirectWithMessage("Google cancelled the request. Please try again.");
      return;
    }

    if (!code) {
      redirectWithMessage("No authorization code was provided by Google.");
      return;
    }

    const completeLogin = async () => {
      try {
        const response = await apiClient.post("/auth/social/google", {
          code,
          redirectUri,
        });

        setAuth({ token: response.token, user: response.user });

        const locationLikeState = buildLocationStateFromIntent(intent);
        const redirectTo = resolvePostAuthRedirect({ locationState: locationLikeState });
        const nextState =
          intent?.pendingEnrollment && redirectTo.includes("/our-courses")
            ? { pendingEnrollment: intent.pendingEnrollment }
            : undefined;

        navigate(redirectTo, { replace: true, state: nextState });
      } catch (error) {
        redirectWithMessage(error.message || "Unable to complete Google sign-in. Please try again.");
      }
    };

    completeLogin();
  }, [navigate, redirectUri, setAuth]);

  return <Preloader />;
};

export default GoogleAuthCallback;
