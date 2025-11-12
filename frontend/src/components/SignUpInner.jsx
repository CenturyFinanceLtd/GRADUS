import "../styles/auth.css";
import { useCallback, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import apiClient from "../services/apiClient.js";
import { useAuth } from "../context/AuthContext.jsx";
import resolveGoogleRedirectUri from "../utils/googleRedirect.js";
import buildGoogleAuthUrl from "../utils/googleAuthUrl.js";
import resolvePostAuthRedirect from "../utils/resolvePostAuthRedirect.js";

const stageKeys = {
  CONTACT: "CONTACT",
  PASSWORD: "PASSWORD",
  PROFILE: "PROFILE",
  DETAILS: "DETAILS",
};

const flowStages = [stageKeys.PASSWORD, stageKeys.PROFILE, stageKeys.DETAILS];

const monthOptions = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const genderOptions = [
  { label: "Man", value: "Man" },
  { label: "Woman", value: "Woman" },
  { label: "Non-binary", value: "Non-binary" },
  { label: "Something else", value: "Something else" },
  { label: "Prefer not to say", value: "Prefer not to say" },
];

const passwordChecklist = [
  {
    id: "letter",
    label: "1 letter",
    test: (value) => /[A-Za-z]/.test(value || ""),
  },
  {
    id: "number",
    label: "1 number or special character (example: # ? ! &)",
    test: (value) => /[\d#?!&]/.test(value || ""),
  },
  {
    id: "length",
    label: "10 characters",
    test: (value) => (value || "").length >= 10,
  },
];
const initialFormState = {
  studentName: "",
  email: "",
  mobile: "",
  gender: "",
  dateOfBirth: "",
  otp: "",
  password: "",
};
const SignUpInner = () => {
  const [currentStage, setCurrentStage] = useState(stageKeys.CONTACT);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [formData, setFormData] = useState(initialFormState);
  const [sessionId, setSessionId] = useState(null);
  const [verificationToken, setVerificationToken] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [dobFields, setDobFields] = useState({ year: "", month: "", day: "" });
  const [googleBusy, setGoogleBusy] = useState(false);
  const { setAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const googleRedirectUri = useMemo(resolveGoogleRedirectUri, []);
  const googleAvailable = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);
  const isContactStage = currentStage === stageKeys.CONTACT;

  const flowIndex = flowStages.indexOf(currentStage);

  const stageMeta = useMemo(() => {
    switch (currentStage) {
      case stageKeys.CONTACT:
        return {
          title: "Sign up to start learning",
          description: "",
        };
      case stageKeys.PASSWORD:
        return {
          title: "Create a password",
          description: "Use at least 10 characters with letters and numbers or symbols.",
        };
      case stageKeys.PROFILE:
        return {
          title: "Tell us about yourself",
          description: "This helps us personalize your learning experience.",
        };
      default:
        return {
          title: "Finish setting up your account",
          description: "Where do you live and study? We'll also verify your email.",
        };
    }
  }, [currentStage]);

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

  const handleGoogleSignUp = useCallback(() => {
    if (!googleAvailable) {
      setError("Google sign-in is not available right now.");
      return;
    }

    setGoogleBusy(true);
    setError("");
    setMessage("");

    persistGoogleIntent({
      source: "signup",
      redirectTo: location.state?.redirectTo || "/profile",
      pendingEnrollment: location.state?.pendingEnrollment || null,
    });

    try {
      const authUrl = buildGoogleAuthUrl({ redirectUri: googleRedirectUri });
      window.location.assign(authUrl);
    } catch (err) {
      setGoogleBusy(false);
      setError(err.message || "Unable to start Google sign-in. Please refresh and try again.");
    }
  }, [googleAvailable, googleRedirectUri, location.state, persistGoogleIntent, setMessage]);

  const resetVerificationState = () => {
    setSessionId(null);
    setVerificationToken(null);
    setOtpSent(false);
    setEmailVerified(false);
    setFormData((prev) => ({ ...prev, otp: "" }));
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === "email") {
      resetVerificationState();
    }
  };

  const handleDobFieldChange = (field, rawValue) => {
    let sanitizedValue = rawValue;
    if (field === "year" || field === "day") {
      sanitizedValue = rawValue.replace(/\D/g, "");
      sanitizedValue = field === "year" ? sanitizedValue.slice(0, 4) : sanitizedValue.slice(0, 2);
    }

    setDobFields((prev) => {
      const next = { ...prev, [field]: sanitizedValue };
      if (next.year.length === 4 && next.month && next.day.length === 2) {
        setFormData((prevForm) => ({
          ...prevForm,
          dateOfBirth: `${next.year}-${next.month}-${next.day}`,
        }));
      } else {
        setFormData((prevForm) => ({ ...prevForm, dateOfBirth: "" }));
      }
      return next;
    });
  };

  const deriveNames = () => {
    const trimmedName = formData.studentName.trim();
    if (!trimmedName) {
      return { firstName: "", lastName: "" };
    }

    const [firstName, ...rest] = trimmedName.split(/\s+/);
    const lastName = rest.length > 0 ? rest.join(" ") : firstName;
    return { firstName, lastName };
  };

  const buildSignupPayload = () => {
    const { firstName, lastName } = deriveNames();

    return {
      firstName,
      lastName,
      email: formData.email.trim(),
      mobile: formData.mobile.trim(),
      personalDetails: {
        studentName: formData.studentName.trim(),
        gender: formData.gender,
        dateOfBirth: formData.dateOfBirth,
        city: "Not provided",
        state: "Not provided",
        country: "India",
        zipCode: "000000",
        address: "Not provided",
      },
      educationDetails: {
        institutionName: "Not provided",
        passingYear: "Not provided",
        fieldOfStudy: "Not provided",
        address: "Not provided",
      },
    };
  };

  const validateIdentifierStep = () => {
    if (!formData.email.trim()) {
      return "Please provide your email address to continue.";
    }

    if (!formData.mobile.trim()) {
      return "Please provide your phone number to continue.";
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(formData.email.trim())) {
      return "That doesn't look like a valid email address.";
    }

    return null;
  };

  const validatePasswordStep = () => {
    if (!formData.password.trim()) {
      return "Please create a password to continue.";
    }

    const unmetRule = passwordChecklist.find((rule) => !rule.test(formData.password.trim()));
    if (unmetRule) {
      return `Your password must include ${unmetRule.label.toLowerCase()}.`;
    }

    return null;
  };

  const validateProfileStep = () => {
    if (!formData.studentName.trim()) {
      return "Please provide your name.";
    }

    if (!formData.dateOfBirth) {
      return "Please provide your full date of birth.";
    }

    if (!formData.gender) {
      return "Please select a gender option.";
    }

    return null;
  };

  const validateDetailsStep = () => {
    return null;
  };

  const startRegistration = async ({ isResend = false } = {}) => {
    const payload = buildSignupPayload();

    if (!payload.firstName || !payload.lastName) {
      throw new Error("Please enter your name to continue.");
    }

    const response = await apiClient.post("/auth/signup/start", payload);
    setSessionId(response.sessionId);
    setVerificationToken(null);
    setOtpSent(true);
    setEmailVerified(false);

    if (response.devOtp) {
      setMessage("Dev mode: use verification code " + response.devOtp + " to continue.");
      setFormData((prev) => ({ ...prev, otp: response.devOtp }));
    } else {
      const notification = isResend
        ? `A new verification code has been sent to ${payload.email}.`
        : `We've sent a verification code to ${payload.email}.`;
      setMessage(notification);
      setFormData((prev) => ({ ...prev, otp: "" }));
    }

    return response;
  };

  const handleSendOtp = async ({ isResend = false } = {}) => {
    const validations = [
      validateIdentifierStep,
      validatePasswordStep,
      validateProfileStep,
      validateDetailsStep,
    ];

    for (const validator of validations) {
      const result = validator();
      if (result) {
        setError(result);
        return;
      }
    }

    setError("");
    setMessage("");
    setLoading(true);

    try {
      await startRegistration({ isResend });
    } catch (err) {
      setOtpSent(false);
      setError(err.message || "Unable to send the verification code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    const response = await apiClient.post("/auth/signup/verify-otp", {
      sessionId,
      otp: formData.otp.trim(),
    });

    setVerificationToken(response.verificationToken);
    setEmailVerified(true);
    setMessage("Email verified! You're ready to finish.");
  };

  const handleVerifyOtp = async () => {
    if (!sessionId) {
      setError("Please request a verification code before attempting to verify.");
      return;
    }

    if (!formData.otp.trim()) {
      setError("Please enter the verification code we sent to your email.");
      return;
    }

    setError("");
    setMessage("");
    setLoading(true);

    try {
      await verifyOtp();
    } catch (err) {
      setEmailVerified(false);
      setError(err.message || "We couldn't verify that code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const completeRegistration = async () => {
    const payload = {
      sessionId,
      verificationToken,
      password: formData.password,
      confirmPassword: formData.password,
      ...buildSignupPayload(),
    };

    const response = await apiClient.post("/auth/signup/complete", payload);
    setAuth({ token: response.token, user: response.user });
    const pendingEnrollment = location.state?.pendingEnrollment;
    const redirectTo = resolvePostAuthRedirect({ locationState: location.state });
    const nextState =
      pendingEnrollment && redirectTo.includes("/our-courses") ? { pendingEnrollment } : undefined;
    navigate(redirectTo, { replace: true, state: nextState });
  };

  const handlePrimaryAction = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (currentStage === stageKeys.CONTACT) {
      const validationError = validateIdentifierStep();
      if (validationError) {
        setError(validationError);
        return;
      }

      setCurrentStage(stageKeys.PASSWORD);
      return;
    }

    if (currentStage === stageKeys.PASSWORD) {
      const validationError = validatePasswordStep();
      if (validationError) {
        setError(validationError);
        return;
      }

      setCurrentStage(stageKeys.PROFILE);
      return;
    }

    if (currentStage === stageKeys.PROFILE) {
      const validationError = validateProfileStep();
      if (validationError) {
        setError(validationError);
        return;
      }

      setCurrentStage(stageKeys.DETAILS);
      return;
    }

    const detailsError = validateDetailsStep();
    if (detailsError) {
      setError(detailsError);
      return;
    }

    if (!emailVerified || !verificationToken || !sessionId) {
      setError("Please verify your email before completing your account.");
      return;
    }

    setLoading(true);

    try {
      await completeRegistration();
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (currentStage === stageKeys.CONTACT) {
      return;
    }

    setError("");
    setMessage("");

    if (currentStage === stageKeys.PASSWORD) {
      setCurrentStage(stageKeys.CONTACT);
      return;
    }

    if (currentStage === stageKeys.PROFILE) {
      setCurrentStage(stageKeys.PASSWORD);
      return;
    }

    setCurrentStage(stageKeys.PROFILE);
  };

  const passwordRuleStatus = passwordChecklist.map((rule) => ({
    ...rule,
    passed: rule.test(formData.password),
  }));

  const renderProgress = () => {
    if (flowIndex < 0) {
      return null;
    }

    const progressPercent = ((flowIndex + 1) / flowStages.length) * 100;

    return (
      <div className='signup-modern__progress'>
        <div className='signup-modern__progress-bar'>
          <div className='signup-modern__progress-fill' style={{ width: `${progressPercent}%` }} />
        </div>
        <p className='signup-modern__progress-label'>Step {flowIndex + 1} of {flowStages.length}</p>
      </div>
    );
  };
  const renderContactStage = () => (
    <>
      <div className='signup-modern__field-group'>
        <label htmlFor='email' className='signup-modern__label'>
          Email address
        </label>
        <input
          id='email'
          name='email'
          type='email'
          className='signup-modern__input'
          placeholder='name@domain.com'
          value={formData.email}
          onChange={handleChange}
          autoComplete='email'
        />
      </div>
      <div className='signup-modern__field-group'>
        <label htmlFor='contactMobile' className='signup-modern__label'>
          Phone number
        </label>
        <input
          id='contactMobile'
          name='mobile'
          type='tel'
          className='signup-modern__input'
          placeholder='Enter your number'
          value={formData.mobile}
          onChange={handleChange}
          autoComplete='tel'
        />
      </div>
      <button type='submit' className='signup-modern__cta'>
        Next
      </button>
      <div className='signup-modern__divider'>
        <span>or</span>
      </div>
      <div className='signup-modern__social'>
        <button
          type='button'
          className='signup-modern__social-btn google'
          onClick={handleGoogleSignUp}
          disabled={!googleAvailable || googleBusy}
          aria-busy={googleBusy}
        >
          <span aria-hidden='true'>G</span> {googleBusy ? "Redirecting..." : "Sign up with Google"}
        </button>
      </div>
      <p className='signup-modern__footer'>
        Already have an account?{" "}
        <Link to='/sign-in' state={location.state}>
          Log in
        </Link>
      </p>
    </>
  );

  const renderPasswordStage = () => (
    <>
      {renderProgress()}
      <label htmlFor='password' className='signup-modern__label'>
        Password
      </label>
      <div className='signup-modern__password-field'>
        <input
          id='password'
          name='password'
          type={passwordVisible ? "text" : "password"}
          className='signup-modern__input'
          placeholder='Create a password'
          value={formData.password}
          onChange={handleChange}
          autoComplete='new-password'
        />
        <button
          type='button'
          className='signup-modern__password-toggle'
          onClick={() => setPasswordVisible((prev) => !prev)}
          aria-label={passwordVisible ? "Hide password" : "Show password"}
        >
          <i className={`ph-bold ${passwordVisible ? "ph-eye" : "ph-eye-closed"}`} />
        </button>
      </div>
      <div className='signup-modern__checklist'>
        {passwordRuleStatus.map((rule) => (
          <div
            key={rule.id}
            className={`signup-modern__rule ${rule.passed ? "signup-modern__rule--met" : ""}`}
          >
            <i className={`ph-bold ${rule.passed ? "ph-check-circle" : "ph-circle"}`} />
            <span>{rule.label}</span>
          </div>
        ))}
      </div>
      <div className='signup-modern__actions'>
        <button type='button' className='signup-modern__secondary' onClick={handleBack}>
          <i className='ph-bold ph-caret-left' aria-hidden='true' />
          Back
        </button>
        <button type='submit' className='signup-modern__cta'>
          Next
        </button>
      </div>
    </>
  );

  const renderProfileStage = () => (
    <>
      {renderProgress()}
      <label htmlFor='studentName' className='signup-modern__label'>
        Name
      </label>
      <input
        id='studentName'
        name='studentName'
        type='text'
        className='signup-modern__input'
        placeholder='This name will appear on your profile'
        value={formData.studentName}
        onChange={handleChange}
        autoComplete='name'
      />
      <div className='signup-modern__dob-grid'>
        <div>
          <label htmlFor='dobYear' className='signup-modern__label'>
            Year
          </label>
          <input
            id='dobYear'
            type='text'
            inputMode='numeric'
            className='signup-modern__input'
            placeholder='yyyy'
            value={dobFields.year}
            onChange={(event) => handleDobFieldChange("year", event.target.value)}
          />
        </div>
        <div>
          <label htmlFor='dobMonth' className='signup-modern__label'>
            Month
          </label>
          <select
            id='dobMonth'
            className='signup-modern__select'
            value={dobFields.month}
            onChange={(event) => handleDobFieldChange("month", event.target.value)}
          >
            <option value=''>Month</option>
            {monthOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor='dobDay' className='signup-modern__label'>
            Day
          </label>
          <input
            id='dobDay'
            type='text'
            inputMode='numeric'
            className='signup-modern__input'
            placeholder='dd'
            value={dobFields.day}
            onChange={(event) => handleDobFieldChange("day", event.target.value)}
          />
        </div>
      </div>
      <div>
        <span className='signup-modern__label d-block mb-12'>Gender</span>
        <div className='signup-modern__gender-group'>
          {genderOptions.map((option) => {
            const isActive = formData.gender === option.value;
            return (
              <label
                key={option.value}
                className={`signup-modern__gender-option ${
                  isActive ? "signup-modern__gender-option--active" : ""
                }`}
              >
                <input
                  type='radio'
                  name='gender'
                  value={option.value}
                  checked={isActive}
                  onChange={handleChange}
                />
                <span>{option.label}</span>
              </label>
            );
          })}
        </div>
      </div>
      <div className='signup-modern__actions'>
        <button type='button' className='signup-modern__secondary' onClick={handleBack}>
          <i className='ph-bold ph-caret-left' aria-hidden='true' />
          Back
        </button>
        <button type='submit' className='signup-modern__cta'>
          Next
        </button>
      </div>
    </>
  );
  const renderDetailsStage = () => (
    <>
      {renderProgress()}
      <div className='signup-modern__verification signup-modern__verification--focused'>
        <div>
          <p className='signup-modern__verification-title'>Verify your email</p>
          <p className='signup-modern__verification-subtitle'>
            We'll send a 6-digit code to <strong>{formData.email || "your email"}</strong>.
          </p>
        </div>
        <div className='signup-modern__verification-actions'>
          <button
            type='button'
            className='signup-modern__secondary w-100'
            onClick={() => handleSendOtp({ isResend: otpSent })}
            disabled={loading || emailVerified}
          >
            {otpSent ? "Resend code" : "Send code"}
          </button>
        </div>
        {otpSent ? (
          <div className='signup-modern__otp'>
            <label htmlFor='otp' className='signup-modern__label'>
              Enter code
            </label>
            <div className='signup-modern__otp-row'>
              <input
                id='otp'
                name='otp'
                type='text'
                className='signup-modern__input text-center'
                placeholder='••••••'
                value={formData.otp}
                onChange={handleChange}
                autoComplete='one-time-code'
                maxLength={6}
                disabled={emailVerified}
              />
              <button
                type='button'
                className='signup-modern__cta'
                onClick={handleVerifyOtp}
                disabled={loading || emailVerified}
              >
                Verify
              </button>
            </div>
            <p
              className={`signup-modern__helper ${
                emailVerified ? "signup-modern__helper--success" : ""
              }`}
            >
              {emailVerified ? "Email verified successfully." : "Enter the code we emailed to you."}
            </p>
          </div>
        ) : null}
      </div>
      <div className='signup-modern__actions'>
        <button type='button' className='signup-modern__secondary' onClick={handleBack}>
          <i className='ph-bold ph-caret-left' aria-hidden='true' />
          Back
        </button>
        <button type='submit' className='signup-modern__cta' disabled={loading || !emailVerified}>
          {loading ? "Please wait..." : "Complete Sign Up"}
        </button>
      </div>
      <p className='signup-modern__footer mt-16'>
        Already have an account?{" "}
        <Link to='/sign-in' state={location.state}>
          Log in
        </Link>
      </p>
    </>
  );

  const renderStageFields = () => {
    switch (currentStage) {
      case stageKeys.CONTACT:
        return renderContactStage();
      case stageKeys.PASSWORD:
        return renderPasswordStage();
      case stageKeys.PROFILE:
        return renderProfileStage();
      default:
        return renderDetailsStage();
    }
  };

  return (
    <section className='signup-modern position-relative'>
      <div className='container'>
        <div className='signup-modern__shell'>
          <div className='signup-modern__card'>
            <div className={`signup-modern__header ${isContactStage ? "signup-modern__header--center" : ""}`}>
              {currentStage !== stageKeys.CONTACT ? (
                <button
                  type='button'
                  className='signup-modern__back'
                  onClick={handleBack}
                  aria-label='Go back'
                >
                  <i className='ph-bold ph-caret-left' />
                </button>
              ) : null}
              <div className='signup-modern__header-stack'>
                {isContactStage ? (
                  <div className='signup-modern__logo'>
                    <img src='/assets/images/logo/logo.png' alt='Gradus logo' loading='lazy' />
                  </div>
                ) : null}
                <div>
                  <h2 className='signup-modern__title'>{stageMeta.title}</h2>
                  {stageMeta.description ? (
                    <p className='signup-modern__subtitle'>{stageMeta.description}</p>
                  ) : null}
                </div>
              </div>
            </div>
            <form onSubmit={handlePrimaryAction}>
              {error ? (
                <div className='signup-modern__alert signup-modern__alert--error' role='alert' aria-live='assertive'>
                  {error}
                </div>
              ) : null}
              {message ? (
                <div className='signup-modern__alert signup-modern__alert--success' role='status' aria-live='polite'>
                  {message}
                </div>
              ) : null}
              <div className='signup-modern__stage'>{renderStageFields()}</div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SignUpInner;
