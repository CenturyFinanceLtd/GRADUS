import React, { useEffect } from 'react';
import '../styles/masterclass-intraday.css';

// Ideally these icons would come from a library like react-icons or lucide-react
// Using simple SVG placeholders or emoji if icons aren't available to keep it self-contained for now without deps


const MasterclassIntradayPage = () => {

    useEffect(() => {
        document.title = "Masterclass on Intraday Market Analysis | Gradus";
    }, []);

    return (
        <div className="masterclass-intraday-page">


            <main className="hero-section">

                {/* Header Title */}
                <div className="hero-header">
                    <h1 className="hero-title">
                        Masterclass on <span className="text-highlight">Intraday Market Analysis</span> with <span className="text-orange">Vaibhav Batra</span>
                    </h1>
                    <p className="hero-subtitle">
                        India’s most practical financial literacy program for students & working professionals
                    </p>
                </div>

                <div className="hero-content-grid">

                    {/* Left Column: Info & CTA */}
                    <div className="left-column">
                        <div className="info-cards-grid">
                            {/* Date Card */}
                            <div className="info-card">
                                <div className="info-icon-wrapper">
                                    📅
                                </div>
                                <div className="info-text">
                                    <h4>DATE</h4>
                                    <p>16 December 2025</p>
                                </div>
                            </div>

                            {/* Time Card */}
                            <div className="info-card">
                                <div className="info-icon-wrapper">
                                    ⏰
                                </div>
                                <div className="info-text">
                                    <h4>TIME</h4>
                                    <p>11:55 AM</p>
                                </div>
                            </div>

                            {/* Language Card */}
                            <div className="info-card">
                                <div className="info-icon-wrapper">
                                    🗣️
                                </div>
                                <div className="info-text">
                                    <h4>Language</h4>
                                    <p>Hindi</p>
                                </div>
                            </div>

                            {/* Duration Card */}
                            <div className="info-card">
                                <div className="info-icon-wrapper">
                                    ⏳
                                </div>
                                <div className="info-text">
                                    <h4>Duration</h4>
                                    <p>2+ Hours</p>
                                </div>
                            </div>
                        </div>

                        {/* CTA & Social Proof */}
                        <div className="cta-container">
                            <a href="#register" className="cta-button">
                                Click to Register
                            </a>

                            <div className="social-proof">
                                <div className="user-avatars">
                                    {/* Placeholders for user avatars */}
                                    <img src="https://ui-avatars.com/api/?name=User+One&background=random" alt="User" />
                                    <img src="https://ui-avatars.com/api/?name=User+Two&background=random" alt="User" />
                                    <img src="https://ui-avatars.com/api/?name=User+Three&background=random" alt="User" />
                                    <div style={{
                                        width: '32px', height: '32px', borderRadius: '50%', background: '#6cbc49', color: 'white',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', marginLeft: '-10px', border: '2px solid white'
                                    }}>
                                        48K+
                                    </div>
                                </div>
                                <div className="rating-info">
                                    <div className="stars">
                                        ⭐⭐⭐⭐⭐
                                    </div>
                                    <span className="rating-text">14k+ reviews (4.9 of 5)</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Hero Image Card */}
                    <div className="right-column">
                        <div className="hero-image-container">
                            <img
                                src="/assets/masterclass-vaibhav.jpg"
                                alt="Mastering Intraday Market Analysis - Jagpreet Singh"
                                className="hero-main-image"
                            />
                        </div>
                    </div>

                </div>

                {/* Bottom Info Bar */}
                <div className="bottom-info-bar">
                    <p>
                        Learn from <strong>Vaibhav Batra's</strong> expertise in market analysis, having taught over 10,000+ students and accumulated <strong>13+ years of experience</strong>.
                    </p>
                    <p>
                        Learn money basics, financial planning, budgeting & wealth mindset the way schools never taught — simple, practical, and India‑focused.
                    </p>
                </div>
            </main>

            {/* Middle Dark Section */}
            <section className="dark-section">
                <div className="section-container">

                    {/* Part 1: Designed For You */}
                    <h2 className="designed-for-you-title">
                        Who is <span className="text-highlight">Gradus FINLIT</span> for?
                    </h2>

                    <div className="designed-items-row">
                        <div className="designed-item">
                            <div className="diamond-icon"><span className="icon-inner">✨</span></div>
                            <span>College students who want money clarity early</span>
                        </div>
                        <div className="designed-item">
                            <div className="diamond-icon"><span className="icon-inner">✨</span></div>
                            <span>Freshers earning their first salary</span>
                        </div>
                        <div className="designed-item">
                            <div className="diamond-icon"><span className="icon-inner">✨</span></div>
                            <span>Working professionals stuck in salary‑to‑salary cycle</span>
                        </div>
                        <div className="designed-item">
                            <div className="diamond-icon"><span className="icon-inner">✨</span></div>
                            <span>Anyone scared of investing or confused about finance</span>
                        </div>
                    </div>

                    <a href="#register" className="cta-button" style={{ display: 'inline-block', width: 'auto', minWidth: '300px' }}>
                        Click to Register
                    </a>


                    {/* Part 2: What Will You Learn */}
                    <h2 className="learning-section-title">
                        What Will You learn in <span className="text-highlight">Gradus FINLIT</span>?
                    </h2>

                    <div className="learning-cards-grid">
                        <div className="learning-card">
                            <div className="card-number">1</div>
                            <div className="card-text">
                                <span className="text-highlight">Financial Foundations</span>
                            </div>
                        </div>
                        <div className="learning-card">
                            <div className="card-number">2</div>
                            <div className="card-text">
                                <span className="text-highlight">Personal Finance</span>
                            </div>
                        </div>
                        <div className="learning-card">
                            <div className="card-number">3</div>
                            <div className="card-text">
                                <span className="text-highlight"> Investing Basics (Beginner-Friendly)</span>
                            </div>
                        </div>
                        <div className="learning-card">
                            <div className="card-number">4</div>
                            <div className="card-text">
                                <span className="text-highlight">Money Mindset</span>
                            </div>
                        </div>
                    </div>


                    <a href="#register" className="cta-button" style={{ display: 'inline-block', width: 'auto', minWidth: '300px' }}>
                        Click to Register
                    </a>


                    {/* --- Meet Your Mentor Section --- */}
                    <div className="mentor-grid">

                        {/* Left Column: Image (Cutout typically) */}
                        <div className="mentor-image-col">
                            {/* Using the image provided by user */}
                            <img
                                src="/assets/mentor-image-transparent.png"
                                alt="Jagpreet Singh Narula"
                                className="mentor-image"
                                style={{}} // Removed maxHeight to allow image to touch bottom
                            />
                        </div>

                        {/* Right Column: Info Card */}
                        <div className="mentor-content-col">
                            <h2 className="mentor-title">
                                Meet Your <span className="text-highlight">Mentor</span>
                            </h2>

                            <div className="mentor-info-card">
                                <ul className="mentor-points-list">
                                    <li className="mentor-point">
                                        <span className="mentor-bullet"></span>
                                        <span>
                                            With an <strong>MBA in Finance and 18 years in the Automobile Industry</strong>, Jagpreet Singh Narula blends sector-specific insight with market expertise.
                                        </span>
                                    </li>
                                    <li className="mentor-point">
                                        <span className="mentor-bullet"></span>
                                        <span>
                                            Jagpreet's <span className="text-highlight">13+ years of successful market analysis span</span> Intraday, Swing, Price Action, and Index Options, showcasing his adaptability across diverse market strategies.
                                        </span>
                                    </li>
                                    <li className="mentor-point">
                                        <span className="mentor-bullet"></span>
                                        <span>
                                            Jagpreet mentored <span className="text-highlight">10000+ students</span>, empowering learners, while his free masterclasses reached <span className="text-highlight">100,000 eager learners</span>, fostering a collaborative learning community.
                                        </span>
                                    </li>
                                    <li className="mentor-point">
                                        <span className="mentor-bullet"></span>
                                        <span>
                                            Jagpreet blends professional acumen with market expertise, delivering <span className="text-highlight">comprehensive strategies</span> for success.
                                        </span>
                                    </li>
                                    <li className="mentor-point">
                                        <span className="mentor-bullet"></span>
                                        <span>
                                            Jagpreet's free masterclasses foster learning and collaboration among traders of all levels.
                                        </span>
                                    </li>
                                </ul>
                            </div>

                            <a href="#register" className="cta-button" style={{ marginTop: '0' }}>
                                Click to Register
                            </a>
                        </div>

                    </div>

                </div>
            </section>

            {/* Certificate Section */}
            <section className="certificate-section">
                <div className="section-container">
                    <h2 className="certificate-headline">
                        Yes! You will be <span className="text-highlight-underline">certified</span> for this Masterclass.
                    </h2>

                    <div className="certificate-image-wrapper">
                        {/* 
                           I'm using the screenshot provided as a preview. 
                           Ideally, we would separate the background text from the certificate image, 
                           but for now, displaying the provided asset as the 'preview'.
                        */}
                        <img
                            src="/assets/certification.jpeg"
                            alt="Certificate of Participation"
                            className="certificate-image"
                        />
                    </div>

                    <a href="#register" className="cta-button" style={{ display: 'inline-block', width: 'auto', minWidth: '300px' }}>
                        Click to Register
                    </a>
                </div>
            </section>

            {/* FAQ Section */}
            <section className="faq-section">
                <div className="section-container faq-container">
                    <h2 className="faq-headline">
                        Frequently Asked <span className="text-highlight-underline">Questions</span>
                    </h2>

                    <div className="faq-list">
                        <FAQItem
                            question="Is it a live or pre-recorded workshop?"
                            answer="It is a live workshop."
                        />
                        <FAQItem
                            question="Is this class for beginners?"
                            answer="Yes! This masterclass is designed to help beginners understand the fundamentals of Intraday markets while also providing advanced strategies for experienced participants."
                        />
                        <FAQItem
                            question="Will recording be provided?"
                            answer="Yes, a recording of the session will be provided to all registered participants for revision purposes."
                        />
                        <FAQItem
                            question="How much capital is required?"
                            answer="You can start with a small capital. The strategies taught focus on risk management to help you grow your capital steadily."
                        />
                        <FAQItem
                            question="Will there be a QnA session in the class?"
                            answer="Absolutely! There will be a dedicated Q&A session at the end of the masterclass to clarify all your doubts."
                        />
                    </div>
                </div>
            </section>
            {/* Sticky Footer */}
            <StickyFooter />
        </div>
    );
};

// Simple internal component for FAQ Item
const FAQItem = ({ question, answer }) => {
    const [isOpen, setIsOpen] = React.useState(false);

    return (
        <div className="faq-item">
            <div className="faq-question" onClick={() => setIsOpen(!isOpen)}>
                <span>Q: {question}</span>
                <span className="faq-icon">
                    {isOpen ? "−" : "+"}
                </span>
            </div>
            <div className={`faq-answer ${isOpen ? 'open' : ''}`}>
                {answer}
            </div>
        </div>
    );
};

// Internal Sticky Footer Component
// Internal Sticky Footer Component
const StickyFooter = () => {
    // Target Date: 16 December 2025 11:55 AM
    const targetDate = new Date("December 16, 2025 11:55:00").getTime();

    const [timeLeft, setTimeLeft] = React.useState(0);

    React.useEffect(() => {
        const calculateTimeLeft = () => {
            const now = new Date().getTime();
            const difference = targetDate - now;
            return difference > 0 ? Math.floor(difference / 1000) : 0;
        };

        setTimeLeft(calculateTimeLeft());

        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const formatTime = (seconds) => {
        if (seconds <= 0) return "00:00:00";

        const d = Math.floor(seconds / (3600 * 24));
        const h = Math.floor((seconds % (3600 * 24)) / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;

        if (d > 0) {
            return `${d}d ${h}h ${m}m ${s}s`;
        }
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="sticky-footer">
            <div className="sticky-footer-content">
                <div className="footer-left-info">
                    <div className="footer-price-row">
                        FREE <span className="footer-old-price">₹999</span>
                    </div>
                    <div className="footer-timer-row">
                        Offer Expires in <strong>{formatTime(timeLeft)}</strong>
                    </div>
                </div>

                <a href="#register" className="cta-button" style={{ margin: 0, width: 'auto', padding: '0.8rem 2rem' }}>
                    Click to Register
                </a>
            </div>
        </div>
    );
};

export default MasterclassIntradayPage;
