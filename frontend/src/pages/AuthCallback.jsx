/*
  OAuth Callback Page
  - Handles redirect from Google OAuth
  - Creates user profile if needed
  - Redirects to dashboard
*/
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { handleOAuthCallback } from '../services/authService';
import { useAuth } from '../context/AuthContext';

const AuthCallback = () => {
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { setAuth } = useAuth();

    useEffect(() => {
        const processCallback = async () => {
            try {
                const authData = await handleOAuthCallback();

                // Set auth in context
                setAuth({
                    user: authData.user,
                    token: authData.token,
                    authType: 'supabase',
                    expiresAt: new Date(authData.session.expires_at * 1000).getTime(),
                });

                // Redirect to dashboard or home
                navigate('/dashboard', { replace: true });
            } catch (err) {
                console.error('OAuth callback error:', err);
                setError(err.message || 'Authentication failed');
                setLoading(false);

                // Redirect to login after error
                setTimeout(() => {
                    navigate('/login', { replace: true });
                }, 3000);
            }
        };

        processCallback();
    }, [navigate, setAuth]);

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100vh',
                flexDirection: 'column',
                gap: '1rem'
            }}>
                <div style={{ fontSize: '2rem' }}>⏳</div>
                <p>Completing sign in...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100vh',
                flexDirection: 'column',
                gap: '1rem'
            }}>
                <div style={{ fontSize: '2rem', color: '#ef4444' }}>❌</div>
                <p style={{ color: '#ef4444' }}>Authentication failed: {error}</p>
                <p>Redirecting to login...</p>
            </div>
        );
    }

    return null;
};

export default AuthCallback;
