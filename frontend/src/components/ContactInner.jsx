import { useEffect, useMemo, useState } from "react";
import { submitContactInquiry } from "../services/contactService";
import { fetchCourseOptions } from "../services/courseService";

const ContactInner = () => {
  const initialFormState = {
    name: "",
    email: "",
    phone: "",
    state: "",
    region: "",
    institution: "",
    course: "",
    message: "",
  };

  const regionOptions = [
    "North India",
    "South India",
    "East India",
    "West India",
    "Central India",
    "North-East India",
    "Union Territories",
  ];

  const [courseOptions, setCourseOptions] = useState([]);
  const [courseOptionsLoading, setCourseOptionsLoading] = useState(true);
  const [courseOptionsError, setCourseOptionsError] = useState(null);

  const [formData, setFormData] = useState(initialFormState);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadCourseOptions = async () => {
      setCourseOptionsLoading(true);
      setCourseOptionsError(null);

      try {
        const response = await fetchCourseOptions();
        if (!isMounted) {
          return;
        }
        const items = Array.isArray(response?.items) ? response.items : [];
        setCourseOptions(items.filter((item) => item?.name));
      } catch (error) {
        if (!isMounted) {
          return;
        }
        setCourseOptions([]);
        setCourseOptionsError(error?.message || "Unable to load courses.");
      } finally {
        if (isMounted) {
          setCourseOptionsLoading(false);
        }
      }
    };

    loadCourseOptions();

    return () => {
      isMounted = false;
    };
  }, []);

  const courseOptionNames = useMemo(
    () => courseOptions.map((item) => item.name),
    [courseOptions]
  );

  const hasCourseOptions = courseOptionNames.length > 0;

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFeedback(null);

    const trimmedName = formData.name.trim();
    const trimmedEmail = formData.email.trim();
    const trimmedPhone = formData.phone.trim();
    const trimmedRegion = formData.region.trim();
    const trimmedInstitution = formData.institution.trim();
    const trimmedCourse = formData.course.trim();
    const trimmedMessage = formData.message.trim();

    if (!trimmedName) {
      setFeedback({ type: "danger", message: "Please enter your name." });
      return;
    }

    if (!trimmedEmail) {
      setFeedback({ type: "danger", message: "Please provide your email address." });
      return;
    }

    if (!trimmedPhone) {
      setFeedback({ type: "danger", message: "Please provide your phone number." });
      return;
    }

    if (!trimmedRegion) {
      setFeedback({ type: "danger", message: "Please select your region." });
      return;
    }

    if (!trimmedInstitution) {
      setFeedback({ type: "danger", message: "Please enter your college or university." });
      return;
    }

    if (!trimmedCourse) {
      setFeedback({ type: "danger", message: "Please share the course you're interested in." });
      return;
    }

    if (trimmedMessage.length === 0) {
      setFeedback({ type: "danger", message: "Please include a brief message." });
      return;
    }

    setSubmitting(true);

    try {
      await submitContactInquiry({
        ...formData,
        state: formData.state || "",
        name: trimmedName,
        email: trimmedEmail,
        phone: trimmedPhone,
        region: trimmedRegion,
        institution: trimmedInstitution,
        course: trimmedCourse,
        message: trimmedMessage,
      });

      setFeedback({
        type: "success",
        message: "Thanks for reaching out! Our team will contact you shortly.",
      });
      setFormData({ ...initialFormState });
    } catch (error) {
      setFeedback({
        type: "danger",
        message: error?.message || "We could not send your message. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <section className='contact-page-section position-relative overflow-hidden z-1'>
        <span className='contact-page-accent contact-page-accent--one' aria-hidden='true' />
        <span className='contact-page-accent contact-page-accent--two' aria-hidden='true' />
        <div className='container position-relative z-1'>
          <div className='row gy-5 gx-xl-5 align-items-start justify-content-between'>
            <div className='col-xl-5 col-lg-6'>
              <div className='contact-intro-card h-100'>
                <span className='contact-badge mb-20'>
                  <span className='contact-badge__icon d-flex align-items-center justify-content-center'>
                    <i className='ph-bold ph-book' />
                  </span>
                  Talk to Gradus
                </span>
                <h2 className='contact-title text-capitalize mb-24'>
                  Shape industry-ready futures with Gradus
                </h2>
                <div className='contact-highlight-card'>
                  <p className='mb-0 text-neutral-500'>
                    Share your learner, campus, or workforce goals and we'll craft a tailored, industry-aligned pathway. With 16+ years of experience, employer-led mentors, and immersive internships, the Gradus team accelerates outcomes with confidence.
                  </p>
                </div>
              </div>
            </div>
            <div className='col-xl-7 col-lg-6'>
              <div className='contact-form-card'>
                <form id='contactForm' className='contact-form' onSubmit={handleSubmit} noValidate>
                  <div className='contact-form-header'>
                    <h4 className='mb-0'>Get In Touch</h4>
                  </div>
                  <div className='contact-form-grid'>
                    <div className='contact-form-field'>
                      <label htmlFor='name' className='contact-form-label'>
                        Name
                      </label>
                      <input
                        type='text'
                        className='common-input rounded-pill border-transparent focus-border-main-600'
                        id='name'
                        name='name'
                        placeholder='Enter Name...'
                        value={formData.name}
                        onChange={handleChange}
                        disabled={submitting}
                        required
                      />
                    </div>
                    <div className='contact-form-field'>
                      <label htmlFor='email' className='contact-form-label'>
                        Email
                      </label>
                      <input
                        type='email'
                        className='common-input rounded-pill border-transparent focus-border-main-600'
                        id='email'
                        name='email'
                        placeholder='Enter Email...'
                        value={formData.email}
                        onChange={handleChange}
                        disabled={submitting}
                        required
                      />
                    </div>
                    <div className='contact-form-field'>
                      <label htmlFor='phone' className='contact-form-label'>
                        Phone
                      </label>
                      <input
                        type='tel'
                        className='common-input rounded-pill border-transparent focus-border-main-600'
                        id='phone'
                        name='phone'
                        placeholder='Enter Your Number...'
                        value={formData.phone}
                        onChange={handleChange}
                        disabled={submitting}
                        required
                      />
                    </div>
                    <div className='contact-form-field'>
                      <label htmlFor='region' className='contact-form-label'>
                        Region
                      </label>
                      <select
                        id='region'
                        name='region'
                        className='common-input rounded-pill border-transparent focus-border-main-600'
                        value={formData.region}
                        onChange={handleChange}
                        disabled={submitting}
                        required
                      >
                        <option value=''>Select Region</option>
                        {regionOptions.map((region) => (
                          <option key={region} value={region}>
                            {region}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className='contact-form-field'>
                      <label htmlFor='institution' className='contact-form-label'>
                        College / University
                      </label>
                      <input
                        type='text'
                        className='common-input rounded-pill border-transparent focus-border-main-600'
                        id='institution'
                        name='institution'
                        placeholder='Enter College or University...'
                        value={formData.institution}
                        onChange={handleChange}
                        disabled={submitting}
                        required
                      />
                    </div>
                    <div className='contact-form-field'>
                      <label htmlFor='course' className='contact-form-label'>
                        Course
                      </label>
                      {courseOptionsLoading ? (
                        <select
                          id='course'
                          name='course'
                          className='common-input rounded-pill border-transparent focus-border-main-600'
                          disabled
                          value=''
                        >
                          <option value=''>Loading courses…</option>
                        </select>
                      ) : hasCourseOptions ? (
                        <select
                          id='course'
                          name='course'
                          className='common-input rounded-pill border-transparent focus-border-main-600'
                          value={formData.course}
                          onChange={handleChange}
                          disabled={submitting}
                          required
                        >
                          <option value=''>Select Course</option>
                          {courseOptionNames.map((courseName) => (
                            <option key={courseName} value={courseName}>
                              {courseName}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type='text'
                          id='course'
                          name='course'
                          className='common-input rounded-pill border-transparent focus-border-main-600'
                          placeholder='Enter Course...'
                          value={formData.course}
                          onChange={handleChange}
                          disabled={submitting}
                          required
                        />
                      )}
                      {courseOptionsError ? (
                        <p className='contact-error text-danger-600 text-sm mb-0'>{courseOptionsError}</p>
                      ) : null}
                    </div>
                    <div className='contact-form-field contact-form-field--full'>
                      <label htmlFor='desc' className='contact-form-label'>
                        Message
                      </label>
                      <textarea
                        id='desc'
                        name='message'
                        className='common-input rounded-24 border-transparent focus-border-main-600 contact-textarea'
                        placeholder='Enter Your Message...'
                        value={formData.message}
                        onChange={handleChange}
                        disabled={submitting}
                        required
                      />
                    </div>
                    {feedback && (
                      <div className='contact-form-field contact-form-field--full'>
                        <div
                          className={`alert mb-0 ${
                            feedback.type === "success" ? "alert-success" : "alert-danger"
                          }`}
                          role='alert'
                        >
                          {feedback.message}
                        </div>
                      </div>
                    )}
                    <div className='contact-form-field contact-form-field--full'>
                      <button
                        type='submit'
                        className='btn btn-main rounded-pill flex-center gap-8'
                        disabled={submitting}
                      >
                        {submitting ? "Sending..." : "Send Message"}
                        <i className='ph-bold ph-arrow-up-right d-flex text-lg' />
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default ContactInner;
