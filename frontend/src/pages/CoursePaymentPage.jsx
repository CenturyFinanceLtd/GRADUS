import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import FooterOne from "../components/FooterOne";
import HeaderOne from "../components/HeaderOne";
import Animation from "../helper/Animation";
import Preloader from "../helper/Preloader";
import { fetchCourseBySlug } from "../services/courseService";
import paymentService from "../services/paymentService";
import userService from "../services/userService";
import { useAuth } from "../context/AuthContext";

const normalizeDateInput = (value) => {
  if (!value || typeof value !== "string") {
    return "";
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  const alt = trimmed.match(/^(\d{2})[\/-](\d{2})[\/-](\d{4})$/);
  if (alt) {
    const [, day, month, year] = alt;
    return `${year}-${month}-${day}`;
  }
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return "";
};

const INDIAN_STATES = Object.freeze([
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
]);

const sanitizeStateValue = (value) => {
  const trimmed = (value || "").trim();
  if (trimmed && INDIAN_STATES.includes(trimmed)) {
    return trimmed;
  }
  return "";
};

const extractDigits = (value = "") => value.replace(/\D/g, "");
const normalizeWhatsappDigits = (value = "") => {
  const digits = extractDigits(value);
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return "";
};

const CoursePaymentPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { token, user, updateUser } = useAuth();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const courseSlug = (searchParams.get("course") || "").trim().toLowerCase();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkoutError, setCheckoutError] = useState("");
  const [enrolling, setEnrolling] = useState(false);
  const [profileForm, setProfileForm] = useState({
    whatsappNumber: "",
    stateName: "",
    dateOfBirth: "",
  });
  const [profileErrors, setProfileErrors] = useState({});
  const [profileFeedback, setProfileFeedback] = useState(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const maxDob = useMemo(() => new Date().toISOString().split("T")[0], []);

  useEffect(() => {
    let isMounted = true;

    const loadCourse = async () => {
      if (!courseSlug) {
        setCheckoutError("No course was specified for enrollment.");
        setLoading(false);
        return;
      }

      if (!token) {
        navigate(`/sign-in`, {
          replace: true,
          state: {
            redirectTo: `/payment?course=${encodeURIComponent(courseSlug)}`,
            pendingEnrollment: courseSlug,
          },
        });
        return;
      }

      setLoading(true);
      setCheckoutError("");

      try {
        // Load exact course to get accurate pricing (hero.priceINR)
        const response = await fetchCourseBySlug({ slug: courseSlug, token });
        if (!isMounted) return;
        const c = response?.course;
        if (!c) {
          setCourse(null);
          setCheckoutError("We couldn't find the selected course.");
          return;
        }
        setCourse(c);
      } catch (err) {
        if (!isMounted) {
          return;
        }
        setCourse(null);
        setCheckoutError(err?.message || "Unable to load course details.");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadCourse();

    return () => {
      isMounted = false;
    };
  }, [courseSlug, navigate, token]);

  useEffect(() => {
    setProfileForm({
      whatsappNumber: normalizeWhatsappDigits(user?.whatsappNumber || user?.mobile || ""),
      stateName: sanitizeStateValue(user?.personalDetails?.state || ""),
      dateOfBirth: normalizeDateInput(user?.personalDetails?.dob || user?.dob || ""),
      city: user?.personalDetails?.city || user?.city || "",
      college: user?.educationDetails?.institutionName || user?.college || "",
    });
    setProfileErrors({});
    setProfileFeedback(null);
  }, [user]);

  const validateProfileForm = (fields) => {
    const nextErrors = {};
    const whatsappDigits = normalizeWhatsappDigits(fields.whatsappNumber || "");
    if (!whatsappDigits) {
      nextErrors.whatsappNumber = "WhatsApp number is required.";
    }

    const stateValue = sanitizeStateValue(fields.stateName);
    if (!stateValue) {
      nextErrors.stateName = "Select your state.";
    }

    if (!(fields.city || "").trim()) {
      nextErrors.city = "City is required.";
    }

    if (!(fields.college || "").trim()) {
      nextErrors.college = "College is required.";
    }

    const dobValue = (fields.dateOfBirth || "").trim();
    if (!dobValue) {
      nextErrors.dateOfBirth = "Date of birth is required.";
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(dobValue)) {
      nextErrors.dateOfBirth = "Use the YYYY-MM-DD format.";
    }

    return nextErrors;
  };

  const handleProfileChange = (field) => (event) => {
    let value = event.target.value;
    if (field === "whatsappNumber") {
      value = extractDigits(value).slice(0, 10);
    }
    setProfileForm((prev) => ({ ...prev, [field]: value }));
    setProfileErrors((prev) => ({ ...prev, [field]: "" }));
    setProfileFeedback(null);
  };

  const saveProfileDetails = async ({ silent = false } = {}) => {
    const validationErrors = validateProfileForm(profileForm);
    setProfileErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      if (silent) {
        setCheckoutError("Please review the highlighted details before paying.");
      } else {
        setProfileFeedback({ type: "error", message: "Please fix the highlighted fields." });
      }
      return false;
    }

    if (!token) {
      if (silent) {
        setCheckoutError("Your session expired. Please sign in again.");
      } else {
        setProfileFeedback({ type: "error", message: "Please sign in again to save changes." });
      }
      return false;
    }

    if (!silent) {
      setProfileSaving(true);
      setProfileFeedback(null);
    }

    try {
      const sanitizedState = sanitizeStateValue(profileForm.stateName);
      const sanitizedWhatsapp = normalizeWhatsappDigits(profileForm.whatsappNumber);
      const response = await userService.updateProfile({
        token,
        data: {
          whatsappNumber: sanitizedWhatsapp,
          mobile: sanitizedWhatsapp,
          personalDetails: {
            state: sanitizedState,
            dob: profileForm.dateOfBirth.trim(),
            city: profileForm.city.trim(),
          },
          educationDetails: {
            institutionName: profileForm.college.trim(),
          },
        },
      });

      if (response?.user) {
        const returnedUser = response.user || user; // Fallback to current user if response.user is null
        updateUser(returnedUser);
        setProfileForm((prev) => ({
          ...prev,
          stateName: sanitizeStateValue(returnedUser?.personalDetails?.state || prev.stateName),
          whatsappNumber: normalizeWhatsappDigits(returnedUser?.whatsappNumber || returnedUser?.mobile || prev.whatsappNumber),
          city: returnedUser?.personalDetails?.city || returnedUser?.city || prev.city,
          college: returnedUser?.educationDetails?.institutionName || returnedUser?.college || prev.college,
          dateOfBirth: normalizeDateInput(returnedUser?.personalDetails?.dob || returnedUser?.dob || prev.dateOfBirth),
        }));
      }

      if (!silent) {
        setProfileFeedback({ type: "success", message: "Details saved successfully." });
      }
      return true;
    } catch (saveError) {
      const message = saveError?.message || "Unable to save details.";
      if (silent) {
        setCheckoutError(message);
      } else {
        setProfileFeedback({ type: "error", message });
      }
      return false;
    } finally {
      if (!silent) {
        setProfileSaving(false);
      }
    }
  };

  const handleSaveProfile = async () => {
    await saveProfileDetails();
  };

  const handleCompletePayment = async () => {
    if (!courseSlug || !token) return;

    setEnrolling(true);
    setCheckoutError("");

    const profileSaved = await saveProfileDetails({ silent: true });
    if (!profileSaved) {
      setEnrolling(false);
      return;
    }

    try {
      // 1) Create order on the server (amount + 18% GST is computed server-side)
      const order = await paymentService.createCourseOrder({ slug: courseSlug, token });

      const openCheckout = () => {
        const rzpOptions = {
          key: order.keyId,
          amount: order.amount,
          currency: order.currency || 'INR',
          name: 'Gradus',
          description: `Course enrollment - ${order?.course?.name || ''}`,
          order_id: order.orderId,
          handler: async function (response) {
            try {
              await paymentService.verifyPayment({
                token,
                data: {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                },
              });
              navigate(`/our-courses`, {
                replace: true,
                state: { enrollmentCompleted: courseSlug },
              });
            } catch (e) {
              setCheckoutError(e?.message || 'Unable to verify payment.');
            } finally {
              setEnrolling(false);
            }
          },
          prefill: {
            name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
            email: user?.email || '',
            contact:
              normalizeWhatsappDigits(profileForm.whatsappNumber) ||
              normalizeWhatsappDigits(user?.mobile || ''),
          },
          theme: { color: '#0066FF' },
          modal: {
            ondismiss: async () => {
              try {
                await paymentService.recordFailure({ token, orderId: order.orderId });
              } catch (e) {
                // no-op
              }
              setCheckoutError('Payment was cancelled or failed.');
              setEnrolling(false);
            },
          },
        };

        const rzp = new window.Razorpay(rzpOptions);
        rzp.open();
      };

      if (typeof window !== 'undefined' && window.Razorpay) {
        openCheckout();
      } else {
        setCheckoutError('Payment SDK failed to load. Please refresh and try again.');
        setEnrolling(false);
      }
    } catch (err) {
      setCheckoutError(err?.message || 'Payment could not be initiated. Please try again.');
      setEnrolling(false);
    }
  };

  const handleCancel = () => {
    navigate("/our-courses");
  };

  const renderContent = () => {

    if (loading) {

      return (

        <div className='d-flex justify-content-center py-80'>

          <div className='text-center'>

            <div className='spinner-border text-main-600 mb-16' role='status'>

              <span className='visually-hidden'>Processing…</span>

            </div>

            <p className='text-neutral-600 mb-0'>Preparing a secure checkout experience…</p>

          </div>

        </div>

      );

    }



    if (checkoutError && !course) {

      return (

        <div className='card p-32 rounded-24 border border-neutral-40 bg-white'>

          <div className='alert alert-danger mb-24' role='alert'>

            {checkoutError}

          </div>

          <button type='button' className='btn btn-main rounded-pill' onClick={handleCancel}>

            Back to Courses

          </button>

        </div>

      );

    }



    if (!course) {

      return null;

    }



    const formatINR = (n) => {

      try {

        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n || 0);

      } catch {

        return `₹${n}`;

      }

    };



    const basePrice = (() => {

      const fromHero = Number(course?.hero?.priceINR);

      if (Number.isFinite(fromHero) && fromHero > 0) return fromHero;

      const fromStr = course?.price ? Number(String(course.price).replace(/[^0-9.]/g, '')) : 0;

      return Number.isFinite(fromStr) ? fromStr : 0;

    })();

    const gst = Math.ceil(basePrice * 0.18);

    const total = basePrice + gst;



    console.log("PaymentPage User Check:", {
      state: user?.personalDetails?.state || user?.state,
      city: user?.personalDetails?.city || user?.city,
      college: user?.educationDetails?.institutionName || user?.college,
      dob: user?.personalDetails?.dob || user?.dob || user?.personalDetails?.dateOfBirth
    });

    const isProfileComplete =
      Boolean((user?.personalDetails?.state || user?.state) &&
        (user?.personalDetails?.city || user?.city) &&
        (user?.educationDetails?.institutionName || user?.college) &&
        (user?.personalDetails?.dob || user?.dob || user?.personalDetails?.dateOfBirth));

    return (
      <div className='d-grid gap-24'>

        <div className='card p-32 rounded-24 border border-neutral-40 bg-white box-shadow-md'>
          <h3 className='text-neutral-900 mb-8'>Confirm your learner details</h3>
          <p className='text-neutral-600 mb-24'>
            We use these details for enrollment records and certificate generation.
          </p>

          {profileFeedback ? (
            <div
              className={`alert ${profileFeedback.type === "success" ? "alert-success" : "alert-danger"
                } mb-24`}
              role={profileFeedback.type === "success" ? "status" : "alert"}
            >
              {profileFeedback.message}
            </div>
          ) : null}

          <div className='row gy-4'>
            {/* Full Name */}
            <div className='col-md-6'>
              <label className='form-label fw-semibold text-neutral-900'>Name</label>
              <input
                type='text'
                className='form-control bg-neutral-20'
                value={user?.fullname || `${user?.firstName || ""} ${user?.lastName || ""}`.trim()}
                disabled
              />
            </div>

            {/* Mobile Number */}
            <div className='col-md-6'>
              <label className='form-label fw-semibold text-neutral-900'>Mobile Number</label>
              <input
                type='text'
                className='form-control bg-neutral-20'
                value={user?.mobile || user?.whatsappNumber || ""}
                disabled
              />
            </div>

            {/* Email ID */}
            <div className='col-12'>
              <label className='form-label fw-semibold text-neutral-900'>Email ID</label>
              <input
                type='text'
                className='form-control bg-neutral-20'
                value={user?.email || ""}
                disabled
              />
            </div>

            {/* State */}
            <div className='col-md-6'>
              <label className='form-label fw-semibold text-neutral-900'>State</label>
              {user?.personalDetails?.state ? (
                <input
                  type='text'
                  className='form-control bg-neutral-20'
                  value={user.personalDetails.state}
                  disabled
                />
              ) : (
                <>
                  <select
                    name='stateName'
                    className={`form-select checkout-select ${profileErrors.stateName ? 'is-invalid' : ''}`}
                    value={profileForm.stateName}
                    onChange={handleProfileChange("stateName")}
                    disabled={profileSaving || enrolling}
                  >
                    <option value=''>Select your state</option>
                    {INDIAN_STATES.map((stateOption) => (
                      <option value={stateOption} key={stateOption}>
                        {stateOption}
                      </option>
                    ))}
                  </select>
                  {profileErrors.stateName && <div className='invalid-feedback d-block'>{profileErrors.stateName}</div>}
                </>
              )}
            </div>

            {/* City */}
            <div className='col-md-6'>
              <label className='form-label fw-semibold text-neutral-900'>City</label>
              {user?.personalDetails?.city || user?.city ? (
                <input
                  type='text'
                  className='form-control bg-neutral-20'
                  value={user?.personalDetails?.city || user?.city}
                  disabled
                />
              ) : (
                <>
                  <input
                    type='text'
                    name='city'
                    className={`form-control ${profileErrors.city ? 'is-invalid' : ''}`}
                    placeholder='Enter your city'
                    value={profileForm.city}
                    onChange={handleProfileChange("city")}
                    disabled={profileSaving || enrolling}
                  />
                  {profileErrors.city && <div className='invalid-feedback d-block'>{profileErrors.city}</div>}
                </>
              )}
            </div>

            {/* College */}
            <div className='col-12'>
              <label className='form-label fw-semibold text-neutral-900'>College</label>
              {user?.educationDetails?.institutionName || user?.college ? (
                <input
                  type='text'
                  className='form-control bg-neutral-20'
                  value={user?.educationDetails?.institutionName || user?.college}
                  disabled
                />
              ) : (
                <>
                  <input
                    type='text'
                    name='college'
                    className={`form-control ${profileErrors.college ? 'is-invalid' : ''}`}
                    placeholder='Enter your college/university'
                    value={profileForm.college}
                    onChange={handleProfileChange("college")}
                    disabled={profileSaving || enrolling}
                  />
                  {profileErrors.college && <div className='invalid-feedback d-block'>{profileErrors.college}</div>}
                </>
              )}
            </div>

            {/* Date of Birth */}
            <div className='col-12'>
              <label className='form-label fw-semibold text-neutral-900'>Date of Birth</label>
              {user?.personalDetails?.dob || user?.dob ? (
                <input
                  type='date'
                  className='form-control bg-neutral-20'
                  value={normalizeDateInput(user?.personalDetails?.dob || user?.dob)}
                  disabled
                />
              ) : (
                <>
                  <input
                    type='date'
                    name='dateOfBirth'
                    className={`form-control ${profileErrors.dateOfBirth ? 'is-invalid' : ''}`}
                    value={profileForm.dateOfBirth}
                    onChange={handleProfileChange("dateOfBirth")}
                    max={maxDob}
                    disabled={profileSaving || enrolling}
                  />
                  {profileErrors.dateOfBirth && <div className='invalid-feedback d-block'>{profileErrors.dateOfBirth}</div>}
                </>
              )}
            </div>
          </div>

          {/* Only show Save button if there are fields to update */}
          {(!isProfileComplete) ? (
            <div className='d-flex flex-wrap gap-12 mt-24'>
              <button
                type='button'
                className='btn btn-main rounded-pill'
                onClick={handleSaveProfile}
                disabled={profileSaving || enrolling}
              >
                {profileSaving ? "Saving details..." : "Save details"}
              </button>
              <p className='text-neutral-500 mb-0 align-self-center small'>
                Please save your details to proceed.
              </p>
            </div>
          ) : null}
        </div>

        <div className='card p-32 rounded-24 border border-neutral-40 bg-white box-shadow-md'>

          <h3 className='text-neutral-900 mb-16'>Secure Enrollment Checkout</h3>

          <p className='text-neutral-600 mb-24'>

            Review your program details and confirm the enrollment payment to unlock the complete

            curriculum.

          </p>

          <div className='d-grid gap-16 mb-24'>

            <div className='d-flex justify-content-between align-items-center'>

              <span className='text-neutral-500'>Course</span>

              <span className='text-neutral-900 fw-semibold'>{course.name || ''}</span>

            </div>

            {course.subtitle ? (

              <div className='d-flex justify-content-between align-items-center'>

                <span className='text-neutral-500'>Track</span>

                <span className='text-neutral-900'>{course.subtitle}</span>

              </div>

            ) : null}

            <div className='d-flex justify-content-between align-items-center'>

              <span className='text-neutral-500'>Program Fee</span>

              <span className='text-main-600 fw-semibold text-lg'>

                {basePrice > 0 ? `${formatINR(basePrice)} + 18% GST = ${formatINR(total)}` : 'Included'}

              </span>

            </div>

          </div>

          <div className='mb-24 p-24 rounded-20 bg-main-25 border border-main-100'>

            <h5 className='text-neutral-900 mb-12'>Payment Summary</h5>

            <p className='text-neutral-600 mb-0'>

              You will be securely redirected to Razorpay to complete your payment. Final amount includes 18% GST.

            </p>

          </div>

          {checkoutError ? (

            <div className='alert alert-danger mb-24' role='alert'>

              {checkoutError}

            </div>

          ) : null}

          <div className='d-flex flex-wrap gap-12'>

            <button

              type='button'

              className='btn btn-main rounded-pill flex-align gap-8'

              onClick={handleCompletePayment}

              disabled={enrolling || !isProfileComplete}
              style={{ opacity: isProfileComplete ? 1 : 0.5, cursor: isProfileComplete ? 'pointer' : 'not-allowed' }}

            >

              {enrolling ? "Processing…" : "Pay Securely"}

              <i className='ph-bold ph-lock-simple-open d-inline-flex text-lg' />

            </button>

            <button

              type='button'

              className='btn btn-outline-neutral-500 rounded-pill'

              onClick={handleCancel}

              disabled={enrolling}

            >

              Cancel and Return

            </button>

          </div>

        </div>

      </div>

    );

  };

  return (
    <>
      <Preloader />
      <Animation />
      <HeaderOne />
      <section className='py-120'>
        <div className='container'>
          <div className='row justify-content-center'>
            <div className='col-xl-7 col-lg-8'>{renderContent()}</div>
          </div>
        </div>
      </section>
      <FooterOne />
    </>
  );
};

export default CoursePaymentPage;
