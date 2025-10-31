/*
  Admin AuthContext
  - Persists admin token/profile, fetches permissions, and exposes helpers
*/
import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import PropTypes from 'prop-types';
import apiClient from "../services/apiClient";
import { fetchMyPermissions } from "../services/adminPermissions";

const storageKey = "gradus_admin_auth_v1";
const initialAuthState = { token: null, admin: null, permissions: null };

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
            permissions: parsed.permissions || null,
          };
        }
      }
    } catch (error) {
      console.warn("[auth] Failed to parse stored auth state", error);
    }
    return initialAuthState;
  });
  const [loading, setLoading] = useState(true);
  const [permissionsLoading, setPermissionsLoading] = useState(false);

  const fetchPermissions = useCallback(
    async (explicitToken) => {
      const tokenToUse = explicitToken || authState.token;

      if (!tokenToUse) {
        setAuthState((prev) => ({ ...prev, permissions: null }));
        return [];
      }

      setPermissionsLoading(true);
      try {
        const response = await fetchMyPermissions(tokenToUse);
        const allowedPages = Array.isArray(response?.allowedPages)
          ? response.allowedPages
          : [];
        setAuthState((prev) => ({ ...prev, permissions: { allowedPages } }));
        return allowedPages;
      } catch (error) {
        console.warn("[auth] Failed to load permissions", error);
        setAuthState((prev) => ({ ...prev, permissions: { allowedPages: [] } }));
        return [];
      } finally {
        setPermissionsLoading(false);
      }
    },
    [authState.token]
  );

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      if (!authState.token) {
        if (!cancelled) {
          setLoading(false);
          setPermissionsLoading(false);
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
        await fetchPermissions(authState.token);
      } catch {
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
          setPermissionsLoading(false);
        }
      }
    };

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, [authState.token, fetchPermissions]);

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
      setAuthState({ token: response.token, admin: response.admin, permissions: null });
    } else {
      setAuthState(initialAuthState);
    }
  };

  const login = useCallback(async (email, password) => {
    const response = await apiClient("/admin/auth/login", {
      method: "POST",
      data: { email, password },
    });
    storeAuthResponse(response);
    await fetchPermissions(response.token);
    return response;
  }, [fetchPermissions]);

  const logout = useCallback(() => {
    storeAuthResponse(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!authState.token) {
      return null;
    }
    const profile = await apiClient("/admin/auth/me", {
      token: authState.token,
    });
    setAuthState((prev) => ({ ...prev, admin: profile }));
    await fetchPermissions();
    return profile;
  }, [authState.token, fetchPermissions]);

  const value = useMemo(
    () => ({
      admin: authState.admin,
      token: authState.token,
      permissions: authState.permissions,
      loading,
      permissionsLoading,
      login,
      logout,
      setAuth: storeAuthResponse,
      refreshProfile,
      refreshPermissions: fetchPermissions,
    }),
    [authState, loading, permissionsLoading, login, logout, refreshProfile, fetchPermissions]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

AuthProvider.propTypes = {
  children: PropTypes.node,
};

const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
};

export { AuthContext, AuthProvider, useAuthContext };
