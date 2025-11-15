/*
  AuthContext (public site)
  - Stores user + token in localStorage and provides login/logout helpers
  - Transparently includes token in API calls made during logout
*/
import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import apiClient from "../services/apiClient";

const STORAGE_KEY = "gradus_auth";
const SESSION_DURATION_MS = 5 * 60 * 60 * 1000; // 5 hours

const AuthContext = createContext({
  user: null,
  token: null,
  isAuthenticated: false,
  loading: true,
  setAuth: () => {},
  updateUser: () => {},
  logout: () => {},
});

export const AuthProvider = ({ children }) => {
  const [state, setState] = useState({
    user: null,
    token: null,
    expiresAt: null,
    loading: true,
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const expiresAt = parsed.expiresAt ?? null;
        const isExpired = expiresAt ? Date.now() >= expiresAt : false;
        if (isExpired) {
          localStorage.removeItem(STORAGE_KEY);
          setState({ user: null, token: null, expiresAt: null, loading: false });
        } else {
          setState({
            user: parsed.user || null,
            token: parsed.token || null,
            expiresAt,
            loading: false,
          });
        }
      } else {
        setState((prev) => ({ ...prev, loading: false }));
      }
    } catch (error) {
      console.error("[Auth] Failed to parse stored credentials", error);
      localStorage.removeItem(STORAGE_KEY);
      setState({ user: null, token: null, expiresAt: null, loading: false });
    }
  }, []);

  const persist = useCallback((authPayload) => {
    if (authPayload && authPayload.token) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          token: authPayload.token,
          user: authPayload.user,
          expiresAt: authPayload.expiresAt,
        })
      );
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const setAuth = useCallback(({ token, user, expiresAt }) => {
    const computedExpiry = expiresAt ?? Date.now() + SESSION_DURATION_MS;
    persist({ token, user, expiresAt: computedExpiry });
    setState({ token, user, expiresAt: computedExpiry, loading: false });
  }, [persist]);

  const updateUser = useCallback(
    (user) => {
      setState((prev) => {
        const next = { ...prev, user };
        persist({ token: next.token, user, expiresAt: next.expiresAt });
        return next;
      });
    },
    [persist]
  );

  const logout = useCallback(() => {
    const currentToken = state.token;
    if (currentToken) {
      apiClient.post("/auth/logout", undefined, { token: currentToken }).catch((error) => {
        console.warn("[Auth] Failed to record logout", error);
      });
    }

    persist(null);
    setState({ user: null, token: null, expiresAt: null, loading: false });
  }, [persist, state.token]);

  useEffect(() => {
    if (!state.token || !state.expiresAt) return undefined;

    const remaining = state.expiresAt - Date.now();
    if (remaining <= 0) {
      logout();
      return undefined;
    }

    const timeoutId = setTimeout(logout, remaining);
    return () => clearTimeout(timeoutId);
  }, [state.token, state.expiresAt, logout]);

  const value = useMemo(
    () => ({
      user: state.user,
      token: state.token,
      sessionExpiresAt: state.expiresAt,
      loading: state.loading,
      isAuthenticated: Boolean(state.token),
      setAuth,
      updateUser,
      logout,
    }),
    [state, setAuth, updateUser, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);

