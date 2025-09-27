import { Icon } from "@iconify/react/dist/iconify.js";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  startAdminPasswordReset,
  verifyAdminPasswordResetOtp,
  completeAdminPasswordReset,
} from "../services/adminAuth";

const ForgotPasswordLayer = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState("request");
  const [email, setEmail] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [verificationToken, setVerificationToken] = useState("");
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const [password, setPassword] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const resetState = () => {
    setSessionId("");
    setVerificationToken("");
    setOtp("");
    setDevOtp("");
    setPassword({ newPassword: "", confirmPassword: "" });
    setStatus(null);
  };

  const handleRequestSubmit = async (event) => {
    event.preventDefault();
    if (!email.trim()) {
      setStatus({ type: "error", message: "Please enter the email address associated with your account." });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const response = await startAdminPasswordReset({ email: email.trim() });

      if (!response.sessionId) {
        setStatus({
          type: "info",
          message:
            response.message ||
            "If an account with that email exists, we have sent a verification code to it.",
        });
        return;
      }

      setSessionId(response.sessionId);
      setDevOtp(response.devOtp || "");
      setStep("verify");
      setStatus({
        type: "success",
        message: `We sent a verification code to ${response.email}. Enter it below to continue.`,
      });
    } catch (error) {
      setStatus({
        type: "error",
        message: error.message || "We could not start the password reset. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySubmit = async (event) => {
    event.preventDefault();
    if (!otp.trim()) {
      setStatus({ type: "error", message: "Please enter the verification code you received." });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const response = await verifyAdminPasswordResetOtp({ sessionId, otp: otp.trim() });
      setVerificationToken(response.verificationToken);
      setStep("reset");
      setOtp("");
      setStatus({ type: "success", message: "Code verified. Choose a new password." });
    } catch (error) {
      setStatus({
        type: "error",
        message: error.message || "We couldn't verify that code. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (event) => {
    event.preventDefault();
    if (password.newPassword.length < 8) {
      setStatus({ type: "error", message: "Password must be at least 8 characters long." });
      return;
    }

    if (password.newPassword !== password.confirmPassword) {
      setStatus({ type: "error", message: "Password confirmation does not match." });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      await completeAdminPasswordReset({
        sessionId,
        verificationToken,
        password: password.newPassword,
        confirmPassword: password.confirmPassword,
      });
      resetState();
      setStep("done");
      setStatus({ type: "success", message: "Password reset successful. You can now sign in with your new password." });
    } catch (error) {
      setStatus({
        type: "error",
        message: error.message || "We could not reset your password. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStatus = () => {
    if (!status) return null;
    let className = "alert alert-danger py-12 px-16";
    if (status.type === "success") className = "alert alert-success py-12 px-16";
    if (status.type === "info") className = "alert alert-info py-12 px-16";
    return (
      <div className={`${className} mb-24`} role='alert'>
        {status.message}
        {status.type === "success" && step === "verify" && devOtp && (
          <div className='mt-8 text-xs text-secondary-light'>Test code: {devOtp}</div>
        )}
      </div>
    );
  };

  const renderForm = () => {
    if (step === "verify") {
      return (
        <form onSubmit={handleVerifySubmit}>
          <label className='form-label text-sm fw-semibold text-secondary-light'>Verification Code</label>
          <div className='icon-field mb-24'>
            <span className='icon top-50 translate-middle-y'>
              <Icon icon='mdi:onepassword' />
            </span>
            <input
              type='text'
              className='form-control h-56-px bg-neutral-50 radius-12'
              placeholder='Enter the 6-digit code'
              value={otp}
              onChange={(event) => setOtp(event.target.value)}
              disabled={loading}
              required
            />
          </div>
          <button type='submit' className='btn btn-primary w-100 radius-12 py-16' disabled={loading}>
            {loading ? 'Verifying...' : 'Verify Code'}
          </button>
          <button
            type='button'
            className='btn btn-light w-100 radius-12 py-16 mt-16'
            onClick={() => {
              setStep('request');
              resetState();
            }}
            disabled={loading}
          >
            Start Over
          </button>
        </form>
      );
    }

    if (step === "reset") {
      return (
        <form onSubmit={handleResetSubmit}>
          <div className='mb-20'>
            <label className='form-label text-sm fw-semibold text-secondary-light'>New Password</label>
            <input
              type='password'
              className='form-control h-56-px bg-neutral-50 radius-12'
              placeholder='Enter new password'
              value={password.newPassword}
              onChange={(event) =>
                setPassword((prev) => ({ ...prev, newPassword: event.target.value }))
              }
              disabled={loading}
              required
            />
            <span className='mt-8 d-block text-xs text-secondary-light'>Use at least 8 characters.</span>
          </div>
          <div className='mb-24'>
            <label className='form-label text-sm fw-semibold text-secondary-light'>Confirm Password</label>
            <input
              type='password'
              className='form-control h-56-px bg-neutral-50 radius-12'
              placeholder='Re-enter new password'
              value={password.confirmPassword}
              onChange={(event) =>
                setPassword((prev) => ({ ...prev, confirmPassword: event.target.value }))
              }
              disabled={loading}
              required
            />
          </div>
          <button type='submit' className='btn btn-primary w-100 radius-12 py-16' disabled={loading}>
            {loading ? 'Updating...' : 'Reset Password'}
          </button>
        </form>
      );
    }

    if (step === "done") {
      return (
        <div className='text-center'>
          <p className='text-secondary-light mb-24'>Your password has been updated.</p>
          <button
            type='button'
            className='btn btn-primary w-100 radius-12 py-16'
            onClick={() => navigate('/sign-in')}
          >
            Go to Sign In
          </button>
        </div>
      );
    }

    return (
      <form onSubmit={handleRequestSubmit}>
        <div className='icon-field mb-24'>
          <span className='icon top-50 translate-middle-y'>
            <Icon icon='mage:email' />
          </span>
          <input
            type='email'
            className='form-control h-56-px bg-neutral-50 radius-12'
            placeholder='Enter your admin email'
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={loading}
            required
          />
        </div>
        <button type='submit' className='btn btn-primary w-100 radius-12 py-16' disabled={loading}>
          {loading ? 'Sending...' : 'Send Verification Code'}
        </button>
      </form>
    );
  };

  return (
    <section className='auth forgot-password-page bg-base d-flex flex-wrap'>
      <div className='auth-left d-lg-block d-none'>
        <div className='d-flex align-items-center flex-column h-100 justify-content-center'>
          <img src='assets/images/auth/forgot-pass-img.png' alt='Gradus admin password reset' />
        </div>
      </div>
      <div className='auth-right py-32 px-24 d-flex flex-column justify-content-center'>
        <div className='max-w-464-px mx-auto w-100'>
          <div className='mb-24'>
            <h4 className='mb-12'>Reset your password</h4>
            <p className='mb-0 text-secondary-light text-lg'>
              {step === 'request' && 'Enter the email address linked to your admin account and we will send you a verification code.'}
              {step === 'verify' && 'Check your inbox for the verification code. Enter it below to continue.'}
              {step === 'reset' && 'Set a new password for your account.'}
              {step === 'done' && 'All set! Use your new password the next time you sign in.'}
            </p>
          </div>

          {renderStatus()}

          {renderForm()}

          <div className='text-center mt-32'>
            <Link to='/sign-in' className='text-primary-600 fw-bold'>Back to Sign In</Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ForgotPasswordLayer;