import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Breadcrumb from "../components/Breadcrumb";
import FooterOne from "../components/FooterOne";
import HeaderOne from "../components/HeaderOne";
import Animation from "../helper/Animation";
import Preloader from "../helper/Preloader";
import { fetchCourseBySlug } from "../services/courseService";
import paymentService from "../services/paymentService";
import { useAuth } from "../context/AuthContext";

const CoursePaymentPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const courseSlug = (searchParams.get("course") || "").trim().toLowerCase();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadCourse = async () => {
      if (!courseSlug) {
        setError("No course was specified for enrollment.");
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
      setError("");

      try {
        // Load exact course to get accurate pricing (hero.priceINR)
        const response = await fetchCourseBySlug({ slug: courseSlug, token });
        if (!isMounted) return;
        const c = response?.course;
        if (!c) {
          setCourse(null);
          setError("We couldn't find the selected course.");
          return;
        }
        setCourse(c);
      } catch (err) {
        if (!isMounted) {
          return;
        }
        setCourse(null);
        setError(err?.message || "Unable to load course details.");
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

  const handleCompletePayment = async () => {
    if (!courseSlug || !token) return;

    setEnrolling(true);
    setError("");

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
              setError(e?.message || 'Unable to verify payment.');
            } finally {
              setEnrolling(false);
            }
          },
          prefill: {
            name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
            email: user?.email || '',
            contact: user?.mobile || '',
          },
          theme: { color: '#0066FF' },
          modal: {
            ondismiss: async () => {
              try {
                await paymentService.recordFailure({ token, orderId: order.orderId });
              } catch (e) {
                // no-op
              }
              setError('Payment was cancelled or failed.');
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
        setError('Payment SDK failed to load. Please refresh and try again.');
        setEnrolling(false);
      }
    } catch (err) {
      setError(err?.message || 'Payment could not be initiated. Please try again.');
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

    if (error && !course) {
      return (
        <div className='card p-32 rounded-24 border border-neutral-40 bg-white'>
          <div className='alert alert-danger mb-24' role='alert'>
            {error}
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
      try { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n || 0); } catch { return `₹${n}`; }
    };

    // Compute base and total (18% GST) for display
    const basePrice = (() => {
      const fromHero = Number(course?.hero?.priceINR);
      if (Number.isFinite(fromHero) && fromHero > 0) return fromHero;
      const fromStr = course?.price ? Number(String(course.price).replace(/[^0-9.]/g, '')) : 0;
      return Number.isFinite(fromStr) ? fromStr : 0;
    })();
    const gst = Math.round(basePrice * 0.18);
    const total = basePrice + gst;

    return (
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
        {error ? (
          <div className='alert alert-danger mb-24' role='alert'>
            {error}
          </div>
        ) : null}
        <div className='d-flex flex-wrap gap-12'>
          <button
            type='button'
            className='btn btn-main rounded-pill flex-align gap-8'
            onClick={handleCompletePayment}
            disabled={enrolling}
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
    );
  };

  return (
    <>
      <Preloader />
      <Animation />
      <HeaderOne />
        <Breadcrumb title={"Complete Enrollment"} />
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
