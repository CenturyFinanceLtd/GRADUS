import { useState } from "react";
import { submitContactInquiry } from "../services/contactService";
import { courseSeriesData } from "../data/courseSeriesData";

const ContactInner = () => {
  const initialFormState = {
    name: "",
    email: "",
    phone: "",
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

  const courseOptions = courseSeriesData.map((course) => course.name);

  const [formData, setFormData] = useState(initialFormState);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

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
      <section className='contact-form-section py-240 bg-main-25 position-relative z-1'>
        <img
          src='/assets/images/bg/wave-bg.png'
          alt=''
          className='position-absolute top-0 start-0 w-100 h-100 z-n1 d-lg-block d-none'
        />
        <div className='container'>
          <div className='row justify-content-center text-center text-lg-start'>
            <div className='col-xl-8 col-lg-10'>
              <div className='flex-center flex-lg-start'>
                <div className='flex-align d-inline-flex gap-8 mb-16'>
                  <span className='text-main-600 text-2xl d-flex'>
                    <i className='ph-bold ph-book' />
                  </span>
                  <h5 className='text-main-600 mb-0'>Talk to Gradus</h5>
                </div>
              </div>
              <h2 className='mb-24 text-capitalize'>Shape industry-ready futures with Gradus</h2>
              <p className='text-neutral-500 text-line-3 max-w-636 mx-auto mx-lg-0'>
                Share your learner, campus, or workforce goals and we'll craft a tailored, industry-aligned pathway.
                With 16+ years of experience, employer-led mentors, and immersive internships, the Gradus team accelerates outcomes with confidence.
              </p>
              <div className='d-flex flex-column flex-lg-row align-items-center gap-24 mt-32'>
                <div className='enrolled-students mt-0 d-flex gap-12'>
                  <img
                    src='/assets/images/thumbs/enroll-student-img1.png'
                    alt=''
                    className='w-48 h-48 rounded-circle object-fit-cover transition-2'
                  />
                  <img
                    src='/assets/images/thumbs/enroll-student-img2.png'
                    alt=''
                    className='w-48 h-48 rounded-circle object-fit-cover transition-2'
                  />
                  <img
                    src='/assets/images/thumbs/enroll-student-img3.png'
                    alt=''
                    className='w-48 h-48 rounded-circle object-fit-cover transition-2'
                  />
                  <img
                    src='/assets/images/thumbs/enroll-student-img4.png'
                    alt=''
                    className='w-48 h-48 rounded-circle object-fit-cover transition-2'
                  />
                  <img
                    src='/assets/images/thumbs/enroll-student-img5.png'
                    alt=''
                    className='w-48 h-48 rounded-circle object-fit-cover transition-2'
                  />
                  <img
                    src='/assets/images/thumbs/enroll-student-img6.png'
                    alt=''
                    className='w-48 h-48 rounded-circle object-fit-cover transition-2'
                  />
                </div>
                <div className='text-center text-lg-start'>
                  <ul className='flex-align gap-4 justify-content-center justify-content-lg-start mb-12'>
                    <li className='text-warning-600 text-2xl d-flex'>
                      <i className='ph-fill ph-star' />
                    </li>
                    <li className='text-warning-600 text-2xl d-flex'>
                      <i className='ph-fill ph-star' />
                    </li>
                    <li className='text-warning-600 text-2xl d-flex'>
                      <i className='ph-fill ph-star' />
                    </li>
                    <li className='text-warning-600 text-2xl d-flex'>
                      <i className='ph-fill ph-star' />
                    </li>
                    <li className='text-warning-600 text-2xl d-flex'>
                      <i className='ph-fill ph-star-half' />
                    </li>
                  </ul>
                  <span className='text-neutral-700 fw-medium d-block'>
                    4.9/5 satisfaction from campuses & hiring partners
                  </span>
                  <span className='text-neutral-500 d-block'>
                    178+ hiring alliances | 25k+ careers accelerated
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className='row justify-content-center mt-60'>
            <div className='col-xl-8 col-lg-10'>
              <div className='p-24 bg-white rounded-12 box-shadow-md'>
                <div className='border border-neutral-30 rounded-8 bg-main-25 p-24'>
                  <form id='contactForm' onSubmit={handleSubmit} noValidate>
                    <h4 className='mb-0 text-center text-lg-start'>Get In Touch</h4>
                    <span className='d-block border border-neutral-30 my-24 border-dashed' />
                    <div className='row'>
                      <div className='col-md-6 mb-24'>
                        <label
                          htmlFor='name'
                          className='text-neutral-700 text-lg fw-medium mb-12'
                        >
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
                      <div className='col-md-6 mb-24'>
                        <label
                          htmlFor='email'
                          className='text-neutral-700 text-lg fw-medium mb-12'
                        >
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
                      <div className='col-md-6 mb-24'>
                        <label
                          htmlFor='phone'
                          className='text-neutral-700 text-lg fw-medium mb-12'
                        >
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
                      <div className='col-md-6 mb-24'>
                        <label
                          htmlFor='region'
                          className='text-neutral-700 text-lg fw-medium mb-12'
                        >
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
                      <div className='col-md-6 mb-24'>
                        <label
                          htmlFor='institution'
                          className='text-neutral-700 text-lg fw-medium mb-12'
                        >
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
                      <div className='col-md-6 mb-24'>
                        <label
                          htmlFor='course'
                          className='text-neutral-700 text-lg fw-medium mb-12'
                        >
                          Course
                        </label>
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
                          {courseOptions.map((course) => (
                            <option key={course} value={course}>
                              {course}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className='col-12 mb-24'>
                        <label
                          htmlFor='desc'
                          className='text-neutral-700 text-lg fw-medium mb-12'
                        >
                          Message
                        </label>
                        <textarea
                          id='desc'
                          name='message'
                          className='common-input rounded-24 border-transparent focus-border-main-600 h-110'
                          placeholder='Enter Your Message...'
                          value={formData.message}
                          onChange={handleChange}
                          disabled={submitting}
                          required
                        />
                      </div>
                      {feedback && (
                        <div className='col-12'>
                          <div
                            className={`alert mt-8 mb-0 ${
                              feedback.type === "success" ? "alert-success" : "alert-danger"
                            }`}
                            role='alert'
                          >
                            {feedback.message}
                          </div>
                        </div>
                      )}
                      <div className='col-12'>
                        <div className='d-flex justify-content-center justify-content-lg-start'>
                          <button
                            type='submit'
                            className='btn btn-main rounded-pill flex-center gap-8 mt-32'
                            disabled={submitting}
                          >
                            {submitting ? "Sending..." : "Send Message"}
                            <i className='ph-bold ph-arrow-up-right d-flex text-lg' />
                          </button>
                        </div>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default ContactInner;
