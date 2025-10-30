import '../styles/auth.css';
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import apiClient from "../services/apiClient.js";
import { useAuth } from "../context/AuthContext.jsx";

const steps = {
  DETAILS: 1,
  PASSWORD: 2,
};

const fallbackStateCityMap = {
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
  fieldOfStudy: "",
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
  const [stateOptions, setStateOptions] = useState(
    Object.keys(fallbackStateCityMap)
  );
  const [cityOptions, setCityOptions] = useState([]);
  const [locationNotice, setLocationNotice] = useState("");
  const [fetchingCities, setFetchingCities] = useState(false);
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
        setLocationNotice("");
        return { ...prev, state: value, city: "" };
      }

      return { ...prev, [name]: value };
    });

    if (name === "email") {
      resetVerificationState();
    }
  };

  useEffect(() => {
    let isActive = true;

    const fetchStates = async () => {
      try {
        const response = await fetch(
          "https://countriesnow.space/api/v0.1/countries/states",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ country: "India" }),
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch states");
        }

        const payload = await response.json();
        const remoteStates =
          payload?.data?.states?.map((state) => state.name).filter(Boolean) || [];

        if (remoteStates.length && isActive) {
          const sortedStates = [...new Set(remoteStates)].sort((a, b) =>
            a.localeCompare(b)
          );
          setStateOptions(sortedStates);
        }
      } catch (error) {
        if (!isActive) {
          return;
        }

        if (import.meta.env.DEV) {
          console.error("[SignUp] Failed to fetch states", error);
        }

        setLocationNotice(
          "We couldn't load the latest state list. Showing a limited list instead."
        );
        setStateOptions(Object.keys(fallbackStateCityMap));
      }
    };

    fetchStates();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!formData.state) {
      setCityOptions([]);
      return;
    }

    let isActive = true;
    setFetchingCities(true);
    setLocationNotice("");

    const fetchCities = async () => {
      try {
        const response = await fetch(
          "https://countriesnow.space/api/v0.1/countries/state/cities",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ country: "India", state: formData.state }),
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch cities");
        }

        const payload = await response.json();
        const remoteCities = Array.isArray(payload?.data)
          ? payload.data.filter(Boolean)
          : [];

        if (isActive) {
          if (remoteCities.length) {
            const sortedCities = [...new Set(remoteCities)].sort((a, b) =>
              a.localeCompare(b)
            );
            setCityOptions(sortedCities);
          } else if (fallbackStateCityMap[formData.state]) {
            setCityOptions(fallbackStateCityMap[formData.state]);
            setLocationNotice(
              "We couldn't load all cities for this state. Showing a limited list instead."
            );
          } else {
            setCityOptions([]);
            setLocationNotice(
              "We couldn't find cities for this state. Please enter the city manually."
            );
          }
        }
      } catch (error) {
        if (!isActive) {
          return;
        }

        if (import.meta.env.DEV) {
          console.error("[SignUp] Failed to fetch cities", error);
        }

        if (fallbackStateCityMap[formData.state]) {
          setCityOptions(fallbackStateCityMap[formData.state]);
          setLocationNotice(
            "We couldn't load cities right now. Showing a limited list instead."
          );
        } else {
          setCityOptions([]);
          setLocationNotice(
            "We couldn't load cities for this state. Please enter the city manually."
          );
        }
      } finally {
        if (isActive) {
          setFetchingCities(false);
        }
      }
    };

    fetchCities();

    return () => {
      isActive = false;
    };
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
        fieldOfStudy: formData.fieldOfStudy.trim(),
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
      ["fieldOfStudy", "Field of study"],
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
    // For sending OTP, only require name, phone, and email
    const validationError = validateOtpPrereqs();
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
              <label htmlFor='password' className='fw-medium text-lg text-neutral-500 mb-12'>
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
                  role='button'
                  aria-label={passwordVisible ? 'Hide password' : 'Show password'}
                ></span>
              </div>
            </div>
            <div className='col-sm-12'>
              <label htmlFor='confirmPassword' className='fw-medium text-lg text-neutral-500 mb-12'>
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
                  role='button'
                  aria-label={confirmPasswordVisible ? 'Hide password' : 'Show password'}
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
              <div className='border border-neutral-30 rounded-12 bg-white section-card box-shadow-sm'>
                <h5 className='mb-0'>Personal information</h5>
                <span className='d-block border border-main-50 my-24 border-dashed' />
                <div className='row gy-4'>
                  <div className='col-xl-6'>
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
                  <div className='col-xl-6'>
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
                    <div className='d-flex flex-column flex-xl-row gap-12 align-items-stretch'>
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
                        className='btn btn-main rounded-pill flex-shrink-0 btn-block-sm btn-block-md'
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
                        <div className='d-flex flex-column flex-xl-row gap-12 align-items-stretch'>
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
                            className='btn border border-main-600 text-main-600 rounded-pill flex-shrink-0 btn-block-sm btn-block-md'
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
                    <div className='flex-align gap-24 flex-wrap'>
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
                  <div className='col-xl-6'>
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
                  <div className='col-xl-6'>
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
                      {stateOptions.map((stateOption) => (
                        <option key={stateOption} value={stateOption}>
                          {stateOption}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className='col-xl-6'>
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
                      disabled={!formData.state || fetchingCities}
                    >
                      <option value='' disabled>
                        {!formData.state
                          ? "Select a state first"
                          : fetchingCities
                          ? "Loading cities..."
                          : cityOptions.length
                          ? "Select city"
                          : "No cities available"}
                      </option>
                      {cityOptions.map((cityOption) => (
                        <option key={cityOption} value={cityOption}>
                          {cityOption}
                        </option>
                      ))}
                    </select>
                    {locationNotice ? (
                      <p className='text-xs text-neutral-500 mt-8 mb-0'>{locationNotice}</p>
                    ) : null}
                  </div>
                  <div className='col-xl-6'>
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
              <div className='border border-neutral-30 rounded-12 bg-white section-card box-shadow-sm'>
                <h5 className='mb-0'>Education</h5>
                <span className='d-block border border-main-50 my-24 border-dashed' />
                <div className='row gy-4'>
                  <div className='col-xl-6'>
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
                  <div className='col-xl-6'>
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
                    <label htmlFor='fieldOfStudy' className='text-neutral-700 text-lg fw-medium mb-12'>
                      Field of study <span className='text-danger-600'>*</span>{" "}
                    </label>
                    <input
                      type='text'
                      className='common-input bg-main-25 rounded-pill border-transparent focus-border-main-600'
                      id='fieldOfStudy'
                      name='fieldOfStudy'
                      value={formData.fieldOfStudy}
                      onChange={handleChange}
                      placeholder='Enter field of study...'
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
            <div className='bg-white border border-neutral-30 rounded-12 auth-card box-shadow-lg'>
              <div className='mb-32'>
                <h3 className='mb-8 text-neutral-500 auth-title'>{stepTitle}</h3>
                <p className='mb-0 text-neutral-500'>
                  {currentStep === steps.DETAILS &&
                    "Please enter your admission details and verify your email to continue."}
                  {currentStep === steps.PASSWORD &&
                    "Choose a secure password to finish creating your account."}
                </p>
              </div>
              <div className='d-flex align-items-center gap-24 mb-24 auth-steps'>
                <span
                  className={`fw-semibold ${currentStep === steps.DETAILS ? 'text-main-600' : 'text-neutral-500'}`}
                >
                  1. Details
                </span>
                <span className='text-neutral-500'>/</span>
                <span
                  className={`fw-semibold ${currentStep === steps.PASSWORD ? 'text-main-600' : 'text-neutral-500'}`}
                >
                  2. Password
                </span>
              </div>
              <form onSubmit={handleSubmit}>
                {error ? (
                  <div className='alert alert-danger text-sm mb-20 rounded-8' role='alert' aria-live='polite'>
                    {error}
                  </div>
                ) : null}
                {message ? (
                  <div className='alert alert-success text-sm mb-20 rounded-8' role='alert' aria-live='polite'>
                    {message}
                  </div>
                ) : null}
                <div className='row gy-4'>{renderStepFields()}</div>
                <div className='mt-32'>
                  <button
                    type='submit'
                    className='btn btn-main rounded-pill flex-center gap-8 btn-block-sm btn-block-md'
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


