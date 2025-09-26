import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";

const STORAGE_KEY = "gradus_auth";

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
    loading: true,
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setState({ user: parsed.user || null, token: parsed.token || null, loading: false });
      } else {
        setState((prev) => ({ ...prev, loading: false }));
      }
    } catch (error) {
      console.error("[Auth] Failed to parse stored credentials", error);
      localStorage.removeItem(STORAGE_KEY);
      setState({ user: null, token: null, loading: false });
    }
  }, []);

  const persist = useCallback((authPayload) => {
    if (authPayload && authPayload.token) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ token: authPayload.token, user: authPayload.user })
      );
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const setAuth = useCallback(
    ({ token, user }) => {
      persist({ token, user });
      setState({ token, user, loading: false });
    },
    [persist]
  );

  const updateUser = useCallback(
    (user) => {
      setState((prev) => {
        const next = { ...prev, user };
        persist({ token: next.token, user });
        return next;
      });
    },
    [persist]
  );

  const logout = useCallback(() => {
    persist(null);
    setState({ user: null, token: null, loading: false });
  }, [persist]);

  const value = useMemo(
    () => ({
      user: state.user,
      token: state.token,
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

