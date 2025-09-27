import { createContext, useContext, useEffect, useMemo, useState } from "react";
import apiClient from "../services/apiClient";

const storageKey = "gradus_admin_auth_v1";
const initialAuthState = { token: null, admin: null };

const AuthContext = createContext(null);

const AuthProvider = ({ children }) => {
  const [authState, setAuthState] = useState(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === "object") {
          return {
            token: parsed.token || null,
            admin: parsed.admin || null,
          };
        }
      }
    } catch (error) {
      console.warn("[auth] Failed to parse stored auth state", error);
    }
    return initialAuthState;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      if (!authState.token) {
        if (!cancelled) {
          setLoading(false);
        }
        return;
      }

      try {
        const profile = await apiClient("/admin/auth/me", {
          token: authState.token,
        });
        if (!cancelled) {
          setAuthState((prev) => ({ ...prev, admin: profile }));
        }
      } catch (error) {
        if (!cancelled) {
          setAuthState(initialAuthState);
          try {
            localStorage.removeItem(storageKey);
          } catch (storageError) {
            console.warn("[auth] Failed to clear stored auth state", storageError);
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    try {
      if (authState && authState.token) {
        localStorage.setItem(storageKey, JSON.stringify(authState));
      } else {
        localStorage.removeItem(storageKey);
      }
    } catch (error) {
      console.warn("[auth] Failed to persist auth state", error);
    }
  }, [authState]);

  const storeAuthResponse = (response) => {
    if (response && response.token) {
      setAuthState({ token: response.token, admin: response.admin });
    } else {
      setAuthState(initialAuthState);
    }
  };

  const login = async (email, password) => {
    const response = await apiClient("/admin/auth/login", {
      method: "POST",
      data: { email, password },
    });
    storeAuthResponse(response);
    return response;
  };

  const logout = () => {
    storeAuthResponse(null);
  };

  const refreshProfile = async () => {
    if (!authState.token) {
      return null;
    }
    const profile = await apiClient("/admin/auth/me", {
      token: authState.token,
    });
    setAuthState((prev) => ({ ...prev, admin: profile }));
    return profile;
  };

  const value = useMemo(
    () => ({
      admin: authState.admin,
      token: authState.token,
      loading,
      login,
      logout,
      setAuth: storeAuthResponse,
      refreshProfile,
    }),
    [authState, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
};

export { AuthContext, AuthProvider, useAuthContext };