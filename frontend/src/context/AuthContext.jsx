/*
  Hybrid AuthContext (Frontend)
  - Supports both legacy JWT and Supabase Auth
  - Listens to Supabase auth state changes
  - Maintains backward compatibility
*/
import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import apiClient from '../services/apiClient';

const STORAGE_KEY = 'gradus_auth';
const SESSION_DURATION_MS = 5 * 60 * 60 * 1000; // 5 hours

const AuthContext = createContext({
  user: null,
  token: null,
  isAuthenticated: false,
  loading: true,
  authType: null, // 'jwt' or 'supabase'
  setAuth: () => { },
  updateUser: () => { },
  logout: () => { },
});

export const AuthProvider = ({ children }) => {
  const [state, setState] = useState({
    user: null,
    token: null,
    expiresAt: null,
    authType: null, // 'jwt' or 'supabase'
    loading: true,
  });

  const fetchProfile = async (accessToken) => {
    try {
      const response = await apiClient.get('/users/me', { token: accessToken });
      const userData = response.user || response;
      // Merge with existing user if needed, or just set it
      setState(prev => ({
        ...prev,
        user: userData,
        token: accessToken,
        loading: false
      }));
    } catch (error) {
      console.error('[Auth] Failed to fetch profile:', error);
      // If 401, maybe logout? For now just stop loading
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  // Load JWT/Session from storage/Supabase on mount
  useEffect(() => {
    let mounted = true;

    // 1. Check LocalStorage (Legacy/JWT)
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.token && (!parsed.expiresAt || Date.now() < parsed.expiresAt)) {
          // We have a token. Let's Optimistically set state, THEN fetch fresh profile
          setState({
            user: parsed.user, // Use stale data first for speed
            token: parsed.token,
            expiresAt: parsed.expiresAt,
            authType: parsed.authType || 'jwt',
            loading: false
          });

          // Fetch fresh data in background to fix any stale fields
          fetchProfile(parsed.token);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch (e) {
      console.error(e);
      localStorage.removeItem(STORAGE_KEY);
    }

    // 2. Check Supabase (New)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && mounted) {
        // Supabase session takes precedence or overwrites
        fetchProfile(session.access_token).then(() => {
          if (mounted) {
            setState(prev => ({
              ...prev,
              authType: 'supabase',
              expiresAt: new Date(session.expires_at * 1000).getTime()
            }));
          }
        });
      } else if (mounted) {
        setState(prev => ({ ...prev, loading: false }));
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        fetchProfile(session.access_token);
      } else if (event === 'SIGNED_OUT') {
        setState({ user: null, token: null, expiresAt: null, authType: null, loading: false });
        localStorage.removeItem(STORAGE_KEY);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const persist = useCallback((authPayload) => {
    if (authPayload && authPayload.token && authPayload.authType === 'jwt') {
      // Only persist JWT sessions to localStorage
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          token: authPayload.token,
          user: authPayload.user,
          expiresAt: authPayload.expiresAt,
          authType: 'jwt',
        })
      );
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const setAuth = useCallback(({ token, user, expiresAt, authType = 'jwt' }) => {
    const computedExpiry = expiresAt ?? Date.now() + SESSION_DURATION_MS;
    persist({ token, user, expiresAt: computedExpiry, authType });
    setState({ token, user, expiresAt: computedExpiry, authType, loading: false });
  }, [persist]);

  const updateUser = useCallback(
    (user) => {
      setState((prev) => {
        const next = { ...prev, user };
        if (prev.authType === 'jwt') {
          persist({ token: next.token, user, expiresAt: next.expiresAt, authType: 'jwt' });
        }
        return next;
      });
    },
    [persist]
  );

  const logout = useCallback(async () => {
    const currentAuthType = state.authType;

    // Logout from Supabase if needed
    if (currentAuthType === 'supabase') {
      try {
        await supabase.auth.signOut();
      } catch (error) {
        console.error('[Auth] Supabase logout failed:', error);
      }
    }

    // Logout from backend if JWT
    if (currentAuthType === 'jwt' && state.token) {
      try {
        await apiClient.post('/auth/logout', undefined, { token: state.token });
      } catch (error) {
        console.warn('[Auth] Backend logout failed:', error);
      }
    }

    persist(null);
    setState({ user: null, token: null, expiresAt: null, authType: null, loading: false });
  }, [persist, state.token, state.authType]);

  // Auto-logout for JWT sessions when expired
  useEffect(() => {
    if (state.authType !== 'jwt' || !state.token || !state.expiresAt) return undefined;

    const remaining = state.expiresAt - Date.now();
    if (remaining <= 0) {
      logout();
      return undefined;
    }

    const timeoutId = setTimeout(logout, remaining);
    return () => clearTimeout(timeoutId);
  }, [state.token, state.expiresAt, state.authType, logout]);

  const value = useMemo(
    () => ({
      user: state.user,
      token: state.token,
      sessionExpiresAt: state.expiresAt,
      authType: state.authType,
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
