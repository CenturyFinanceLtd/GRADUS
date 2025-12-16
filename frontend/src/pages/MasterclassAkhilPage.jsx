import React, { useEffect } from 'react';
import '../styles/masterclass-akhil.css';

// Ideally these icons would come from a library like react-icons or lucide-react
// Using simple SVG placeholders or emoji if icons aren't available to keep it self-contained for now without deps


const MasterclassAkhilPage = () => {

    useEffect(() => {
        document.title = "Masterclass on Tech Careers | Gradus";
    }, []);

    return (
        <div className="masterclass-akhil-page">


            <main className="hero-section">

                {/* Header Title */}
                <div className="hero-header">
                    <h1 className="hero-title">
                        Masterclass on <span className="text-highlight">Modern Technology</span> with <span className="text-orange">Akhil</span>
                    </h1>
                    <p className="hero-subtitle">
                        India’s most practical coding & tech career program for students & working professionals
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
                                    <p>18 December 2025</p>
                                </div>
                            </div>

                            {/* Time Card */}
                            <div className="info-card">
                                <div className="info-icon-wrapper">
                                    ⏰
                                </div>
                                <div className="info-text">
                                    <h4>TIME</h4>
                                    <p>6:00 PM</p>
                                </div>
                            </div>

                            {/* Language Card */}
                            <div className="info-card">
                                <div className="info-icon-wrapper">
                                    🗣️
                                </div>
                                <div className="info-text">
                                    <h4>Language</h4>
                                    <p>Hindi / English</p>
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
                                Register Now For Free
                            </a>

                            <div className="social-proof">
                                <div className="user-avatars">
                                    {/* Placeholders for user avatars */}
                                    <img src="https://ui-avatars.com/api/?name=Dev+One&background=random" alt="User" />
                                    <img src="https://ui-avatars.com/api/?name=Dev+Two&background=random" alt="User" />
                                    <img src="https://ui-avatars.com/api/?name=Dev+Three&background=random" alt="User" />
                                    <div style={{
                                        width: '32px', height: '32px', borderRadius: '50%', background: '#2168f6', color: 'white',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', marginLeft: '-10px', border: '2px solid white'
                                    }}>
                                        12K+
                                    </div>
                                </div>
                                <div className="rating-info">
                                    <div className="stars">
                                        ⭐⭐⭐⭐⭐
                                    </div>
                                    <span className="rating-text">5k+ reviews (4.9 of 5)</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Hero Image Card */}
                    <div className="right-column">
                        <div className="hero-image-container">
                            {/* Ideally replace with Akhil's image */}
                            <img
                                src="/assets/masterclass-akhil.jpg" /* Placeholder until Akhil's image is provided */
                                alt="Mastering Tech - Akhil"
                                className="hero-main-image"
                            />
                        </div>
                    </div>

                </div>

                {/* Bottom Info Bar */}
                <div className="bottom-info-bar">
                    <p>
                        Learn from <strong>Akhil's</strong> expertise in software development, having mentored over 5,000+ students and built scalable <strong>Tech Products</strong>.
                    </p>
                    <p>
                        Master coding basics, system design, AI tools & career growth the way colleges never taught — practical, hands-on, and industry-ready.
                    </p>
                </div>
            </main>

            {/* Middle Dark Section */}
            <section className="dark-section">
                <div className="section-container">

                    {/* Part 1: Designed For You */}
                    <h2 className="designed-for-you-title">
                        Who is <span className="text-highlight">Gradus TECH</span> for?
                    </h2>

                    <div className="designed-items-row">
                        <div className="designed-item">
                            <div className="diamond-icon"><span className="icon-inner">💻</span></div>
                            <span>College students aiming for top tier <strong>product companies</strong></span>
                        </div>
                        <div className="designed-item">
                            <div className="diamond-icon"><span className="icon-inner">🚀</span></div>
                            <span>Freshers looking to switch from <strong>service to product based</strong></span>
                        </div>
                        <div className="designed-item">
                            <div className="diamond-icon"><span className="icon-inner">💼</span></div>
                            <span>Working professionals wanting to <strong>upskill in AI & Full Stack</strong></span>
                        </div>
                        <div className="designed-item">
                            <div className="diamond-icon"><span className="icon-inner">🧠</span></div>
                            <span>Anyone confused about <strong>which tech stack to choose</strong></span>
                        </div>
                    </div>

                    <a href="#register" className="cta-button" style={{ display: 'inline-block', width: 'auto', minWidth: '300px' }}>
                        Register Now For Free
                    </a>


                    {/* Part 2: What Will You Learn */}
                    <h2 className="learning-section-title">
                        What Will You learn in <span className="text-highlight">Gradus TECH</span>?
                    </h2>

                    <div className="learning-cards-grid">
                        <div className="learning-card">
                            <div className="card-number">1</div>
                            <div className="card-text">
                                <span className="text-highlight">Full Stack Development Roadmap</span>
                            </div>
                        </div>
                        <div className="learning-card">
                            <div className="card-number">2</div>
                            <div className="card-text">
                                <span className="text-highlight">System Design Basics</span>
                            </div>
                        </div>
                        <div className="learning-card">
                            <div className="card-number">3</div>
                            <div className="card-text">
                                <span className="text-highlight"> Mastering DSA (Data Structures)</span>
                            </div>
                        </div>
                        <div className="learning-card">
                            <div className="card-number">4</div>
                            <div className="card-text">
                                <span className="text-highlight">AI Tools for Developers</span>
                            </div>
                        </div>
                    </div>

                    {/* Centered 5th Card */}
                    <div className="learning-card learning-card-centered">
                        <div className="card-text">
                            Acquire crucial skills in <span className="text-highlight">Building Scalable Web Applications</span> to future-proof your career.
                        </div>
                    </div>

                    <a href="#register" className="cta-button" style={{ display: 'inline-block', width: 'auto', minWidth: '300px' }}>
                        Register Now For Free
                    </a>


                    {/* --- Meet Your Mentor Section --- */}
                    <div className="mentor-grid">

                        {/* Left Column: Image (Cutout typically) */}
                        <div className="mentor-image-col">
                            {/* Using the image provided by user */}
                            <img
                                src="/assets/mentor-image-transparent.png" /* Placeholder until Akhil's image is provided */
                                alt="Akhil - Tech Mentor"
                                className="mentor-image"
                                style={{ maxHeight: '500px' }} // Restrict height to prevent it being huge
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
                                            With over <strong>10+ years in the Tech Industry</strong>, Akhil has architected complex systems for top global companies.
                                        </span>
                                    </li>
                                    <li className="mentor-point">
                                        <span className="mentor-bullet"></span>
                                        <span>
                                            Akhil's <span className="text-highlight">expertise spans primarily</span> Frontend, Backend, Cloud Architecture, and AI integration.
                                        </span>
                                    </li>
                                    <li className="mentor-point">
                                        <span className="mentor-bullet"></span>
                                        <span>
                                            Akhil has mentored <span className="text-highlight">5000+ students</span>, helping them crack interviews at FAANG and top startups.
                                        </span>
                                    </li>
                                    <li className="mentor-point">
                                        <span className="mentor-bullet"></span>
                                        <span>
                                            Akhil blends theoretical CS fundamentals with practical project building, delivering <span className="text-highlight">industry-relevant skills</span>.
                                        </span>
                                    </li>
                                    <li className="mentor-point">
                                        <span className="mentor-bullet"></span>
                                        <span>
                                            Akhil's masterclasses focus on writing clean, scalable code that solves real-world problems.
                                        </span>
                                    </li>
                                </ul>
                            </div>

                            <a href="#register" className="cta-button" style={{ marginTop: '0' }}>
                                Register Now For Free
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
                            src="/assets/certificate-preview.png"
                            alt="Certificate of Participation"
                            className="certificate-image"
                        />
                    </div>

                    <a href="#register" className="cta-button" style={{ display: 'inline-block', width: 'auto', minWidth: '300px' }}>
                        Register Now For Free
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
                            question="Is it a live coding workshop?"
                            answer="Yes! It is a live session where we will discuss concepts and write code together."
                        />
                        <FAQItem
                            question="Is this class for beginners?"
                            answer="Yes! This masterclass is designed to help beginners understand the fundamentals of software development while also providing roadmap tips for experienced devs."
                        />
                        <FAQItem
                            question="Will recording be provided?"
                            answer="Yes, a recording of the session will be provided to all registered participants for revision purposes."
                        />
                        <FAQItem
                            question="Do I need to know programming beforehand?"
                            answer="Basic familiarity is helpful, but we will start with foundational concepts. A curious mindset is the only hard requirement!"
                        />
                        <FAQItem
                            question="Will there be a QnA session?"
                            answer="Absolutely! There will be a dedicated Q&A session at the end of the masterclass to clarify all your career and tech doubts."
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
const StickyFooter = () => {
    // 15 minute countdown timer state
    const [timeLeft, setTimeLeft] = React.useState(15 * 60); // 15 minutes in seconds

    React.useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="sticky-footer">
            <div className="sticky-footer-content">
                <div className="footer-left-info">
                    <div className="footer-price-row">
                        FREE <span className="footer-old-price">₹1999</span>
                    </div>
                    <div className="footer-timer-row">
                        Offer Expires in <strong>{formatTime(timeLeft)}</strong>
                    </div>
                </div>

                <a href="#register" className="cta-button" style={{ margin: 0, width: 'auto', padding: '0.8rem 2rem' }}>
                    Register Now For Free
                </a>
            </div>
        </div>
    );
};

export default MasterclassAkhilPage;
