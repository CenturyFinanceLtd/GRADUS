/**
 * AuthContext for GRADUS Mobile App
 * Ported from frontend/src/context/AuthContext.jsx
 * Uses expo-secure-store instead of localStorage
 */

import React, { createContext, useContext, useEffect, useMemo, useState, useCallback, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { apiClient, setAuthToken } from '../services';
import { User, AuthResponse, LoginCredentials, RegisterData } from '../types';

const STORAGE_KEY = 'gradus_auth';
const SESSION_DURATION_MS = 5 * 60 * 60 * 1000; // 5 hours

interface StoredAuth {
    token: string;
    user: User;
    expiresAt: number;
}

interface AuthState {
    user: User | null;
    token: string | null;
    expiresAt: number | null;
    loading: boolean;
}

interface AuthContextValue {
    user: User | null;
    token: string | null;
    sessionExpiresAt: number | null;
    loading: boolean;
    isAuthenticated: boolean;
    setAuth: (data: { token: string; user: User; expiresAt?: number }) => Promise<void>;
    updateUser: (user: User) => Promise<void>;
    logout: () => Promise<void>;
    login: (credentials: LoginCredentials) => Promise<AuthResponse>;
    register: (data: RegisterData) => Promise<AuthResponse>;
}

const AuthContext = createContext<AuthContextValue>({
    user: null,
    token: null,
    sessionExpiresAt: null,
    loading: true,
    isAuthenticated: false,
    setAuth: async () => { },
    updateUser: async () => { },
    logout: async () => { },
    login: async () => ({ success: false, token: '', user: {} as User }),
    register: async () => ({ success: false, token: '', user: {} as User }),
});

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [state, setState] = useState<AuthState>({
        user: null,
        token: null,
        expiresAt: null,
        loading: true,
    });

    // Load stored auth on mount
    useEffect(() => {
        const loadStoredAuth = async () => {
            try {
                const stored = await SecureStore.getItemAsync(STORAGE_KEY);
                if (stored) {
                    const parsed: StoredAuth = JSON.parse(stored);
                    const expiresAt = parsed.expiresAt ?? null;
                    const isExpired = expiresAt ? Date.now() >= expiresAt : false;

                    if (isExpired) {
                        await SecureStore.deleteItemAsync(STORAGE_KEY);
                        setState({ user: null, token: null, expiresAt: null, loading: false });
                    } else {
                        setAuthToken(parsed.token);
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
                console.error('[Auth] Failed to parse stored credentials', error);
                await SecureStore.deleteItemAsync(STORAGE_KEY);
                setState({ user: null, token: null, expiresAt: null, loading: false });
            }
        };

        loadStoredAuth();
    }, []);

    const persist = useCallback(async (authPayload: StoredAuth | null) => {
        if (authPayload && authPayload.token) {
            await SecureStore.setItemAsync(
                STORAGE_KEY,
                JSON.stringify({
                    token: authPayload.token,
                    user: authPayload.user,
                    expiresAt: authPayload.expiresAt,
                })
            );
        } else {
            await SecureStore.deleteItemAsync(STORAGE_KEY);
        }
    }, []);

    const setAuth = useCallback(async ({ token, user, expiresAt }: { token: string; user: User; expiresAt?: number }) => {
        const computedExpiry = expiresAt ?? Date.now() + SESSION_DURATION_MS;
        setAuthToken(token);
        await persist({ token, user, expiresAt: computedExpiry });
        setState({ token, user, expiresAt: computedExpiry, loading: false });
    }, [persist]);

    const updateUser = useCallback(async (user: User) => {
        setState((prev) => {
            const next = { ...prev, user };
            persist({ token: next.token!, user, expiresAt: next.expiresAt! });
            return next;
        });
    }, [persist]);

    const logout = useCallback(async () => {
        const currentToken = state.token;
        if (currentToken) {
            try {
                await apiClient.post('/auth/logout');
            } catch (error) {
                console.warn('[Auth] Failed to record logout', error);
            }
        }

        setAuthToken(null);
        await persist(null);
        setState({ user: null, token: null, expiresAt: null, loading: false });
    }, [persist, state.token]);

    // Login function
    const login = useCallback(async (credentials: LoginCredentials): Promise<AuthResponse> => {
        const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
        if (response.success && response.token) {
            await setAuth({ token: response.token, user: response.user });
        }
        return response;
    }, [setAuth]);

    // Register function
    const register = useCallback(async (data: RegisterData): Promise<AuthResponse> => {
        const response = await apiClient.post<AuthResponse>('/auth/register', data);
        if (response.success && response.token) {
            await setAuth({ token: response.token, user: response.user });
        }
        return response;
    }, [setAuth]);

    // Auto logout on session expiry
    useEffect(() => {
        if (!state.token || !state.expiresAt) return;

        const remaining = state.expiresAt - Date.now();
        if (remaining <= 0) {
            logout();
            return;
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
            login,
            register,
        }),
        [state, setAuth, updateUser, logout, login, register]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
