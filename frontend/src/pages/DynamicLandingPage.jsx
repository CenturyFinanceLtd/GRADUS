import React, { useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import apiClient from '../services/apiClient';
import '../styles/masterclass-akhil.css'; // Reusing existing styles

const DynamicLandingPage = () => {
    const { slug } = useParams();
    const [pageData, setPageData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        const fetchPageData = async () => {
            try {
                // In production, this would be the actual API endpoint
                const data = await apiClient.get(`/landing-pages/${slug}`);
                setPageData(data);
                document.title = `${data.hero.titlePrefix} ${data.hero.highlight} | Gradus`;
            } catch (err) {
                console.error("Failed to load landing page", err);
                setError(true);
            } finally {
                setLoading(false);
            }
        };

        fetchPageData();
    }, [slug]);

    if (loading) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;
    if (error || !pageData) return <Navigate to="/404" replace />;

    const { hero, middleSection, mentor, certificate, faq, stickyFooter } = pageData;

    return (
        <div className="masterclass-akhil-page">
            <main className="hero-section">
                {/* Header Title */}
                <div className="hero-header">
                    <h1 className="hero-title">
                        {hero.titlePrefix} <span className="text-highlight">{hero.highlight}</span> {hero.mentorName && <span>with <span className="text-orange">{hero.mentorName}</span></span>}
                    </h1>
                    <p className="hero-subtitle">{hero.subtitle}</p>
                </div>

                <div className="hero-content-grid">
                    {/* Left Column: Info & CTA */}
                    <div className="left-column">
                        <div className="info-cards-grid">
                            <div className="info-card">
                                <div className="info-icon-wrapper">📅</div>
                                <div className="info-text">
                                    <h4>DATE</h4>
                                    <p>{hero.date}</p>
                                </div>
                            </div>
                            <div className="info-card">
                                <div className="info-icon-wrapper">⏰</div>
                                <div className="info-text">
                                    <h4>TIME</h4>
                                    <p>{hero.time}</p>
                                </div>
                            </div>
                            <div className="info-card">
                                <div className="info-icon-wrapper">🗣️</div>
                                <div className="info-text">
                                    <h4>Language</h4>
                                    <p>{hero.language}</p>
                                </div>
                            </div>
                            <div className="info-card">
                                <div className="info-icon-wrapper">⏳</div>
                                <div className="info-text">
                                    <h4>Duration</h4>
                                    <p>{hero.duration}</p>
                                </div>
                            </div>
                        </div>

                        {/* CTA & Social Proof */}
                        <div className="cta-container">
                            <a href="#register" className="cta-button">Register Now For Free</a>
                            <div className="social-proof">
                                <div className="user-avatars">
                                    <img src="https://ui-avatars.com/api/?name=User+One&background=random" alt="User" />
                                    <img src="https://ui-avatars.com/api/?name=User+Two&background=random" alt="User" />
                                    <img src="https://ui-avatars.com/api/?name=User+Three&background=random" alt="User" />
                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#2168f6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', marginLeft: '-10px', border: '2px solid white' }}>
                                        {hero.socialProofCount}
                                    </div>
                                </div>
                                <div className="rating-info">
                                    <div className="stars">⭐⭐⭐⭐⭐</div>
                                    <span className="rating-text">{hero.ratingText}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Hero Image Card */}
                    <div className="right-column">
                        <div className="hero-image-container">
                            <img src={hero.image} alt={hero.highlight} className="hero-main-image" />
                        </div>
                    </div>
                </div>

                {/* Bottom Info Bar */}
                {hero.bottomInfo && (
                    <div className="bottom-info-bar">
                        <p>{hero.bottomInfo}</p>
                    </div>
                )}
            </main>

            {/* Middle Dark Section */}
            <section className="dark-section">
                <div className="section-container">
                    {/* Part 1: Designed For You */}
                    <h2 className="designed-for-you-title">
                        Who is <span className="text-highlight">{middleSection.programName}</span> for?
                    </h2>

                    <div className="designed-items-row">
                        {(middleSection.targetAudience || []).map((item, idx) => (
                            <div key={idx} className="designed-item">
                                <div className="diamond-icon"><span className="icon-inner">{item.icon}</span></div>
                                <span>{item.text}</span>
                            </div>
                        ))}
                    </div>

                    <a href="#register" className="cta-button" style={{ display: 'inline-block', width: 'auto', minWidth: '300px' }}>Register Now For Free</a>

                    {/* Part 2: What Will You Learn */}
                    <h2 className="learning-section-title">
                        What Will You learn in <span className="text-highlight">{middleSection.programName}</span>?
                    </h2>

                    <div className="learning-cards-grid">
                        {(middleSection.learningCards || []).map((card, idx) => (
                            <div key={idx} className="learning-card">
                                <div className="card-number">{card.number || idx + 1}</div>
                                <div className="card-text">
                                    <span className="text-highlight">{card.text}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Centered Card */}
                    {middleSection.centeredCard && (
                        <div className="learning-card learning-card-centered">
                            <div className="card-text">{middleSection.centeredCard}</div>
                        </div>
                    )}

                    <a href="#register" className="cta-button" style={{ display: 'inline-block', width: 'auto', minWidth: '300px' }}>Register Now For Free</a>

                    {/* --- Meet Your Mentor Section --- */}
                    <div className="mentor-grid">
                        <div className="mentor-image-col">
                            <img src={mentor.image} alt={mentor.name} className="mentor-image" style={{ maxHeight: '500px' }} />
                        </div>
                        <div className="mentor-content-col">
                            <h2 className="mentor-title">
                                Meet Your <span className="text-highlight">Mentor</span>
                            </h2>
                            <div className="mentor-info-card">
                                <ul className="mentor-points-list">
                                    {(mentor.points || []).map((point, idx) => (
                                        <li key={idx} className="mentor-point">
                                            <span className="mentor-bullet"></span>
                                            <span>{point}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <a href="#register" className="cta-button" style={{ marginTop: '0' }}>Register Now For Free</a>
                        </div>
                    </div>
                </div>
            </section>

            {/* Certificate Section */}
            <section className="certificate-section">
                <div className="section-container">
                    <h2 className="certificate-headline">{certificate.headline}</h2>
                    <div className="certificate-image-wrapper">
                        <img src={certificate.image} alt="Certificate" className="certificate-image" />
                    </div>
                    <a href="#register" className="cta-button" style={{ display: 'inline-block', width: 'auto', minWidth: '300px' }}>Register Now For Free</a>
                </div>
            </section>

            {/* FAQ Section */}
            <section className="faq-section">
                <div className="section-container faq-container">
                    <h2 className="faq-headline">Frequently Asked <span className="text-highlight-underline">Questions</span></h2>
                    <div className="faq-list">
                        {(faq || []).map((item, idx) => (
                            <FAQItem key={idx} question={item.question} answer={item.answer} />
                        ))}
                    </div>
                </div>
            </section>

            <StickyFooter original={stickyFooter.priceOriginal} current={stickyFooter.priceCurrent} />
        </div>
    );
};

const FAQItem = ({ question, answer }) => {
    const [isOpen, setIsOpen] = React.useState(false);
    return (
        <div className="faq-item">
            <div className="faq-question" onClick={() => setIsOpen(!isOpen)}>
                <span>Q: {question}</span>
                <span className="faq-icon">{isOpen ? "−" : "+"}</span>
            </div>
            <div className={`faq-answer ${isOpen ? 'open' : ''}`}>
                {answer}
            </div>
        </div>
    );
};

const StickyFooter = ({ original, current }) => {
    const [timeLeft, setTimeLeft] = useState(15 * 60);
    useEffect(() => {
        const timer = setInterval(() => setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0)), 1000);
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
                        {current} <span className="footer-old-price">₹{original}</span>
                    </div>
                    <div className="footer-timer-row">Offer Expires in <strong>{formatTime(timeLeft)}</strong></div>
                </div>
                <a href="#register" className="cta-button" style={{ margin: 0, width: 'auto', padding: '0.8rem 2rem' }}>Register Now For Free</a>
            </div>
        </div>
    );
};

export default DynamicLandingPage;
