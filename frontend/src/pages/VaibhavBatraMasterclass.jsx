import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import HeaderOne from "../components/HeaderOne";
import FooterOne from "../components/FooterOne";
import Animation from "../helper/Animation";
import Preloader from "../helper/Preloader";
import { submitEventRegistration } from "../services/contactService";
import "../styles/events-card.css";

const STATE_OPTIONS = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
    "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
    "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
    "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan",
    "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
    "Uttarakhand", "West Bengal"
];

const QUALIFICATION_OPTIONS = ["UG Pursuing", "UG Completed", "PG Pursuing", "PG Completed", "Working Professional"];

const TABS = [
    { id: "overview", icon: "ph-squares-four", label: "Overview" },
    { id: "instructor", icon: "ph-user-circle", label: "Instructor" },
    { id: "help", icon: "ph-headset", label: "Help" },
];

const AUDIENCE_TYPES = [
    { icon: "👨‍💼", label: "Employee" },
    { icon: "📈", label: "Trader" },
    { icon: "🏢", label: "Business Owner" },
    { icon: "💻", label: "Freelancer" },
];

const KEY_FEATURES = [
    {
        icon: "🎥",
        title: "Live Session",
        description: "We provide live classes to our students. You can attend the classes from anywhere in the world."
    },
    {
        icon: "🎮",
        title: "Gamified Approach",
        description: "We save all the session recordings in case you miss a class or want to rewatch a class."
    },
    {
        icon: "🏆",
        title: "Win Prizes upto ₹10,000",
        description: "Things are better when you do them with others. We have a communities of 1000+ students who are learning together."
    },
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

const OverviewTab = () => {
    const highlights = [
        "Understanding money basics — how it works, how to save, and how to grow it",
        "Building the right money mindset — break bad habits, build good ones",
        "Simple investing strategies for beginners",
        "Budgeting techniques that actually work for Indian lifestyles",
        "Introduction to mutual funds, stocks & SIPs",
        "Avoiding common financial mistakes that cost you lakhs",
    ];

    return (
        <div className='event-overview'>
            <h2 className='event-section-title'>What you will learn in this master class:</h2>

            {/* Audience Types */}
            <div className='audience-types-grid mb-32'>
                {AUDIENCE_TYPES.map((type, idx) => (
                    <div key={idx} className='audience-type-card'>
                        <span className='audience-type-icon'>{type.icon}</span>
                        <span className='audience-type-label'>{type.label}</span>
                    </div>
                ))}
            </div>

            {/* Key Features */}
            <div className='key-features-grid mb-40'>
                {KEY_FEATURES.map((feature, idx) => (
                    <div key={idx} className='key-feature-card'>
                        <span className='key-feature-icon'>{feature.icon}</span>
                        <h4 className='key-feature-title'>{feature.title}</h4>
                        <p className='key-feature-desc'>{feature.description}</p>
                    </div>
                ))}
            </div>

            {/* Highlights */}
            <ul className='event-highlight-list'>
                {highlights.map((item, index) => (
                    <li key={`highlight-${index}`}>{item}</li>
                ))}
            </ul>
        </div>
    );
};

const InstructorTab = () => {
    const instructor = {
        name: "Vaibhav Batra",
        title: "Financial Educator & Wealth Coach",
        bio: `Hello, my name is Vaibhav Batra. With over 8 years of experience in financial education and wealth management, I've helped thousands of students and working professionals understand money, investing, and building wealth the practical way.

My mission is simple: to teach financial literacy the way schools never did — in plain language, with real-life examples from India. Whether you're a student just starting out or a professional looking to grow your savings, this masterclass will give you the foundation you need to make smarter money decisions.

At Gradus, we bridge the gap between textbook knowledge and real-world financial skills.`,
        photoUrl: null, // Add photo URL when available
    };

    return (
        <div className='event-overview'>
            <div className='event-instructor-layout event-instructor-layout--no-photo'>
                <div className='event-instructor__details'>
                    <h3 className='event-instructor__name'>{instructor.name}</h3>
                    <p className='text-neutral-500 mb-12'>{instructor.title}</p>
                    <p className='event-instructor__bio text-neutral-600' style={{ whiteSpace: 'pre-line' }}>
                        {instructor.bio}
                    </p>
                </div>
            </div>
        </div>
    );
};

const HelpTab = () => (
    <div className='event-overview'>
        <h2 className='event-section-title'>Need assistance?</h2>
        <p className='text-neutral-600 mb-16'>
            Reach our learner success team if you have questions about enrollment, prerequisites, or need a
            custom corporate cohort.
        </p>
        <ul className='event-highlight-list'>
            <li>Email: <a href='mailto:business@gradusindia.in'>business@gradusindia.in</a></li>
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

const RegistrationCard = ({ eventData }) => {
    const [form, setForm] = useState({
        name: "",
        email: "",
        phone: "",
        state: "",
        qualification: "",
        consent: false,
    });
    const [status, setStatus] = useState({ submitting: false, success: false, error: null });
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    const { dateLabel, timeLabel, isPast } = useMemo(() => {
        const startIso = eventData?.schedule?.start;
        const now = Date.now();
        const startMs = startIso ? new Date(startIso).getTime() : null;
        return {
            dateLabel: formatDate(startIso),
            timeLabel: formatTime(startIso, eventData?.schedule?.timezone),
            isPast: startMs ? now > startMs : false,
        };
    }, [eventData?.schedule?.start, eventData?.schedule?.timezone]);

    const isFormComplete = () =>
        form.name && form.email && form.phone && form.consent;

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    };

    const resetForm = () => {
        setForm({
            name: "",
            email: "",
            phone: "",
            state: "",
            qualification: "",
            consent: false,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isFormComplete()) {
            setStatus((prev) => ({ ...prev, error: "Please complete all required fields." }));
            return;
        }

        try {
            setStatus({ submitting: true, success: false, error: null });
            setShowSuccessModal(false);
            await submitEventRegistration({
                name: form.name,
                email: form.email,
                phone: form.phone,
                state: form.state,
                course: eventData?.title || "Masterclass",
                message: `Interested in ${eventData?.title || "masterclass"}`,
                qualification: form.qualification,
                consent: form.consent,
                eventDetails: {
                    slug: "financial-literacy-masterclass",
                    title: eventData?.title || "",
                    schedule: eventData?.schedule || {},
                    hostName: "Vaibhav Batra",
                },
            });
            setStatus({ submitting: false, success: true, error: null });
            resetForm();
            setShowSuccessModal(true);
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
                <div className='masterclass-hero-banner'>
                    <span className='live-badge'>JOIN 🔴 LIVE</span>
                    <h3 className='masterclass-hero-title'>The Ultimate<br />Financial Literacy</h3>
                    <p className='masterclass-hero-subtitle'>with Vaibhav Batra</p>
                </div>
            </div>
            <div className={`event-register-card__slot ${isPast ? "bg-danger-50 text-danger-600" : ""}`}>
                <i className='ph ph-info' />
                <span>
                    {isPast ? "This event has ended" : `Upcoming slot is ${dateLabel} at ${timeLabel}`}
                </span>
            </div>
            <form className='event-register-card__form' id='event-register-form' onSubmit={handleSubmit}>
                <fieldset disabled={isPast} className='border-0 p-0 m-0'>
                    <label className='form-label text-sm fw-semibold'>NAME *</label>
                    <input
                        className='form-control'
                        name='name'
                        value={form.name}
                        onChange={handleChange}
                        placeholder='Divyansh Vaish'
                        required
                    />
                    <label className='form-label text-sm fw-semibold mt-16'>EMAIL *</label>
                    <input
                        className='form-control'
                        type='email'
                        name='email'
                        value={form.email}
                        onChange={handleChange}
                        placeholder='divyanshvaish13@gmail.com'
                        required
                    />
                    <label className='form-label text-sm fw-semibold mt-16'>PHONE NUMBER (ENTER WHATSAPP NUMBER) *</label>
                    <input
                        className='form-control'
                        name='phone'
                        value={form.phone}
                        onChange={handleChange}
                        placeholder='9876543210'
                        required
                    />
                    <div className='form-check event-register-card__consent mt-16'>
                        <input
                            className='form-check-input'
                            type='checkbox'
                            id='event-consent'
                            name='consent'
                            checked={form.consent}
                            onChange={handleChange}
                            required
                        />
                        <label className='form-check-label text-sm text-neutral-700' htmlFor='event-consent'>
                            I authorize The Future University to reach out to me with updates and notifications via
                            Email, SMS, WhatsApp and RCS.
                        </label>
                    </div>
                    {isPast ? (
                        <button type='button' className='btn btn-outline-secondary w-100 rounded-pill mt-20' disabled>
                            Registration Closed
                        </button>
                    ) : (
                        <button
                            type='submit'
                            className='btn btn-main w-100 rounded-pill mt-20'
                            disabled={status.submitting}
                        >
                            {status.submitting ? "Registering..." : "Register For Masterclass For Free"}
                        </button>
                    )}
                    {status.success ? (
                        <p className='text-success-600 text-sm mt-12 mb-0'>
                            You're in! Our team will reach out with joining details.
                        </p>
                    ) : null}
                    {status.error ? (
                        <p className='text-danger text-sm mt-12 mb-0'>{status.error}</p>
                    ) : null}
                </fieldset>
            </form>
            <p className='event-register-card__foot text-sm text-success-600 fw-semibold'>
                200+ students have already registered!
            </p>
            <p className='text-xs text-neutral-500 px-20 pb-16'>
                Disclaimer: This workshop is NOT a get rich quick scheme. It teaches you the fundamentals of
                trading in stock market & gives you the knowledge to make better financial decisions. The
                reviews given are for that specific individual who made the efforts to learn & implement our
                teachings, we do not guarantee any results.
            </p>
            {showSuccessModal ? (
                <div className='event-register-modal' role='dialog' aria-modal='true' aria-labelledby='event-register-success-title'>
                    <div className='event-register-modal__content'>
                        <div className='event-register-modal__icon' aria-hidden='true'>
                            ✓
                        </div>
                        <h4 className='event-register-modal__title' id='event-register-success-title'>
                            Registration confirmed
                        </h4>
                        <p className='event-register-modal__text'>
                            You're in! Our team will reach out with joining details shortly.
                        </p>
                        <button type='button' className='btn btn-main rounded-pill w-100 mt-2' onClick={() => setShowSuccessModal(false)}>
                            Close
                        </button>
                    </div>
                </div>
            ) : null}
        </aside>
    );
};

const VaibhavBatraMasterclass = () => {
    const [activeTab, setActiveTab] = useState("overview");

    // Static event data for Vaibhav Batra masterclass
    const eventData = {
        title: "Masterclass on Forex Trading with Vaibhav Batra",
        subtitle: "India's most practical financial literacy program for students & working professionals",
        description: "Learn money basics, investing, budgeting & wealth mindset the way schools never taught — simple, practical, and India‑focused.",
        schedule: {
            start: "2024-12-16T18:00:00+05:30", // Update this date as needed
            timezone: "IST",
        },
        host: {
            name: "Vaibhav Batra",
            title: "Financial Educator & Wealth Coach",
        },
        heroImage: {
            url: "/assets/images/masterclass/vaibhav-batra-hero.jpg",
            alt: "Vaibhav Batra Masterclass",
        },
    };

    const renderTab = () => {
        if (activeTab === "instructor") return <InstructorTab />;
        if (activeTab === "help") return <HelpTab />;
        return <OverviewTab />;
    };

    return (
        <>
            <Preloader />
            <Animation />
            <HeaderOne />
            <section className='event-details py-60 bg-white'>
                <div className='container container--lg'>
                    <div className='row gy-5'>
                        <div className='col-lg-8'>
                            <div className='event-hero-card'>
                                <h1 className='display-5 fw-bold mb-16'>{eventData.title}</h1>
                                <p className='text-neutral-600 mb-24 fs-5'>
                                    {eventData.subtitle}
                                    <br />
                                    <span className='text-neutral-500'>{eventData.description}</span>
                                </p>
                                <EventTabs active={activeTab} onChange={setActiveTab} />
                                <div className='event-tab-content'>{renderTab()}</div>
                            </div>
                        </div>
                        <div className='col-lg-4'>
                            <RegistrationCard eventData={eventData} />
                        </div>
                    </div>
                </div>
            </section>
            <FooterOne />
        </>
    );
};

export default VaibhavBatraMasterclass;
