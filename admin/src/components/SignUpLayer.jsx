import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { Link, useNavigate } from "react-router-dom";
import apiClient from "../services/apiClient";
import useAuth from "../hook/useAuth";

const initialDetails = {
  fullName: "",
  email: "",
  phoneNumber: "",
  department: "",
  designation: "",
  languages: "",
  bio: "",

};

const SignUpLayer = () => {
  const navigate = useNavigate();
  const { setAuth, token } = useAuth();

  const [step, setStep] = useState(0);
  const [details, setDetails] = useState(initialDetails);
  const [session, setSession] = useState(null);
  const [otp, setOtp] = useState("");
  const [verificationToken, setVerificationToken] = useState(null);
  const [passwords, setPasswords] = useState({ password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) {
      navigate("/", { replace: true });
    }
  }, [navigate, token]);

  const resetFlow = useCallback(() => {
    setStep(0);
    setDetails(initialDetails);
    setSession(null);
    setOtp("");
    setVerificationToken(null);
    setPasswords({ password: "", confirmPassword: "" });
    setError("");
    setInfo("");
  }, []);

  const fetchSessionStatus = useCallback(async () => {
    if (!session?.sessionId) {
      return null;
    }
    try {
      const response = await apiClient(`/admin/auth/signup/session/${session.sessionId}`);
      setSession((prev) => (prev ? { ...prev, ...response } : response));
      return response;
    } catch (err) {
      setError(err.message || "Unable to refresh approval status.");
      return null;
    }
  }, [session?.sessionId]);

  useEffect(() => {
    if (step !== 1 || !session?.sessionId) {
      return undefined;
    }

    if (session.status && session.status !== "APPROVAL_PENDING") {
      return undefined;
    }

    fetchSessionStatus();
    const intervalId = setInterval(fetchSessionStatus, 10000);
    return () => clearInterval(intervalId);
  }, [fetchSessionStatus, session?.sessionId, session?.status, step]);

  useEffect(() => {
    if (step === 1 && session?.status === "REJECTED") {
      setError("Your signup request was rejected. Please contact the administrator or start over.");
    }
  }, [session?.status, step]);

  const statusCopy = useMemo(
    () => ({
      APPROVAL_PENDING:
        "Waiting for approval. An email has been sent to the approver to confirm your signup request.",
      OTP_PENDING:
        "Approval granted. We have emailed a one-time password to verify your email address.",
      OTP_VERIFIED: "Email verified successfully.",
      REJECTED:
        "Your signup request was rejected. Please contact the administrator if you believe this is a mistake.",
    }),
    []
  );

  const handleDetailsChange = (event) => {
    const { name, value } = event.target;
    setDetails((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordsChange = (event) => {
    const { name, value } = event.target;
    setPasswords((prev) => ({ ...prev, [name]: value }));
  };

  const handleStartSignup = async (event) => {
    event.preventDefault();
    setError("");

    if (!details.fullName.trim() || !details.email.trim() || !details.phoneNumber.trim()) {
      setError("Full name, email, and phone number are required.");
      return;
    }

    try {
      setLoading(true);
      const response = await apiClient("/admin/auth/signup/start", {
        method: "POST",
        data: {
          fullName: details.fullName,
          email: details.email,
          phoneNumber: details.phoneNumber,
          department: details.department,
          designation: details.designation,
          languages: details.languages,
          bio: details.bio,
        },
      });
      setSession(response);
      setInfo(
        `We have asked ${response.approverEmail} to approve your signup. They will assign either the Programmer(Admin) or Admin role and you will receive an OTP at ${response.email} once approved.`
      );
      setStep(1);
    } catch (err) {
      setError(err.message || "Unable to start the signup process. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (event) => {
    event.preventDefault();
    setError("");

    if (!session?.sessionId) {
      setError("Your signup session has expired. Please start over.");
      return;
    }

    if (!otp.trim()) {
      setError("Please enter the verification code that was emailed to you.");
      return;
    }

    try {
      setLoading(true);
      const response = await apiClient("/admin/auth/signup/verify-otp", {
        method: "POST",
        data: {
          sessionId: session.sessionId,
          otp,
        },
      });
      setVerificationToken(response.verificationToken);
      setSession((prev) => (prev ? { ...prev, status: "OTP_VERIFIED" } : prev));
      setStep(2);
      setInfo("Email verified successfully. Create a strong password to finish your account setup.");
    } catch (err) {
      setError(err.message || "The verification code could not be confirmed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteSignup = async (event) => {
    event.preventDefault();
    setError("");

    if (!session?.sessionId) {
      setError("Your signup session has expired. Please start over.");
      return;
    }

    if (!verificationToken) {
      setError("Email verification is required before creating a password.");
      return;
    }

    if (!passwords.password || passwords.password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (passwords.password !== passwords.confirmPassword) {
      setError("Password confirmation does not match.");
      return;
    }

    try {
      setLoading(true);
      const response = await apiClient("/admin/auth/signup/complete", {
        method: "POST",
        data: {
          sessionId: session.sessionId,
          verificationToken,
          password: passwords.password,
          confirmPassword: passwords.confirmPassword,
        },
      });
      setAuth(response);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message || "Unable to complete signup. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    if (step === 0) {
      return (
        <form onSubmit={handleStartSignup} noValidate>
          <div className='row g-3'>
            <div className='col-12'>
              <label className='form-label text-sm fw-semibold text-secondary-light'>Full Name</label>
              <input
                type='text'
                name='fullName'
                value={details.fullName}
                onChange={handleDetailsChange}
                className='form-control bg-neutral-50 radius-12 h-56-px'
                placeholder='Full Name'
                required
                disabled={loading}
              />
            </div>
            <div className='col-12'>
              <label className='form-label text-sm fw-semibold text-secondary-light'>Email</label>
              <input
                type='email'
                name='email'
                value={details.email}
                onChange={handleDetailsChange}
                className='form-control bg-neutral-50 radius-12 h-56-px'
                placeholder='Email Address'
                autoComplete='email'
                required
                disabled={loading}
              />
            </div>
            <div className='col-12'>
              <label className='form-label text-sm fw-semibold text-secondary-light'>Phone Number</label>
              <input
                type='text'
                name='phoneNumber'
                value={details.phoneNumber}
                onChange={handleDetailsChange}
                className='form-control bg-neutral-50 radius-12 h-56-px'
                placeholder='Phone Number'
                autoComplete='tel'
                required
                disabled={loading}
              />
            </div>
            <div className='col-md-6'>
              <label className='form-label text-sm fw-semibold text-secondary-light'>Department</label>
              <input
                type='text'
                name='department'
                value={details.department}
                onChange={handleDetailsChange}
                className='form-control bg-neutral-50 radius-12 h-56-px'
                placeholder='Department'
                disabled={loading}
              />
            </div>
            <div className='col-md-6'>
              <label className='form-label text-sm fw-semibold text-secondary-light'>Designation</label>
              <input
                type='text'
                name='designation'
                value={details.designation}
                onChange={handleDetailsChange}
                className='form-control bg-neutral-50 radius-12 h-56-px'
                placeholder='Designation'
                disabled={loading}
              />
            </div>
            <div className='col-md-6'>
              <label className='form-label text-sm fw-semibold text-secondary-light'>Languages</label>
              <input
                type='text'
                name='languages'
                value={details.languages}
                onChange={handleDetailsChange}
                className='form-control bg-neutral-50 radius-12 h-56-px'
                placeholder='e.g. English, Hindi'
                disabled={loading}
              />
            </div>
            <div className='col-12'>
              <label className='form-label text-sm fw-semibold text-secondary-light'>Bio</label>
              <textarea
                name='bio'
                value={details.bio}
                onChange={handleDetailsChange}
                className='form-control bg-neutral-50 radius-12'
                rows={3}
                placeholder='Share a short bio (optional)'
                disabled={loading}
              />
            </div>
          </div>
          <button
            type='submit'
            className='btn btn-primary text-sm btn-sm px-12 py-16 w-100 radius-12 mt-32'
            disabled={loading}
          >
            {loading ? "Submitting..." : "Next"}
          </button>
        </form>
      );
    }

    if (step === 1) {
      return (
        <form onSubmit={handleVerifyOtp} noValidate>
          <div className='mb-20'>
            <div className='d-flex align-items-center gap-2 mb-12'>
              <Icon icon='solar:shield-check-outline' className='text-primary-600 text-xl' />
              <span className='fw-semibold text-secondary-light text-sm'>Approval status</span>
            </div>
            <p className='text-secondary-light text-sm mb-8'>{info}</p>
            <p className='text-secondary fw-semibold'>
              {statusCopy[session?.status] || "Awaiting confirmation."}
            </p>
            <div className='d-flex align-items-center gap-3 mt-12'>
              <button
                type='button'
                className='btn btn-outline-primary btn-sm'
                onClick={fetchSessionStatus}
                disabled={loading}
              >
                Refresh Status
              </button>
              {session?.status === "REJECTED" && (
                <button type='button' className='btn btn-outline-danger btn-sm' onClick={resetFlow}>
                  Start Over
                </button>
              )}
            </div>
          </div>
          <div className='icon-field mb-16'>
            <span className='icon top-50 translate-middle-y'>
              <Icon icon='mdi:onepassword' />
            </span>
            <input
              type='text'
              name='otp'
              value={otp}
              onChange={(event) => setOtp(event.target.value)}
              className='form-control h-56-px bg-neutral-50 radius-12'
              placeholder='Enter the OTP sent to your email'
              inputMode='numeric'
              disabled={loading || session?.status !== "OTP_PENDING"}
            />
          </div>
          <button
            type='submit'
            className='btn btn-primary text-sm btn-sm px-12 py-16 w-100 radius-12 mt-24'
            disabled={loading || session?.status !== "OTP_PENDING"}
          >
            {loading ? "Verifying..." : "Verify Email"}
          </button>
        </form>
      );
    }

    return (
      <form onSubmit={handleCompleteSignup} noValidate>
        <div className='position-relative mb-20'>
          <label className='form-label text-sm fw-semibold text-secondary-light'>Create Password</label>
          <input
            type='password'
            name='password'
            value={passwords.password}
            onChange={handlePasswordsChange}
            className='form-control h-56-px bg-neutral-50 radius-12'
            placeholder='Password'
            autoComplete='new-password'
            required
            disabled={loading}
          />
          <span className='text-sm text-secondary-light d-block mt-8'>
            Use at least 8 characters with a mix of letters, numbers, and symbols.
          </span>
        </div>
        <div className='position-relative mb-20'>
          <label className='form-label text-sm fw-semibold text-secondary-light'>Confirm Password</label>
          <input
            type='password'
            name='confirmPassword'
            value={passwords.confirmPassword}
            onChange={handlePasswordsChange}
            className='form-control h-56-px bg-neutral-50 radius-12'
            placeholder='Confirm Password'
            autoComplete='new-password'
            required
            disabled={loading}
          />
        </div>
        <button
          type='submit'
          className='btn btn-primary text-sm btn-sm px-12 py-16 w-100 radius-12 mt-24'
          disabled={loading}
        >
          {loading ? "Creating Account..." : "Sign Up"}
        </button>
      </form>
    );
  };

  const stepLabels = ["Profile Details", "Verify Email", "Secure Account"];

  return (
    <section className='auth bg-base d-flex flex-wrap'>
      <div className='auth-left d-lg-block d-none'>
        <div className='d-flex align-items-center flex-column h-100 justify-content-center'>
          <img src='assets/images/auth/auth-img.png' alt='Gradus admin signup illustration' />
        </div>
      </div>
      <div className='auth-right py-32 px-24 d-flex flex-column justify-content-center'>
        <div className='max-w-564-px mx-auto w-100'>
          <div className='mb-24'>
            <Link to='/' className='mb-32 max-w-290-px d-inline-block'>
              <img src='assets/images/logo.png' alt='Gradus Logo' />
            </Link>
            <h4 className='mb-12'>Create Your Admin Account</h4>
            <p className='mb-16 text-secondary-light text-lg'>
              Fill in your profile, verify your email, and secure your account to access the Gradus admin dashboard.
            </p>
            {error && (
              <div className='alert alert-danger py-12 px-16 mb-0' role='alert'>
                {error}
              </div>
            )}
          </div>

          <div className='d-flex align-items-center justify-content-between gap-2 mb-24'>
            {stepLabels.map((label, index) => (
              <div key={label} className='flex-grow-1 text-center'>
                <div
                  className={`radius-pill py-8 px-12 text-sm fw-semibold ${
                    index === step
                      ? "bg-primary-600 text-white"
                      : index < step
                      ? "bg-primary-100 text-primary-700"
                      : "bg-neutral-100 text-secondary-light"
                  }`}
                >
                  {label}
                </div>
              </div>
            ))}
          </div>

          {renderStepContent()}

          <div className='mt-32 text-center text-sm'>
            <p className='mb-0'>
              Already have an account? {" "}
              <Link to='/sign-in' className='text-primary-600 fw-semibold'>
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SignUpLayer;


