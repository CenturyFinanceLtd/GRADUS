import { useEffect, useMemo, useState } from "react";
import { submitContactInquiry } from "../services/contactService";
import { fetchCourseOptions } from "../services/courseService";

const REGION_OPTIONS = [
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
];

const SUBJECT_OPTIONS = ["General Inquiry", "Course Inquiry", "Others"];

const DEGREE_OPTIONS = [
  "B.Tech",
  "B.E.",
  "B.Sc",
  "B.Com",
  "B.A.",
  "BBA",
  "BCA",
  "B.Arch",
  "B.Pharm",
  "MBBS",
  "LLB",
  "B.Ed",
  "B.Des",
  "BHM",
  "BSW",
  "BMS",
  "B.Voc",
  "BFA",
  "M.Tech",
  "M.E.",
  "M.Sc",
  "M.Com",
  "M.A.",
  "MBA / PGDM",
  "MCA",
  "M.Arch",
  "M.Pharm",
  "MD",
  "MS (Medical)",
  "LLM",
  "M.Ed",
  "M.Des",
  "MPH",
  "MPA",
];

const SOCIAL_LINKS = [
  {
    href: "https://www.facebook.com/people/Gradus/61583093960559/?sk=about",
    label: "Facebook",
    icon: "/assets/social/facebook.svg",
  },
  {
    href: "https://www.instagram.com/gradusindiaofficial",
    label: "Instagram",
    icon: "/assets/social/instagram.svg",
  },
  {
    href: "https://linkedin.com/company/gradusindia",
    label: "linkedIn",
    icon: "/assets/social/linkedin.svg",
  },
  {
    href: "https://www.youtube.com/@gradusindia/",
    label: "YouTube",
    icon: "/assets/social/youtube.svg",
  },
  {
    href: "https://wa.me/+918448429040",
    label: "WhatsApp",
    icon: "/assets/social/whatsapp.svg",
  },
];

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
    subject: SUBJECT_OPTIONS[0],
  };

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

  const degreeOptionsList = useMemo(
    () => Array.from(new Set(DEGREE_OPTIONS)),
    []
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    if (name === "region") {
      setFormData((previous) => ({
        ...previous,
        region: value,
        institution: "",
      }));
      return;
    }
    setFormData((previous) => ({ ...previous, [name]: value }));
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
    const trimmedSubject = formData.subject.trim();

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
        message:
          trimmedSubject && trimmedMessage ? `[${trimmedSubject}] ${trimmedMessage}` : trimmedMessage,
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
    <section className='contact-page-section'>
      <div className='container'>
        <div className='contact-split-card'>
          <div className='contact-info-panel'>
            <h3 className='contact-info-title'>Contact Information</h3>
            <p className='contact-info-subtitle'>Call us during office hours if facing any doubts</p>

            <div className='contact-info-list'>
              <div className='contact-info-item'>
                <span className='contact-info-icon'>
                  <i className='ph-bold ph-phone-call' />
                </span>
                <div>
                  <p className='contact-info-label mb-4'>Call us</p>
                  <a className='contact-info-link d-inline-flex gap-6 align-items-center' href='tel:+918448429040'>
                    +91 84484 29040
                  </a>
                </div>
              </div>
              <div className='contact-info-item'>
                <span className='contact-info-icon'>
                  <i className='ph-bold ph-envelope-simple' />
                </span>
                <div>
                  <p className='contact-info-label mb-4'>Email</p>
                  <a
                    className='contact-info-link d-inline-flex gap-6 align-items-center'
                    href='mailto:contact@gradusindia.in'
                  >
                    contact@gradusindia.in
                  </a>
                </div>
              </div>
              <div className='contact-info-item align-items-start'>
                <span className='contact-info-icon'>
                  <i className='ph-bold ph-map-pin' />
                </span>
                <div>
                  <p className='contact-info-label mb-4'>Office</p>
                  <p className='contact-info-address mb-0'>
                    First floor, southern park, D-2, District Centre, Saket, New Delhi, 110017
                  </p>
                </div>
              </div>
            </div>

            <div className='contact-socials'>
              {SOCIAL_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target='_blank'
                  rel='noreferrer'
                  className='contact-social-link'
                  aria-label={link.label}
                >
                  <img src={link.icon} alt={link.label} />
                </a>
              ))}
            </div>
          </div>

          <div className='contact-form-panel'>
            <h3 className='contact-form-title mb-4'>Send us a message</h3>
            <p className='contact-form-subtitle'>Submit the form and we will reach you soon</p>

            <form id='contactForm' className='contact-form' onSubmit={handleSubmit} noValidate>
              <div className='contact-form-grid'>
                <div className='contact-form-field'>
                  <label htmlFor='name' className='contact-form-label'>
                    Full Name
                  </label>
                  <input
                    type='text'
                    className='contact-input'
                    id='name'
                    name='name'
                    placeholder='Enter your full name'
                    value={formData.name}
                    onChange={handleChange}
                    disabled={submitting}
                    required
                  />
                </div>
                <div className='contact-form-field'>
                  <label htmlFor='phone' className='contact-form-label'>
                    Phone Number
                  </label>
                  <input
                    type='tel'
                    className='contact-input'
                    id='phone'
                    name='phone'
                    placeholder='Enter your number'
                    value={formData.phone}
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
                    className='contact-input'
                    id='email'
                    name='email'
                    placeholder='Enter your email'
                    value={formData.email}
                    onChange={handleChange}
                    disabled={submitting}
                    required
                  />
                </div>
                <div className='contact-form-field'>
                  <label htmlFor='region' className='contact-form-label'>
                    University State
                  </label>
                  <select
                    id='region'
                    name='region'
                    className='contact-select contact-input'
                    value={formData.region}
                    onChange={handleChange}
                    disabled={submitting}
                    required
                  >
                    <option value=''>Select State</option>
                    {REGION_OPTIONS.map((region) => (
                      <option key={region} value={region}>
                        {region}
                      </option>
                    ))}
                  </select>
                </div>
                <div className='contact-form-field'>
                  <label htmlFor='institution' className='contact-form-label'>
                    University / College
                  </label>
                  <input
                    type='text'
                    className='contact-input'
                    id='institution'
                    name='institution'
                    placeholder='Enter your college or university'
                    value={formData.institution}
                    onChange={handleChange}
                    disabled={submitting}
                    required
                  />
                </div>
                <div className='contact-form-field'>
                  <label htmlFor='course' className='contact-form-label'>
                    Degree
                  </label>
                  <input
                    type='text'
                    id='course'
                    name='course'
                    className='contact-input'
                    placeholder='Start typing e.g. B.Tech, MBA'
                    list='degreeOptions'
                    value={formData.course}
                    onChange={handleChange}
                    disabled={submitting}
                    required
                  />
                  <datalist id='degreeOptions'>
                    {degreeOptionsList.map((degree) => (
                      <option key={degree} value={degree} />
                    ))}
                  </datalist>
                  {courseOptionsError ? (
                    <p className='contact-error text-danger-600 text-sm mb-0'>{courseOptionsError}</p>
                  ) : null}
                </div>

                <div className='contact-form-field contact-form-field--full'>
                  <span className='contact-form-label mb-2'>Select Subject?</span>
                  <div className='contact-radio-group'>
                    {SUBJECT_OPTIONS.map((option) => (
                      <label key={option} className='contact-radio'>
                        <input
                          type='radio'
                          name='subject'
                          value={option}
                          checked={formData.subject === option}
                          onChange={handleChange}
                          disabled={submitting}
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className='contact-form-field contact-form-field--full'>
                  <label htmlFor='desc' className='contact-form-label'>
                    Message
                  </label>
                  <textarea
                    id='desc'
                    name='message'
                    className='contact-textarea'
                    placeholder='Write your message..'
                    value={formData.message}
                    onChange={handleChange}
                    disabled={submitting}
                    required
                  />
                </div>

                {feedback && (
                  <div className='contact-form-field contact-form-field--full'>
                    <div
                      className={`alert mb-0 ${feedback.type === "success" ? "alert-success" : "alert-danger"}`}
                      role='alert'
                    >
                      {feedback.message}
                    </div>
                  </div>
                )}

                <div className='contact-form-field contact-form-field--full contact-actions'>
                  <p className='contact-helper mb-0'>Submit the form we will reach you soon</p>
                  <button type='submit' className='btn btn-main flex-center gap-8' disabled={submitting}>
                    {submitting ? "Submitting..." : "Submit"}
                    <i className='ph-bold ph-arrow-up-right d-flex text-lg' />
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactInner;
