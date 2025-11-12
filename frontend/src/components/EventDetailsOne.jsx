import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { submitContactInquiry } from "../services/contactService";

const TABS = [
  { id: "overview", icon: "ph-squares-four", label: "Overview" },
  { id: "instructor", icon: "ph-user-circle", label: "Instructor" },
  { id: "help", icon: "ph-headset", label: "Help" },
];

const formatDate = (iso) => {
  if (!iso) return "TBA";
  try {
    return new Intl.DateTimeFormat("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return "TBA";
  }
};

const formatTime = (iso, timezone) => {
  if (!iso) return "TBA";
  try {
    return `${new Intl.DateTimeFormat("en-IN", {
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso))} ${timezone || ""}`.trim();
  } catch {
    return "TBA";
  }
};

const EventTabs = ({ active, onChange }) => (
  <div className='event-tabs'>
    {TABS.map((tab) => (
      <button
        key={tab.id}
        type='button'
        className={`event-tab ${active === tab.id ? "is-active" : ""}`}
        onClick={() => onChange(tab.id)}
      >
        <i className={`ph ${tab.icon}`} aria-hidden />
        {tab.label}
      </button>
    ))}
  </div>
);

const OverviewTab = ({ event }) => {
  const paragraphs = (event?.description || "")
    .split(/\n+/)
    .map((text) => text.trim())
    .filter(Boolean);

  return (
    <div className='event-overview'>
      <h2 className='event-section-title'>What you will learn in this masterclass</h2>
      {event?.meta?.highlights?.length ? (
        <ul className='event-highlight-list'>
          {event.meta.highlights.map((item, index) => (
            <li key={`highlight-${index}`}>{item}</li>
          ))}
        </ul>
      ) : null}
      {paragraphs.length ? (
        paragraphs.map((text, index) => (
          <p key={`paragraph-${index}`} className='text-neutral-700 mb-16'>
            {text}
          </p>
        ))
      ) : (
        <p className='text-neutral-500'>No description provided.</p>
      )}
      {event?.meta?.agenda?.length ? (
        <div className='event-agenda mt-40'>
          <h4 className='mb-16'>Agenda</h4>
          <ol className='event-agenda__list'>
            {event.meta.agenda.map((item, index) => (
              <li key={`agenda-${index}`}>{item}</li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
};

const InstructorTab = ({ event }) => (
  <div className='event-overview'>
    <h2 className='event-section-title'>Instructor</h2>
    <div className='event-instructor-card'>
      <div className='event-host-avatar rounded-circle bg-main-25 text-main-600 fw-semibold'>
        {(event?.host?.name || "G")[0]}
      </div>
      <div>
        <p className='fw-semibold mb-2'>{event?.host?.name || "Gradus Mentor"}</p>
        <p className='text-neutral-500 mb-0'>{event?.host?.title || "Lead Instructor"}</p>
      </div>
    </div>
    <p className='text-neutral-600 mt-16'>
      {event?.host?.bio ||
        "Our mentors bring real-world expertise from top institutions and make every session interactive and actionable."}
    </p>
  </div>
);

const HelpTab = () => (
  <div className='event-overview'>
    <h2 className='event-section-title'>Need assistance?</h2>
    <p className='text-neutral-600 mb-16'>
      Reach our learner success team if you have questions about enrolment, prerequisites, or need a
      custom corporate cohort.
    </p>
    <ul className='event-highlight-list'>
      <li>Email: <a href='mailto:hello@gradusindia.in'>hello@gradusindia.in</a></li>
      <li>Phone / WhatsApp: <a href='tel:+919999999999'>+91 99999 99999</a></li>
      <li>
        Support Center:{" "}
        <Link to='/support' className='text-main-600'>
          Open a ticket
        </Link>
      </li>
    </ul>
  </div>
);

const RegistrationCard = ({ event }) => {
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [status, setStatus] = useState({ submitting: false, success: false, error: null });

  const { dateLabel, timeLabel } = useMemo(
    () => ({
      dateLabel: formatDate(event?.schedule?.start),
      timeLabel: formatTime(event?.schedule?.start, event?.schedule?.timezone),
    }),
    [event?.schedule?.start, event?.schedule?.timezone]
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone) return;

    try {
      setStatus({ submitting: true, success: false, error: null });
      await submitContactInquiry({
        name: form.name,
        email: form.email,
        phone: form.phone,
        region: "events",
        institution: event?.host?.name || "Gradus",
        course: event?.title || "Event",
        message: `Interested in ${event?.title || "event"} masterclass`,
      });
      setStatus({ submitting: false, success: true, error: null });
      setForm({ name: "", email: "", phone: "" });
    } catch (err) {
      setStatus({
        submitting: false,
        success: false,
        error: err?.message || "Failed to register interest",
      });
    }
  };

  return (
    <aside className='event-register-card'>
      <div className='event-register-card__thumb'>
        <img
          src={event?.heroImage?.url || "/assets/images/thumbs/event-img1.png"}
          alt={event?.heroImage?.alt || event?.title || "Event"}
          loading='lazy'
        />
      </div>
      <div className='event-register-card__slot'>
        <i className='ph ph-info' />
        <span>
          Upcoming slot is {dateLabel} at {timeLabel}
        </span>
      </div>
      <form className='event-register-card__form' onSubmit={handleSubmit}>
        <label className='form-label text-sm fw-semibold'>Name *</label>
        <input
          className='form-control'
          name='name'
          value={form.name}
          onChange={handleChange}
          placeholder='Enter your full name'
          required
        />
        <label className='form-label text-sm fw-semibold mt-16'>Email *</label>
        <input
          className='form-control'
          type='email'
          name='email'
          value={form.email}
          onChange={handleChange}
          placeholder='you@email.com'
          required
        />
        <label className='form-label text-sm fw-semibold mt-16'>Phone *</label>
        <input
          className='form-control'
          name='phone'
          value={form.phone}
          onChange={handleChange}
          placeholder='WhatsApp number'
          required
        />
        <button
          type='submit'
          className='btn btn-main w-100 rounded-pill mt-20'
          disabled={status.submitting}
        >
          {status.submitting ? "Registering..." : "Register for free"}
        </button>
        {status.success ? (
          <p className='text-success-600 text-sm mt-12 mb-0'>
            You’re in! Our team will reach out with joining details.
          </p>
        ) : null}
        {status.error ? (
          <p className='text-danger text-sm mt-12 mb-0'>{status.error}</p>
        ) : null}
      </form>
      <p className='event-register-card__foot text-sm text-neutral-500'>
        200+ students have already registered!
      </p>
    </aside>
  );
};

const EventDetailsOne = ({ event, loading, error }) => {
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    setActiveTab("overview");
  }, [event?.id]);

  const renderTab = () => {
    if (activeTab === "instructor") return <InstructorTab event={event} />;
    if (activeTab === "help") return <HelpTab />;
    return <OverviewTab event={event} />;
  };

  return (
    <section className='event-details py-60 bg-white'>
      <div className='container container--lg'>
        {loading ? (
          <div className='event-details__skeleton animate-pulse'>
            <div className='skeleton-thumb rounded-24 mb-32' />
            <div className='skeleton-line w-75 mb-3' />
            <div className='skeleton-line w-50 mb-2' />
            <div className='skeleton-line w-100 mb-2' />
            <div className='skeleton-line w-60' />
          </div>
        ) : error ? (
          <div className='alert alert-danger rounded-16'>{error}</div>
        ) : !event ? (
          <div className='empty-state text-center py-80'>
            <div className='empty-state__illustration mb-24'>
              <i className='ph ph-calendar-x text-3xl text-main-600' />
            </div>
            <h4 className='mb-8'>Event unavailable</h4>
            <p className='text-neutral-600 mb-0'>
              The link might be broken or the event has been archived.
            </p>
          </div>
        ) : (
          <div className='row gy-5'>
            <div className='col-lg-8'>
              <div className='event-hero-card'>
                <div>
                  <span className='badge badge--category'>{event?.category || "Masterclass"}</span>
                  {event?.badge ? <span className='badge badge--accent ms-2'>{event.badge}</span> : null}
                </div>
                <h1 className='display-5 mb-8 mt-16'>{event?.title}</h1>
                <p className='text-neutral-600 mb-24'>{event?.summary || event?.subtitle}</p>
                <EventTabs active={activeTab} onChange={setActiveTab} />
                <div className='event-tab-content'>{renderTab()}</div>
              </div>
            </div>
            <div className='col-lg-4'>
              <RegistrationCard event={event} />
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default EventDetailsOne;
