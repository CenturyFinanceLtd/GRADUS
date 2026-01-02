import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { supabase } from "../services/supabaseClient.js";
import apiClient from "../services/apiClient.js";
import Preloader from "../helper/Preloader.jsx";

/**
 * Simple Google OAuth Callback Handler
 * 
 * Flow:
 * 1. User clicks "Continue with Google"
 * 2. Supabase redirects to Google
 * 3. Google redirects to Supabase callback
 * 4. Supabase redirects here with session in URL hash
 * 5. We detect the session and log the user in
 */
const GoogleAuthCallback = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuth();
  const [error, setError] = useState(null);
  const [processed, setProcessed] = useState(false);

  useEffect(() => {
    if (processed) return;

    const handleAuth = async () => {
      try {
        // Check for error in URL
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const queryParams = new URLSearchParams(window.location.search);

        const errorMessage = hashParams.get("error_description") ||
          queryParams.get("error_description") ||
          hashParams.get("error") ||
          queryParams.get("error");

        if (errorMessage) {
          throw new Error(errorMessage);
        }

        // Wait for Supabase to process the session
        // The session is automatically handled by Supabase client from URL hash
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!session) {
          // No session yet, set up listener to wait for it
          const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
            if (event === 'SIGNED_IN' && newSession) {
              subscription.unsubscribe();
              await processSession(newSession);
            }
          });

          // Timeout after 10 seconds
          setTimeout(() => {
            subscription.unsubscribe();
            if (!processed) {
              setError("Login timed out. Please try again.");
            }
          }, 10000);

          return;
        }

        await processSession(session);
      } catch (err) {
        console.error("Google auth error:", err);
        setError(err.message || "Authentication failed");
        setProcessed(true);

        // Redirect to sign-in after 3 seconds
        setTimeout(() => {
          navigate("/sign-in", { replace: true });
        }, 3000);
      }
    };

    const processSession = async (session) => {
      setProcessed(true);

      // Sync user profile to database
      try {
        await apiClient("/auth/supabase/create-profile", {
          method: "POST",
          data: {
            supabaseId: session.user.id,
            email: session.user.email,
            firstName: session.user.user_metadata?.first_name ||
              session.user.user_metadata?.full_name?.split(" ")[0] || "",
            lastName: session.user.user_metadata?.last_name ||
              session.user.user_metadata?.full_name?.split(" ").slice(1).join(" ") || "",
            phone: session.user.user_metadata?.phone || session.user.user_metadata?.mobile || null,
          },
        });
      } catch (profileError) {
        console.warn("Profile sync warning:", profileError);
        // Don't block login if profile sync fails
      }

      // Set auth context
      setAuth({
        user: session.user,
        token: session.access_token,
        type: "supabase",
      });

      // Navigate to dashboard
      navigate("/", { replace: true });
    };

    handleAuth();
  }, [navigate, setAuth, processed]);

  if (error) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        flexDirection: 'column',
        gap: '1rem',
        fontFamily: 'system-ui, sans-serif'
      }}>
        <div style={{ fontSize: '3rem' }}>❌</div>
        <h2 style={{ color: '#ef4444', margin: 0 }}>Authentication Failed</h2>
        <p style={{ color: '#666' }}>{error}</p>
        <p style={{ color: '#888', fontSize: '0.9rem' }}>Redirecting to sign in...</p>
      </div>
    );
  }

  return <Preloader />;
};

export default GoogleAuthCallback;
