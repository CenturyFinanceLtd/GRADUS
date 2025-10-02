import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import apiClient from "../services/apiClient.js";
import { useAuth } from "../context/AuthContext.jsx";

const steps = {
  DETAILS: 1,
  PASSWORD: 2,
};

const indiaStateCityMap = {
  "Andhra Pradesh": [
    "Visakhapatnam",
    "Vijayawada",
    "Guntur",
    "Nellore",
    "Kurnool",
  ],
  "Arunachal Pradesh": [
    "Itanagar",
    "Tawang",
    "Naharlagun",
    "Pasighat",
    "Ziro",
  ],
  Assam: ["Guwahati", "Dibrugarh", "Silchar", "Jorhat", "Tezpur"],
  Bihar: ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur", "Purnia"],
  Chhattisgarh: ["Raipur", "Bhilai", "Bilaspur", "Korba", "Durg"],
  Goa: ["Panaji", "Margao", "Vasco da Gama", "Mapusa", "Ponda"],
  Gujarat: ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar"],
  Haryana: ["Gurugram", "Faridabad", "Panipat", "Ambala", "Hisar"],
  "Himachal Pradesh": ["Shimla", "Dharamshala", "Mandi", "Solan", "Kullu"],
  Jharkhand: ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro", "Hazaribagh"],
  Karnataka: ["Bengaluru", "Mysuru", "Mangaluru", "Hubballi", "Belagavi"],
  Kerala: ["Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur", "Kollam"],
  "Madhya Pradesh": ["Bhopal", "Indore", "Gwalior", "Jabalpur", "Ujjain"],
  Maharashtra: ["Mumbai", "Pune", "Nagpur", "Nashik", "Aurangabad"],
  Manipur: ["Imphal", "Thoubal", "Churachandpur", "Bishnupur", "Ukhrul"],
  Meghalaya: ["Shillong", "Tura", "Jowai", "Baghmara", "Nongpoh"],
  Mizoram: ["Aizawl", "Lunglei", "Saiha", "Champhai", "Serchhip"],
  Nagaland: ["Kohima", "Dimapur", "Mokokchung", "Wokha", "Tuensang"],
  Odisha: ["Bhubaneswar", "Cuttack", "Rourkela", "Berhampur", "Sambalpur"],
  Punjab: ["Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Bathinda"],
  Rajasthan: ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Bikaner"],
  Sikkim: ["Gangtok", "Namchi", "Gyalshing", "Mangan", "Rangpo"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem"],
  Telangana: ["Hyderabad", "Warangal", "Nizamabad", "Karimnagar", "Khammam"],
  Tripura: ["Agartala", "Udaipur", "Dharmanagar", "Kailashahar", "Belonia"],
  Uttarakhand: ["Dehradun", "Haridwar", "Nainital", "Rudrapur", "Haldwani"],
  "Uttar Pradesh": ["Lucknow", "Kanpur", "Varanasi", "Agra", "Prayagraj"],
  "West Bengal": ["Kolkata", "Howrah", "Durgapur", "Siliguri", "Asansol"],
  "Andaman and Nicobar Islands": [
    "Port Blair",
    "Havelock Island",
    "Mayabunder",
    "Diglipur",
    "Rangat",
  ],
  Chandigarh: ["Chandigarh"],
  "Dadra and Nagar Haveli and Daman and Diu": [
    "Daman",
    "Diu",
    "Silvassa",
    "Nagar Haveli",
  ],
  Delhi: ["New Delhi", "Delhi"],
  Lakshadweep: ["Kavaratti", "Agatti", "Minicoy", "Andrott"],
  "Jammu and Kashmir": ["Srinagar", "Jammu", "Anantnag", "Baramulla", "Kathua"],
  Ladakh: ["Leh", "Kargil"],
  Puducherry: ["Puducherry", "Karaikal", "Mahe", "Yanam"],
};

const initialFormState = {
  studentName: "",
  email: "",
  mobile: "",
  gender: "",
  dateOfBirth: "",
  city: "",
  state: "",
  zipCode: "",
  address: "",
  schoolName: "",
  passingYear: "",
  universityBoard: "",
  schoolAddress: "",
  otp: "",
  password: "",
  confirmPassword: "",
};

const SignUpInner = () => {
  const [currentStep, setCurrentStep] = useState(steps.DETAILS);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [formData, setFormData] = useState(initialFormState);
  const [sessionId, setSessionId] = useState(null);
  const [verificationToken, setVerificationToken] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const { setAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const stepTitle = useMemo(() => {
    switch (currentStep) {
      case steps.PASSWORD:
        return "Set your password";
      default:
        return "Let's Get Started!";
    }
  }, [currentStep]);

  const resetVerificationState = () => {
    setSessionId(null);
    setVerificationToken(null);
    setOtpSent(false);
    setEmailVerified(false);
    setFormData((prev) => ({ ...prev, otp: "" }));
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => {
      if (name === "state") {
        return { ...prev, state: value, city: "" };
      }

      return { ...prev, [name]: value };
    });

    if (name === "email") {
      resetVerificationState();
    }
  };

  const availableStates = useMemo(() => Object.keys(indiaStateCityMap), []);
  const availableCities = useMemo(() => {
    if (!formData.state) {
      return [];
    }

    return indiaStateCityMap[formData.state] || [];
  }, [formData.state]);

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
        city: formData.city.trim(),
        state: formData.state.trim(),
        country: "India",
        zipCode: formData.zipCode.trim(),
        address: formData.address.trim(),
      },
      educationDetails: {
        institutionName: formData.schoolName.trim(),
        passingYear: formData.passingYear.trim(),
        board: formData.universityBoard.trim(),
        address: formData.schoolAddress.trim(),
      },
    };
  };

  const validateDetails = () => {
    const requiredFields = [
      ["studentName", "Student Name"],
      ["email", "Email"],
      ["mobile", "Phone"],
      ["gender", "Gender"],
      ["dateOfBirth", "Date of birth"],
      ["city", "City"],
      ["state", "State"],
      ["zipCode", "Zip code"],
      ["schoolName", "School or college name"],
      ["passingYear", "Year of passing"],
      ["universityBoard", "Board of university"],
    ];

    for (const [field, label] of requiredFields) {
      const value = formData[field];
      if (!value || !String(value).trim()) {
        return `Please provide the ${label.toLowerCase()}.`;
      }
    }

    return null;
  };

  const startRegistration = async ({ isResend = false } = {}) => {
    const payload = buildSignupPayload();

    if (!payload.firstName || !payload.lastName) {
      throw new Error("Please enter the student's name to continue.");
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
        ? "A new verification code has been sent to " + payload.email + "."
        : "We've sent a verification code to " + payload.email + ".";
      setMessage(notification);
      setFormData((prev) => ({ ...prev, otp: "" }));
    }

    return response;
  };

  const handleSendOtp = async ({ isResend = false } = {}) => {
    const validationError = validateDetails();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!formData.email.trim()) {
      setError("Please enter your email address to continue.");
      return;
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
    setMessage("Email verified! Set a strong password to finish.");
  };

  const handleVerifyOtp = async () => {
    if (!sessionId) {
      setError("Please request a verification code before attempting to verify.");
      return;
    }

    if (!formData.otp.trim()) {
      setError("Please enter the verification code that was sent to your email.");
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
      confirmPassword: formData.confirmPassword,
      ...buildSignupPayload(),
    };

    const response = await apiClient.post("/auth/signup/complete", payload);
    setAuth({ token: response.token, user: response.user });
    const redirectTo = location.state?.redirectTo || "/profile";
    const pendingEnrollment = location.state?.pendingEnrollment;
    const nextState =
      pendingEnrollment && redirectTo.includes("/our-courses")
        ? { pendingEnrollment }
        : undefined;
    navigate(redirectTo, { replace: true, state: nextState });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (currentStep === steps.DETAILS) {
      const validationError = validateDetails();
      if (validationError) {
        setError(validationError);
        return;
      }

      if (!emailVerified || !verificationToken || !sessionId) {
        setError("Please verify your email before continuing.");
        return;
      }

      setCurrentStep(steps.PASSWORD);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match. Please re-enter them.");
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

  const renderStepFields = () => {
    switch (currentStep) {
      case steps.PASSWORD:
        return (
          <>
            <div className='col-sm-12'>
              <label htmlFor='password' className='fw-medium text-lg text-neutral-500 mb-16'>
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
              <label htmlFor='confirmPassword' className='fw-medium text-lg text-neutral-500 mb-16'>
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
            <div className='col-sm-12'>
              <button
                type='button'
                className='btn border border-neutral-40 text-neutral-500 rounded-pill'
                onClick={() => setCurrentStep(steps.DETAILS)}
                disabled={loading}
              >
                Back to details
              </button>
            </div>
          </>
        );
      default:
        return (
          <>
            <div className='col-sm-12'>
              <div className='border border-neutral-30 rounded-12 bg-white p-24'>
                <h5 className='mb-0'>Personal information</h5>
                <span className='d-block border border-main-50 my-24 border-dashed' />
                <div className='row gy-4'>
                  <div className='col-sm-6'>
                    <label htmlFor='studentName' className='text-neutral-700 text-lg fw-medium mb-12'>
                      Student Name <span className='text-danger-600'>*</span>{" "}
                    </label>
                    <input
                      type='text'
                      className='common-input bg-main-25 rounded-pill border-transparent focus-border-main-600'
                      id='studentName'
                      name='studentName'
                      value={formData.studentName}
                      onChange={handleChange}
                      placeholder='Enter Your Name...'
                      autoComplete='name'
                      required
                    />
                  </div>
                  <div className='col-sm-6'>
                    <label htmlFor='mobile' className='text-neutral-700 text-lg fw-medium mb-12'>
                      Phone <span className='text-danger-600'>*</span>{" "}
                    </label>
                    <input
                      type='tel'
                      className='common-input bg-main-25 rounded-pill border-transparent focus-border-main-600'
                      id='mobile'
                      name='mobile'
                      value={formData.mobile}
                      onChange={handleChange}
                      placeholder='Enter Your Number...'
                      autoComplete='tel'
                      required
                    />
                  </div>
                  <div className='col-sm-12'>
                    <label htmlFor='email' className='text-neutral-700 text-lg fw-medium mb-12'>
                      Email <span className='text-danger-600'>*</span>{" "}
                    </label>
                    <div className='d-flex flex-column flex-sm-row gap-12 align-items-stretch'>
                      <input
                        type='email'
                        className='common-input bg-main-25 rounded-pill border-transparent focus-border-main-600 flex-grow-1'
                        id='email'
                        name='email'
                        value={formData.email}
                        onChange={handleChange}
                        placeholder='Enter Your Email...'
                        autoComplete='email'
                        required
                      />
                      <button
                        type='button'
                        className='btn btn-main rounded-pill flex-shrink-0'
                        onClick={() => handleSendOtp({ isResend: otpSent })}
                        disabled={loading || emailVerified}
                      >
                        {otpSent ? "Resend Code" : "Verify Email"}
                      </button>
                    </div>
                    {otpSent && (
                      <div className='mt-16'>
                        <label htmlFor='otp' className='text-neutral-700 text-lg fw-medium mb-12'>
                          Verification Code <span className='text-danger-600'>*</span>{" "}
                        </label>
                        <div className='d-flex flex-column flex-sm-row gap-12 align-items-stretch'>
                          <input
                            type='text'
                            className='common-input bg-main-25 rounded-pill border-transparent focus-border-main-600 flex-grow-1 text-center letter-spacing-2'
                            id='otp'
                            name='otp'
                            value={formData.otp}
                            onChange={handleChange}
                            placeholder='Enter OTP'
                            autoComplete='one-time-code'
                            required
                            disabled={emailVerified}
                          />
                          <button
                            type='button'
                            className='btn border border-main-600 text-main-600 rounded-pill flex-shrink-0'
                            onClick={handleVerifyOtp}
                            disabled={loading || emailVerified}
                          >
                            Verify Code
                          </button>
                        </div>
                        <p
                          className={`mt-8 mb-0 text-sm ${
                            emailVerified ? "text-success-600" : "text-neutral-500"
                          }`}
                        >
                          {emailVerified
                            ? "Email verified successfully."
                            : `Enter the code sent to ${formData.email.trim()}.`}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className='col-sm-12'>
                    <label className='text-neutral-700 text-lg fw-medium mb-12'>
                      Gender <span className='text-danger-600'>*</span>{" "}
                    </label>
                    <div className='flex-align gap-24'>
                      <div className='form-check common-check common-radio mb-0'>
                        <input
                          className='form-check-input'
                          type='radio'
                          name='gender'
                          id='genderMale'
                          value='Male'
                          onChange={handleChange}
                          checked={formData.gender === 'Male'}
                          required
                        />
                        <label className='form-check-label fw-normal flex-grow-1' htmlFor='genderMale'>
                          Male
                        </label>
                      </div>
                      <div className='form-check common-check common-radio mb-0'>
                        <input
                          className='form-check-input'
                          type='radio'
                          name='gender'
                          id='genderFemale'
                          value='Female'
                          onChange={handleChange}
                          checked={formData.gender === 'Female'}
                        />
                        <label className='form-check-label fw-normal flex-grow-1' htmlFor='genderFemale'>
                          Female
                        </label>
                      </div>
                      <div className='form-check common-check common-radio mb-0'>
                        <input
                          className='form-check-input'
                          type='radio'
                          name='gender'
                          id='genderOther'
                          value='Other'
                          onChange={handleChange}
                          checked={formData.gender === 'Other'}
                        />
                        <label className='form-check-label fw-normal flex-grow-1' htmlFor='genderOther'>
                          Other
                        </label>
                      </div>
                    </div>
                  </div>
                  <div className='col-sm-6'>
                    <label htmlFor='dateOfBirth' className='text-neutral-700 text-lg fw-medium mb-12'>
                      Date of birth <span className='text-danger-600'>*</span>{" "}
                    </label>
                    <input
                      type='date'
                      className='common-input bg-main-25 rounded-pill border-transparent focus-border-main-600'
                      id='dateOfBirth'
                      name='dateOfBirth'
                      value={formData.dateOfBirth}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className='col-sm-6'>
                    <label htmlFor='state' className='text-neutral-700 text-lg fw-medium mb-12'>
                      State <span className='text-danger-600'>*</span>{" "}
                    </label>
                    <select
                      className='common-input bg-main-25 rounded-pill border-transparent focus-border-main-600 form-select py-14'
                      id='state'
                      name='state'
                      value={formData.state}
                      onChange={handleChange}
                      required
                    >
                      <option value='' disabled>
                        Select state
                      </option>
                      {availableStates.map((stateOption) => (
                        <option key={stateOption} value={stateOption}>
                          {stateOption}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className='col-sm-6'>
                    <label htmlFor='city' className='text-neutral-700 text-lg fw-medium mb-12'>
                      City <span className='text-danger-600'>*</span>{" "}
                    </label>
                    <select
                      className='common-input bg-main-25 rounded-pill border-transparent focus-border-main-600 form-select py-14'
                      id='city'
                      name='city'
                      value={formData.city}
                      onChange={handleChange}
                      required
                      disabled={!formData.state}
                    >
                      <option value='' disabled>
                        {formData.state ? "Select city" : "Select a state first"}
                      </option>
                      {availableCities.map((cityOption) => (
                        <option key={cityOption} value={cityOption}>
                          {cityOption}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className='col-sm-6'>
                    <label htmlFor='zipCode' className='text-neutral-700 text-lg fw-medium mb-12'>
                      Zip code <span className='text-danger-600'>*</span>{" "}
                    </label>
                    <input
                      type='text'
                      className='common-input bg-main-25 rounded-pill border-transparent focus-border-main-600'
                      id='zipCode'
                      name='zipCode'
                      value={formData.zipCode}
                      onChange={handleChange}
                      placeholder='Enter code...'
                      autoComplete='postal-code'
                      required
                    />
                  </div>
                  <div className='col-sm-12'>
                    <label htmlFor='address' className='text-neutral-700 text-lg fw-medium mb-12'>
                      Your address
                    </label>
                    <textarea
                      className='common-input bg-main-25 rounded-24 border-transparent focus-border-main-600'
                      id='address'
                      name='address'
                      value={formData.address}
                      onChange={handleChange}
                      placeholder='Enter Your address...'
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className='col-sm-12'>
              <div className='border border-neutral-30 rounded-12 bg-white p-24'>
                <h5 className='mb-0'>Education</h5>
                <span className='d-block border border-main-50 my-24 border-dashed' />
                <div className='row gy-4'>
                  <div className='col-sm-6'>
                    <label htmlFor='schoolName' className='text-neutral-700 text-lg fw-medium mb-12'>
                      School or college name <span className='text-danger-600'>*</span>{" "}
                    </label>
                    <input
                      type='text'
                      className='common-input bg-main-25 rounded-pill border-transparent focus-border-main-600'
                      id='schoolName'
                      name='schoolName'
                      value={formData.schoolName}
                      onChange={handleChange}
                      placeholder='Enter Name...'
                      required
                    />
                  </div>
                  <div className='col-sm-6'>
                    <label htmlFor='passingYear' className='text-neutral-700 text-lg fw-medium mb-12'>
                      Year of passing <span className='text-danger-600'>*</span>{" "}
                    </label>
                    <input
                      type='text'
                      className='common-input bg-main-25 rounded-pill border-transparent focus-border-main-600'
                      id='passingYear'
                      name='passingYear'
                      value={formData.passingYear}
                      onChange={handleChange}
                      placeholder='Enter year'
                      required
                    />
                  </div>
                  <div className='col-sm-6'>
                    <label htmlFor='universityBoard' className='text-neutral-700 text-lg fw-medium mb-12'>
                      Board of university <span className='text-danger-600'>*</span>{" "}
                    </label>
                    <input
                      type='text'
                      className='common-input bg-main-25 rounded-pill border-transparent focus-border-main-600'
                      id='universityBoard'
                      name='universityBoard'
                      value={formData.universityBoard}
                      onChange={handleChange}
                      placeholder='Enter board...'
                      required
                    />
                  </div>
                  <div className='col-sm-12'>
                    <label htmlFor='schoolAddress' className='text-neutral-700 text-lg fw-medium mb-12'>
                      School or college address
                    </label>
                    <textarea
                      className='common-input bg-main-25 rounded-24 border-transparent focus-border-main-600'
                      id='schoolAddress'
                      name='schoolAddress'
                      value={formData.schoolAddress}
                      onChange={handleChange}
                      placeholder='Enter address...'
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className='col-sm-12'>
              <p className='text-neutral-500 mt-8 mb-0'>
                Already have an account?{" "}
                <Link
                  to='/sign-in'
                  state={location.state}
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
          <div className='col-lg-12'>
            <div className='bg-main-25 border border-neutral-30 rounded-8 p-32'>
              <div className='mb-40'>
                <h3 className='mb-16 text-neutral-500'>{stepTitle}</h3>
                <p className='text-neutral-500'>
                  {currentStep === steps.DETAILS &&
                    "Please enter your admission details and verify your email to continue."}
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
                      ? "Please wait..."
                      : currentStep === steps.PASSWORD
                      ? "Complete Sign Up"
                      : "Next"}
                    <i className='ph-bold ph-arrow-up-right d-flex text-lg' />
                  </button>
                </div>
              </form>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default SignUpInner;
