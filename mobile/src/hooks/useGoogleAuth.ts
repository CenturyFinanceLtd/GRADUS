/**
 * Google OAuth Hook for React Native
 * Uses expo-auth-session for Google authentication
 */

import { useEffect, useState, useCallback } from 'react';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { apiClient } from '../services';
import { useAuth } from '../context';
import { AuthResponse } from '../types';

// Complete auth session on web
WebBrowser.maybeCompleteAuthSession();

// Google OAuth client IDs
// Note: You need to create these in Google Cloud Console
const GOOGLE_CONFIG = {
    expoClientId: 'YOUR_EXPO_CLIENT_ID.apps.googleusercontent.com',
    iosClientId: 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com',
    androidClientId: 'YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com',
    webClientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',
};

interface UseGoogleAuthReturn {
    signInWithGoogle: () => Promise<void>;
    loading: boolean;
    error: string | null;
}

export const useGoogleAuth = (): UseGoogleAuthReturn => {
    const { setAuth } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [request, response, promptAsync] = Google.useAuthRequest({
        clientId: GOOGLE_CONFIG.webClientId,
        iosClientId: GOOGLE_CONFIG.iosClientId,
        androidClientId: GOOGLE_CONFIG.androidClientId,
        scopes: ['profile', 'email'],
    });

    // Handle the response from Google
    useEffect(() => {
        const handleResponse = async () => {
            if (response?.type === 'success') {
                setLoading(true);
                setError(null);

                try {
                    const { authentication } = response;

                    if (!authentication?.accessToken) {
                        throw new Error('No access token received');
                    }

                    // Send the Google token to your backend for verification
                    const result = await apiClient.post<AuthResponse>('/auth/google/mobile', {
                        accessToken: authentication.accessToken,
                        idToken: authentication.idToken,
                    });

                    if (result.success && result.token) {
                        await setAuth({
                            token: result.token,
                            user: result.user,
                        });
                    } else {
                        setError(result.message || 'Google authentication failed');
                    }
                } catch (err: any) {
                    console.error('Google auth error:', err);
                    setError(err.message || 'Failed to authenticate with Google');
                } finally {
                    setLoading(false);
                }
            } else if (response?.type === 'error') {
                setError(response.error?.message || 'Google sign-in was cancelled');
            }
        };

        handleResponse();
    }, [response, setAuth]);

    const signInWithGoogle = useCallback(async () => {
        setError(null);
        if (request) {
            await promptAsync();
        } else {
            setError('Google authentication is not configured');
        }
    }, [request, promptAsync]);

    return {
        signInWithGoogle,
        loading,
        error,
    };
};

export default useGoogleAuth;
