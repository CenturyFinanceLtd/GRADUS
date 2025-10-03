import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import apiClient from "../services/apiClient.js";

const STEPS = {
  REQUEST: "REQUEST",
  VERIFY: "VERIFY",
  RESET: "RESET",
  DONE: "DONE",
};

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 30;

const ForgotPasswordInner = () => {
  const [step, setStep] = useState(STEPS.REQUEST);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [sessionId, setSessionId] = useState(null);
  const [verificationToken, setVerificationToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (!resendCooldown) {
      return;
    }

    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [resendCooldown]);

  const maskedEmail = useMemo(() => {
    const value = email.trim().toLowerCase();
    if (!value || !value.includes("@")) {
      return value;
    }
    const [local, domain] = value.split("@");
    const visibleLocal = local.slice(0, 2);
    const maskedLocal = `${visibleLocal}${"*".repeat(Math.max(0, local.length - 2))}`;
    return `${maskedLocal}@${domain}`;
  }, [email]);

  const trimmedEmail = email.trim();
  const trimmedOtp = otp.trim();
  const trimmedPassword = password.trim();
  const trimmedConfirmPassword = confirmPassword.trim();

  const disableRequest = !trimmedEmail || loading;
  const disableVerify = !trimmedOtp || loading;
  const disableReset =
    !trimmedPassword ||
    trimmedPassword.length < 8 ||
    trimmedPassword !== trimmedConfirmPassword ||
    loading;

  const handleRequest = async (event) => {
    event.preventDefault();

    if (disableRequest) {
      return;
    }

    setLoading(true);
    setError("");
    setInfo("");
    setOtp("");
    setSessionId(null);
    setVerificationToken(null);

    try {
      const response = await apiClient.post("/auth/password/reset/start", {
        email: trimmedEmail,
      });

      if (response.sessionId) {
        setSessionId(response.sessionId);
        setStep(STEPS.VERIFY);
        setInfo(
          "We sent a 6-digit verification code to your email address. Enter it below to continue."
        );
        setResendCooldown(RESEND_COOLDOWN);
      } else {
        setInfo(
          response.message ||
            "If the email matches an account, we have sent a verification code."
        );
      }
    } catch (err) {
      setError(err.message || "Unable to start the password reset. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (event) => {
    event.preventDefault();

    if (disableVerify || !sessionId) {
      if (!sessionId) {
        setError("Please request a new verification code to continue.");
      }
      return;
    }

    setLoading(true);
    setError("");
    setInfo("");

    try {
      const response = await apiClient.post("/auth/password/reset/verify-otp", {
        sessionId,
        otp: trimmedOtp,
      });

      setVerificationToken(response.verificationToken);
      setStep(STEPS.RESET);
      setInfo("Email verified. You can now create a new password.");
      setOtp("");
    } catch (err) {
      setError(err.message || "Unable to verify the code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (event) => {
    event.preventDefault();

    if (disableReset || !sessionId || !verificationToken) {
      if (!sessionId || !verificationToken) {
        setError("Email verification is incomplete. Restart the process to continue.");
      }
      return;
    }

    setLoading(true);
    setError("");
    setInfo("");

    try {
      await apiClient.post("/auth/password/reset/complete", {
        sessionId,
        verificationToken,
        password: trimmedPassword,
        confirmPassword: trimmedConfirmPassword,
      });

      setStep(STEPS.DONE);
      setInfo("Password reset successful. You can now sign in with your new password.");
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err.message || "Unable to reset the password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!sessionId || resendCooldown || resendLoading) {
      return;
    }

    setResendLoading(true);
    setError("");
    setInfo("");

    try {
      const response = await apiClient.post("/auth/password/reset/start", {
        email: trimmedEmail,
      });

      if (response.sessionId) {
        setSessionId(response.sessionId);
      }

      setInfo("We sent another verification code. Check your email.");
      setResendCooldown(RESEND_COOLDOWN);
    } catch (err) {
      setError(err.message || "Unable to resend the verification code. Please try again.");
    } finally {
      setResendLoading(false);
    }
  };

  const handleBackToEmail = () => {
    setStep(STEPS.REQUEST);
    setSessionId(null);
    setVerificationToken(null);
    setOtp("");
    setPassword("");
    setConfirmPassword("");
    setInfo("");
    setError("");
  };

  return (
    <div className='account py-120 position-relative'>
      <div className='container'>
        <div className='row gy-4 align-items-center'>
          <div className='col-lg-6'>
            <div className='bg-main-25 border border-neutral-30 rounded-8 p-32'>
              <div className='mb-40'>
                <h3 className='mb-16 text-neutral-500'>Reset your password</h3>
                <p className='text-neutral-500'>
                  {step === STEPS.REQUEST && "Enter the email associated with your account."}
                  {step === STEPS.VERIFY && "Enter the verification code we emailed you."}
                  {step === STEPS.RESET && "Create a new password for your account."}
                  {step === STEPS.DONE && "Your password has been updated successfully."}
                </p>
              </div>
              {error ? (
                <div className='alert alert-danger text-sm mb-24' role='alert'>
                  {error}
                </div>
              ) : null}
              {info ? (
                <div className='alert alert-success text-sm mb-24' role='status'>
                  {info}
                </div>
              ) : null}
              {step === STEPS.REQUEST ? (
                <form onSubmit={handleRequest}>
                  <div className='mb-24'>
                    <label
                      htmlFor='reset-email'
                      className='fw-medium text-lg text-neutral-500 mb-16'
                    >
                      Enter Your Email ID
                    </label>
                    <input
                      type='email'
                      className='common-input rounded-pill'
                      id='reset-email'
                      name='email'
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder='Enter Your Email...'
                      autoComplete='email'
                      required
                    />
                  </div>
                  <div className='mt-40'>
                    <button
                      type='submit'
                      className='btn btn-main rounded-pill flex-center gap-8 mt-40'
                      disabled={disableRequest}
                    >
                      {loading ? "Sending Code..." : "Send Verification Code"}
                      <i className='ph-bold ph-arrow-up-right d-flex text-lg' />
                    </button>
                  </div>
                </form>
              ) : null}
              {step === STEPS.VERIFY ? (
                <form onSubmit={handleVerify}>
                  <div className='mb-24'>
                    <label
                      htmlFor='reset-otp'
                      className='fw-medium text-lg text-neutral-500 mb-16'
                    >
                      Verification Code
                    </label>
                    <input
                      type='text'
                      inputMode='numeric'
                      maxLength={OTP_LENGTH}
                      className='common-input rounded-pill'
                      id='reset-otp'
                      name='otp'
                      value={otp}
                      onChange={(event) => setOtp(event.target.value.replace(/[^0-9]/g, ""))}
                      placeholder='Enter the 6-digit code...'
                      autoComplete='one-time-code'
                      required
                    />
                  </div>
                  <p className='text-neutral-500 mb-24'>
                    We sent the code to <span className='fw-semibold'>{maskedEmail}</span>.{" "}
                    <button
                      type='button'
                      className='btn btn-link p-0 text-main-600 fw-semibold align-baseline ms-4'
                      onClick={handleBackToEmail}
                    >
                      Change email
                    </button>
                  </p>
                  <div className='d-flex align-items-center gap-16 mb-24'>
                    <button
                      type='button'
                      className='btn btn-outline-main rounded-pill flex-center gap-8'
                      disabled={Boolean(resendCooldown) || resendLoading}
                      onClick={handleResend}
                    >
                      {resendLoading
                        ? "Resending..."
                        : resendCooldown
                        ? `Resend in ${resendCooldown}s`
                        : "Resend Code"}
                    </button>
                  </div>
                  <div className='mt-40'>
                    <button
                      type='submit'
                      className='btn btn-main rounded-pill flex-center gap-8 mt-40'
                      disabled={disableVerify}
                    >
                      {loading ? "Verifying..." : "Verify Code"}
                      <i className='ph-bold ph-arrow-up-right d-flex text-lg' />
                    </button>
                  </div>
                </form>
              ) : null}
              {step === STEPS.RESET ? (
                <form onSubmit={handleReset}>
                  <div className='mb-24'>
                    <label
                      htmlFor='reset-password'
                      className='fw-medium text-lg text-neutral-500 mb-16'
                    >
                      New Password
                    </label>
                    <input
                      type='password'
                      className='common-input rounded-pill'
                      id='reset-password'
                      name='password'
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder='Create a new password...'
                      autoComplete='new-password'
                      required
                    />
                  </div>
                  <div className='mb-24'>
                    <label
                      htmlFor='reset-confirm-password'
                      className='fw-medium text-lg text-neutral-500 mb-16'
                    >
                      Confirm New Password
                    </label>
                    <input
                      type='password'
                      className='common-input rounded-pill'
                      id='reset-confirm-password'
                      name='confirmPassword'
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder='Re-enter your new password...'
                      autoComplete='new-password'
                      required
                    />
                  </div>
                  <p className='text-neutral-500 mb-24'>
                    <button
                      type='button'
                      className='btn btn-link p-0 text-main-600 fw-semibold align-baseline'
                      onClick={handleBackToEmail}
                    >
                      Start over
                    </button>{" "}
                    if you need to request a new code.
                  </p>
                  <div className='mt-40'>
                    <button
                      type='submit'
                      className='btn btn-main rounded-pill flex-center gap-8 mt-40'
                      disabled={disableReset}
                    >
                      {loading ? "Updating Password..." : "Reset Password"}
                      <i className='ph-bold ph-arrow-up-right d-flex text-lg' />
                    </button>
                  </div>
                </form>
              ) : null}
              {step === STEPS.DONE ? (
                <div>
                  <div className='mb-24'>
                    <p className='text-neutral-500'>
                      Your password has been updated. You can now sign in with your new credentials.
                    </p>
                  </div>
                  <div className='mt-40'>
                    <Link to='/sign-in' className='btn btn-main rounded-pill flex-center gap-8 mt-40'>
                      Back to Sign In
                      <i className='ph-bold ph-arrow-up-right d-flex text-lg' />
                    </Link>
                  </div>
                </div>
              ) : null}
              {step !== STEPS.DONE ? (
                <div className='mt-40 text-neutral-500'>
                  Remembered your password?{" "}
                  <Link
                    to='/sign-in'
                    className='fw-semibold text-main-600 hover-text-decoration-underline'
                  >
                    Sign In
                  </Link>
                </div>
              ) : null}
            </div>
          </div>
          <div className='col-lg-6 d-lg-block d-none'>
            <div className='account-img'>
              <img src='/assets/images/thumbs/account-img.png' alt='' />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordInner;

