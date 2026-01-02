/*
  Admin Hybrid AuthContext
  - Supports both legacy JWT and Supabase Auth
  - Verifies admin role from database
  - Fetches permissions for admin dashboard
*/
import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { supabase } from '../services/supabaseClient';
import apiClient from '../services/apiClient';
import { fetchMyPermissions } from '../services/adminPermissions';
import * as authService from '../services/authService'; // Static import to prevent chunk loading errors

const storageKey = 'gradus_admin_auth_v1';
const initialAuthState = { token: null, admin: null, permissions: null, authType: null };

const AuthContext = createContext(null);

const AuthProvider = ({ children }) => {
  const [authState, setAuthState] = useState(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object' && parsed.authType === 'jwt') {
          // Only restore JWT sessions
          return {
            token: parsed.token || null,
            admin: parsed.admin || null,
            permissions: parsed.permissions || null,
            authType: 'jwt',
          };
        }
      }
    } catch (error) {
      console.warn('[admin-auth] Failed to parse stored auth state', error);
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
        const allowedPages = Array.isArray(response?.allowedPages) ? response.allowedPages : [];
        setAuthState((prev) => ({ ...prev, permissions: { allowedPages } }));
        return allowedPages;
      } catch (error) {
        console.warn('[admin-auth] Failed to load permissions', error);
        setAuthState((prev) => ({ ...prev, permissions: { allowedPages: [] } }));
        return [];
      } finally {
        setPermissionsLoading(false);
      }
    },
    [authState.token]
  );

  // Check for Supabase session on mount
  useEffect(() => {
    let cancelled = false;

    const checkSupabaseSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session && !cancelled) {
        try {
          const profile = await apiClient('/admin/auth/me', { token: session.access_token });
          if (!cancelled) {
            setAuthState({
              token: session.access_token,
              admin: profile,
              permissions: null,
              authType: 'supabase',
            });
            await fetchPermissions(session.access_token);
          }
        } catch (error) {
          if (!cancelled) {
            console.error('[admin-auth] Supabase session invalid', error);
            await supabase.auth.signOut();
            setAuthState(initialAuthState);
          }
        }
      }

      if (!cancelled) {
        setLoading(false);
      }
    };

    checkSupabaseSession();

    return () => {
      cancelled = true;
    };
  }, [fetchPermissions]);

  // Bootstrap JWT session
  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      if (!authState.token || authState.authType !== 'jwt') {
        return;
      }

      try {
        const profile = await apiClient('/admin/auth/me', { token: authState.token });
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
            console.warn('[admin-auth] Failed to clear stored auth state', storageError);
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
  }, []); // Only run once on mount

  // Listen to Supabase auth changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        try {
          const profile = await apiClient('/admin/auth/me', { token: session.access_token });
          setAuthState({
            token: session.access_token,
            admin: profile,
            permissions: null,
            authType: 'supabase',
          });
          await fetchPermissions(session.access_token);
        } catch (error) {
          console.error('[admin-auth] Not authorized as admin', error);
          await supabase.auth.signOut();
          setAuthState(initialAuthState);
        }
      } else if (event === 'SIGNED_OUT') {
        setAuthState(initialAuthState);
        localStorage.removeItem(storageKey);
      } else if (event === 'TOKEN_REFRESHED' && session) {
        setAuthState(prev => ({ ...prev, token: session.access_token }));
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchPermissions]);

  // Persist JWT sessions only
  useEffect(() => {
    try {
      if (authState && authState.token && authState.authType === 'jwt') {
        localStorage.setItem(storageKey, JSON.stringify(authState));
      } else if (authState.authType !== 'supabase') {
        localStorage.removeItem(storageKey);
      }
    } catch (error) {
      console.warn('[admin-auth] Failed to persist auth state', error);
    }
  }, [authState]);

  const storeAuthResponse = (response) => {
    if (response && response.token) {
      setAuthState({
        token: response.token,
        admin: response.admin,
        permissions: null,
        authType: response.type || 'jwt',
      });
    } else {
      setAuthState(initialAuthState);
    }
  };

  const login = useCallback(async (email, password) => {
    const response = await authService.login(email, password);
    storeAuthResponse(response);
    await fetchPermissions(response.token);
    return response;
  }, [fetchPermissions]);

  const logout = useCallback(async () => {
    const currentAuthType = authState.authType;

    if (currentAuthType === 'supabase') {
      try {
        await supabase.auth.signOut();
      } catch (error) {
        console.error('[admin-auth] Supabase logout failed', error);
      }
    }

    storeAuthResponse(null);
  }, [authState.authType]);

  const refreshProfile = useCallback(async () => {
    if (!authState.token) {
      return null;
    }
    const profile = await apiClient('/admin/auth/me', { token: authState.token });
    setAuthState((prev) => ({ ...prev, admin: profile }));
    await fetchPermissions();
    return profile;
  }, [authState.token, fetchPermissions]);

  const value = useMemo(
    () => ({
      admin: authState.admin,
      token: authState.token,
      authType: authState.authType,
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
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

export { AuthContext, AuthProvider, useAuthContext };
