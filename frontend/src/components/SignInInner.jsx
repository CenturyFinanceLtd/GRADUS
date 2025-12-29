import "../styles/auth.css";
import { useCallback, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import apiClient from "../services/apiClient.js";
import { useAuth } from "../context/AuthContext.jsx";
import resolveGoogleRedirectUri from "../utils/googleRedirect.js";
import resolvePostAuthRedirect from "../utils/resolvePostAuthRedirect.js";
import { loginWithGoogle } from "../services/authService.js";

const stepKeys = {
  EMAIL: "EMAIL",
  PASSWORD: "PASSWORD",
};

const SignInInner = ({ isModal = false, redirectPath = null }) => {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [currentStep, setCurrentStep] = useState(stepKeys.EMAIL);
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth } = useAuth();
  const googleRedirectUri = useMemo(resolveGoogleRedirectUri, []);
  const googleAvailable = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

  const togglePasswordVisibility = () => {
    setPasswordVisible(!passwordVisible);
  };

  const persistGoogleIntent = useCallback((payload) => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      sessionStorage.setItem("gradus_google_redirect", JSON.stringify(payload));
    } catch (err) {
      console.warn("Failed to persist Google intent", err);
    }
  }, []);

  const handleGoogleSignIn = useCallback(async () => {
    if (!googleAvailable) {
      setError("Google sign-in is not available right now.");
      return;
    }

    setError("");
    setGoogleBusy(true);

    persistGoogleIntent({
      source: "signin",
      redirectOverride: redirectPath || location.state?.redirectTo || null,
      fromPath: location.state?.from?.pathname || null,
      pendingEnrollment: location.state?.pendingEnrollment || null,
    });

    try {
      // Let Supabase handle the full Google OAuth flow
      await loginWithGoogle();
      // loginWithGoogle will redirect away; code below is mostly for safety
    } catch (err) {
      console.error("Failed to start Google sign-in:", err);
      setGoogleBusy(false);
      setError(err.message || "Unable to start Google sign-in. Please refresh and try again.");
    }
  }, [googleAvailable, location.state, persistGoogleIntent, redirectPath]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (currentStep === stepKeys.EMAIL) {
      if (!formData.email.trim()) {
        setError("Please enter your email address to continue.");
        return;
      }

      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(formData.email.trim())) {
        setError("That doesn't look like a valid email.");
        return;
      }

      setCurrentStep(stepKeys.PASSWORD);
      return;
    }

    setLoading(true);

    try {
      const response = await apiClient.post("/auth/login", formData);
      setAuth({ token: response.token, user: response.user });
      const pendingEnrollment = location.state?.pendingEnrollment;

      // Construct effective location state with override if provided
      const effectiveState = redirectPath
        ? { ...location.state, redirectOverride: redirectPath }
        : location.state;

      const redirectTo = resolvePostAuthRedirect({ locationState: effectiveState });
      const nextState =
        pendingEnrollment && redirectTo.includes("/our-courses")
          ? { pendingEnrollment }
          : undefined;

      navigate(redirectTo, { replace: true, state: nextState });
    } catch (err) {
      setError(err.message || "Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleBackToEmail = () => {
    setCurrentStep(stepKeys.EMAIL);
    setPasswordVisible(false);
    setError("");
    setLoading(false);
    setFormData((prev) => ({ ...prev, password: "" }));
  };

  const renderEmailStep = () => (
    <>
      <label htmlFor='email' className='signin-modern__label'>
        Email address
      </label>
      <input
        id='email'
        name='email'
        type='email'
        className='signin-modern__input'
        placeholder='name@domain.com'
        value={formData.email}
        onChange={handleChange}
        autoComplete='email'
      />
      <button type='submit' className='signin-modern__cta' disabled={!formData.email.trim()}>
        Continue
      </button>
      <div className='signin-modern__divider'>
        <span>or</span>
      </div>
      <button
        type='button'
        className='signin-modern__social-btn google'
        onClick={handleGoogleSignIn}
        disabled={!googleAvailable || googleBusy}
        aria-busy={googleBusy}
      >
        <span aria-hidden='true'>G</span> {googleBusy ? "Redirecting..." : "Continue with Google"}
      </button>
      <p className='signin-modern__footer'>
        Don't have an account?{" "}
        <Link to='/sign-up' state={location.state}>
          Sign up
        </Link>
      </p>
    </>
  );

  const renderPasswordStep = () => (
    <>
      <p className='signin-modern__eyebrow'>Signed in as</p>
      <div className='signin-modern__email-pill'>
        <span>{formData.email}</span>
        <button type='button' onClick={handleBackToEmail} aria-label='Edit email'>
          Change
        </button>
      </div>
      <div className='signin-modern__field-group'>
        <label htmlFor='password' className='signin-modern__label'>
          Password
        </label>
        <div className='signin-modern__password'>
          <input
            id='password'
            name='password'
            type={passwordVisible ? "text" : "password"}
            className='signin-modern__input'
            placeholder='Enter your password'
            value={formData.password}
            onChange={handleChange}
            autoComplete='current-password'
          />
          <button
            type='button'
            className='signin-modern__password-toggle'
            onClick={togglePasswordVisibility}
            aria-label={passwordVisible ? "Hide password" : "Show password"}
          >
            <i className={`ph-bold ${passwordVisible ? "ph-eye" : "ph-eye-closed"}`} />
          </button>
        </div>
      </div>
      <button type='submit' className='signin-modern__cta' disabled={loading || !formData.password.trim()}>
        {loading ? "Signing in..." : "Sign in"}
      </button>
      <button
        type='button'
        className='signin-modern__social-btn google signin-modern__social-btn--ghost'
        onClick={handleGoogleSignIn}
        disabled={!googleAvailable || googleBusy}
        aria-busy={googleBusy}
      >
        <span aria-hidden='true'>G</span> Continue with Google
      </button>
      <div className='signin-modern__links'>
        <Link to='/forgot-password'>Forgot password?</Link>
        <span />
        <Link to='/sign-up' state={location.state}>
          Create account
        </Link>
      </div>
    </>
  );

  const content = (
    <div className={`signin-modern__card ${isModal ? "border-0 shadow-none p-0" : ""}`}>
      <div className='signin-modern__logo'>
        <img src='/assets/images/logo/logo.png' alt='Gradus logo' loading='lazy' />
      </div>
      <div className='signin-modern__header'>
        <h1 className='signin-modern__title'>Welcome back</h1>
      </div>
      <form onSubmit={handleSubmit}>
        {error ? (
          <div className='signin-modern__alert signin-modern__alert--error' role='alert' aria-live='assertive'>
            {error}
          </div>
        ) : null}
        <div className='signin-modern__body'>
          {currentStep === stepKeys.EMAIL ? renderEmailStep() : renderPasswordStep()}
        </div>
      </form>
    </div>
  );

  if (isModal) {
    return content;
  }

  return (
    <section className='signin-modern'>
      <div className='signin-modern__shell'>
        {content}
      </div>
    </section>
  );
};

export default SignInInner;



