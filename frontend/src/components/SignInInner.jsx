import "../styles/auth.css";
import { useCallback, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import apiClient from "../services/apiClient.js";
import { useAuth } from "../context/AuthContext.jsx";
import resolveGoogleRedirectUri from "../utils/googleRedirect.js";
import resolvePostAuthRedirect from "../utils/resolvePostAuthRedirect.js";
import { loginWithGoogle } from "../services/authService.js";

const stepKeys = {
  PHONE: "PHONE",
  OTP: "OTP",
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

    if (currentStep === stepKeys.PHONE) {
      if (!formData.phone.trim()) {
        setError("Please enter your phone number to continue.");
        return;
      }

      setLoading(true);
      try {
        await signInWithPhone(formData.phone);
        setCurrentStep(stepKeys.OTP);
      } catch (err) {
        setError(err.message || "Unable to send OTP. Please try again.");
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);

    try {
      const response = await verifyPhoneOtp(formData.phone, formData.otp);
      setAuth({ token: response.token, user: response.user });

      const effectiveState = redirectPath
        ? { ...location.state, redirectOverride: redirectPath }
        : location.state;

      const redirectTo = resolvePostAuthRedirect({ locationState: effectiveState });
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message || "Invalid OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleBackToPhone = () => {
    setCurrentStep(stepKeys.PHONE);
    setError("");
    setLoading(false);
    setFormData((prev) => ({ ...prev, otp: "" }));
  };

  const renderPhoneStep = () => (
    <>
      <label htmlFor='phone' className='signin-modern__label'>
        Phone Number
      </label>
      <input
        id='phone'
        name='phone'
        type='tel'
        className='signin-modern__input'
        placeholder='+91 99999 99999'
        value={formData.phone}
        onChange={handleChange}
        autoComplete='tel'
      />
      <button type='submit' className='signin-modern__cta' disabled={loading || !formData.phone.trim()}>
        {loading ? "Sending OTP..." : "Continue"}
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
    </>
  );

  const renderOtpStep = () => (
    <>
      <p className='signin-modern__eyebrow'>One-Time Password sent to</p>
      <div className='signin-modern__email-pill'>
        <span>{formData.phone}</span>
        <button type='button' onClick={handleBackToPhone} aria-label='Edit phone'>
          Change
        </button>
      </div>
      <div className='signin-modern__field-group'>
        <label htmlFor='otp' className='signin-modern__label'>
          6-digit OTP
        </label>
        <input
          id='otp'
          name='otp'
          type='text'
          className='signin-modern__input'
          placeholder='000000'
          value={formData.otp}
          onChange={handleChange}
          autoComplete='one-time-code'
          maxLength={6}
          autoFocus
        />
      </div>
      <button type='submit' className='signin-modern__cta' disabled={loading || formData.otp.length < 6}>
        {loading ? "Verifying..." : "Sign in"}
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
          {currentStep === stepKeys.PHONE ? renderPhoneStep() : renderOtpStep()}
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



