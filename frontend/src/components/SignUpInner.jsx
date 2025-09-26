import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import apiClient from "../services/apiClient.js";
import { useAuth } from "../context/AuthContext.jsx";

const steps = {
  DETAILS: 1,
  OTP: 2,
  PASSWORD: 3,
};

const SignUpInner = () => {
  const [currentStep, setCurrentStep] = useState(steps.DETAILS);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    mobile: "",
    otp: "",
    password: "",
    confirmPassword: "",
  });
  const [sessionId, setSessionId] = useState(null);
  const [verificationToken, setVerificationToken] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuth();
  const navigate = useNavigate();

  const stepTitle = useMemo(() => {
    switch (currentStep) {
      case steps.OTP:
        return "Verify your email";
      case steps.PASSWORD:
        return "Set your password";
      default:
        return "Let's Get Started!";
    }
  }, [currentStep]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const startRegistration = async ({ isResend = false } = {}) => {
    const payload = {
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      email: formData.email.trim(),
      mobile: formData.mobile.trim(),
    };

    const response = await apiClient.post("/auth/signup/start", payload);
    setSessionId(response.sessionId);
    setVerificationToken(null);

    if (response.devOtp) {
      setMessage("Dev mode: use verification code " + response.devOtp + " to continue.");
      setFormData((prev) => ({ ...prev, otp: response.devOtp }));
    } else {
      const notification = isResend
        ? "A new verification code has been sent to " + payload.email + "."
        : "We've sent a verification code to " + payload.email + ".";
      setMessage(notification);
    }

    setCurrentStep(steps.OTP);
    return response;
  };

  const verifyOtp = async () => {
    const response = await apiClient.post("/auth/signup/verify-otp", {
      sessionId,
      otp: formData.otp.trim(),
    });

    setVerificationToken(response.verificationToken);
    setMessage("Email verified! Set a strong password to finish.");
    setCurrentStep(steps.PASSWORD);
  };

  const completeRegistration = async () => {
    const payload = {
      sessionId,
      verificationToken,
      password: formData.password,
      confirmPassword: formData.confirmPassword,
    };

    const response = await apiClient.post("/auth/signup/complete", payload);
    setAuth({ token: response.token, user: response.user });
    navigate("/profile", { replace: true });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      if (currentStep === steps.DETAILS) {
        await startRegistration();
      } else if (currentStep === steps.OTP) {
        await verifyOtp();
      } else {
        await completeRegistration();
      }
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!formData.email || !formData.firstName || !formData.lastName || !formData.mobile) {
      setError("Please go back and fill in your details first.");
      return;
    }

    setError("");
    setMessage("");
    setLoading(true);

    try {
      await startRegistration({ isResend: true });
    } catch (err) {
      setError(err.message || "Unable to resend the code right now.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    setCurrentStep(steps.DETAILS);
    setSessionId(null);
    setVerificationToken(null);
    setFormData((prev) => ({
      ...prev,
      otp: "",
      password: "",
      confirmPassword: "",
    }));
  };

  const renderStepFields = () => {
    switch (currentStep) {
      case steps.OTP:
        return (
          <>
            <div className='col-sm-12'>
              <label
                htmlFor='otp'
                className='fw-medium text-lg text-neutral-500 mb-16'
              >
                Enter the 6-digit code sent to {formData.email}
              </label>
              <input
                type='text'
                className='common-input rounded-pill text-center letter-spacing-2'
                id='otp'
                name='otp'
                value={formData.otp}
                onChange={handleChange}
                placeholder='Enter OTP'
                autoComplete='one-time-code'
                required
              />
            </div>
            <div className='col-sm-12 d-flex justify-content-between'>
              <button
                type='button'
                className='btn border border-neutral-40 text-neutral-500 rounded-pill'
                onClick={handleGoBack}
                disabled={loading}
              >
                Back
              </button>
              <button
                type='button'
                className='btn text-main-600 hover-text-decoration-underline'
                onClick={handleResendOtp}
                disabled={loading}
              >
                Resend code
              </button>
            </div>
          </>
        );
      case steps.PASSWORD:
        return (
          <>
            <div className='col-sm-12'>
              <label
                htmlFor='password'
                className='fw-medium text-lg text-neutral-500 mb-16'
              >
                Create Password
              </label>
              <div className='position-relative'>
                <input
                  type={passwordVisible ? "text" : "password"}
                  className='common-input rounded-pill pe-44'
                  id='password'
                  name='password'
                  value={formData.password}
                  onChange={handleChange}
                  placeholder='Enter a strong password...'
                  autoComplete='new-password'
                  required
                />
                <span
                  className={`toggle-password position-absolute top-50 inset-inline-end-0 me-16 translate-middle-y ph-bold ${
                    passwordVisible ? "ph-eye" : "ph-eye-closed"
                  }`}
                  onClick={() => setPasswordVisible((prev) => !prev)}
                ></span>
              </div>
            </div>
            <div className='col-sm-12'>
              <label
                htmlFor='confirmPassword'
                className='fw-medium text-lg text-neutral-500 mb-16'
              >
                Confirm Password
              </label>
              <div className='position-relative'>
                <input
                  type={confirmPasswordVisible ? "text" : "password"}
                  className='common-input rounded-pill pe-44'
                  id='confirmPassword'
                  name='confirmPassword'
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder='Re-enter your password...'
                  autoComplete='new-password'
                  required
                />
                <span
                  className={`toggle-password position-absolute top-50 inset-inline-end-0 me-16 translate-middle-y ph-bold ${
                    confirmPasswordVisible ? "ph-eye" : "ph-eye-closed"
                  }`}
                  onClick={() => setConfirmPasswordVisible((prev) => !prev)}
                ></span>
              </div>
            </div>
          </>
        );
      default:
        return (
          <>
            <div className='col-sm-6'>
              <label
                htmlFor='fname'
                className='fw-medium text-lg text-neutral-500 mb-16'
              >
                First Name
              </label>
              <input
                type='text'
                className='common-input rounded-pill'
                id='fname'
                name='firstName'
                value={formData.firstName}
                onChange={handleChange}
                placeholder='Enter Your First Name'
                autoComplete='given-name'
                required
              />
            </div>
            <div className='col-sm-6'>
              <label
                htmlFor='lname'
                className='fw-medium text-lg text-neutral-500 mb-16'
              >                Last Name
              </label>
              <input
                type='text'
                className='common-input rounded-pill'
                id='lname'
                name='lastName'
                value={formData.lastName}
                onChange={handleChange}
                placeholder='Enter Your Last Name'
                autoComplete='family-name'
                required
              />
            </div>
            <div className='col-sm-12'>
              <label
                htmlFor='email'
                className='fw-medium text-lg text-neutral-500 mb-16'
              >
                Enter Your Email ID
              </label>
              <input
                type='email'
                className='common-input rounded-pill'
                id='email'
                name='email'
                value={formData.email}
                onChange={handleChange}
                placeholder='Enter Your Email...'
                autoComplete='email'
                required
              />
            </div>
            <div className='col-sm-12'>
              <label
                htmlFor='mobile'
                className='fw-medium text-lg text-neutral-500 mb-16'
              >
                Mobile Number
              </label>
              <input
                type='tel'
                className='common-input rounded-pill'
                id='mobile'
                name='mobile'
                value={formData.mobile}
                onChange={handleChange}
                placeholder='Enter Your Mobile Number...'
                autoComplete='tel'
                required
              />
            </div>
            <div className='col-sm-12'>
              <p className='text-neutral-500 mt-8'>
                Already have an account?{" "}
                <Link
                  to='/sign-in'
                  className='fw-semibold text-main-600 hover-text-decoration-underline'
                >
                  Sign In
                </Link>
              </p>
            </div>
          </>
        );
    }
  };

  return (
    <div className='account py-120 position-relative'>
      <div className='container'>
        <div className='row gy-4 align-items-center'>
          <div className='col-lg-6'>
            <div className='bg-main-25 border border-neutral-30 rounded-8 p-32'>
              <div className='mb-40'>
                <h3 className='mb-16 text-neutral-500'>{stepTitle}</h3>
                <p className='text-neutral-500'>
                  {currentStep === steps.DETAILS &&
                    "Please enter your details to start your online application."}
                  {currentStep === steps.OTP &&
                    "Enter the one-time password we have emailed to verify your account."}
                  {currentStep === steps.PASSWORD &&
                    "Choose a secure password to finish creating your account."}
                </p>
              </div>
              <form onSubmit={handleSubmit}>
                {error ? (
                  <div className='alert alert-danger text-sm mb-20' role='alert'>
                    {error}
                  </div>
                ) : null}
                {message ? (
                  <div className='alert alert-success text-sm mb-20' role='alert'>
                    {message}
                  </div>
                ) : null}
                <div className='row gy-4'>{renderStepFields()}</div>
                <div className='mt-32'>
                  <button
                    type='submit'
                    className='btn btn-main rounded-pill flex-center gap-8'
                    disabled={loading}
                  >
                    {loading
                      ? 'Please wait...'
                      : currentStep === steps.PASSWORD
                      ? 'Complete Sign Up'
                      : currentStep === steps.OTP
                      ? 'Verify'
                      : 'Next'}
                    <i className='ph-bold ph-arrow-up-right d-flex text-lg' />
                  </button>
                </div>
              </form>
            </div>
          </div>
          <div className='col-lg-6 d-lg-block d-none'>
            <div className='account-img'>
              <img src='assets/images/thumbs/account-img.png' alt='' />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUpInner;












