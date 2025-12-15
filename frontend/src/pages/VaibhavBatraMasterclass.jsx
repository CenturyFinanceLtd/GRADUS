import React, { useState, useEffect } from 'react';
import HeaderOne from "../components/HeaderOne";
import FooterOne from "../components/FooterOne";
import Preloader from "../helper/Preloader";
import './VaibhavBatraMasterclass.css';

const VaibhavBatraMasterclass = () => {
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        // Inject Tailwind CDN
        const script = document.createElement('script');
        script.src = "https://cdn.tailwindcss.com";
        script.async = true;

        script.onload = () => {
            // Configure Tailwind
            if (window.tailwind) {
                window.tailwind.config = {
                    theme: {
                        extend: {
                            fontFamily: {
                                sans: ['Inter', 'sans-serif'],
                            },
                            colors: {
                                brand: {
                                    blue: '#0056D2',
                                    orange: '#F06A37',
                                    gray: '#F5F5F5',
                                    text: '#1C1C1C',
                                    muted: '#5A5A5A',
                                    border: '#E0E0E0'
                                }
                            }
                        }
                    }
                }
            }
        };

        document.head.appendChild(script);

        // Inject FontAwesome
        const faLink = document.createElement('link');
        faLink.rel = 'stylesheet';
        faLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
        document.head.appendChild(faLink);

        // Inject Google Fonts
        const fontLink = document.createElement('link');
        fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
        fontLink.rel = 'stylesheet';
        document.head.appendChild(fontLink);

        return () => {
            // Cleanup logic if needed
        }
    }, []);

    const switchTab = (tabId) => {
        setActiveTab(tabId);
    };

    return (
        <>
            {/* Preloader */}
            <Preloader />

            {/* Standard Header */}
            <HeaderOne />

            {/* Main Layout */}
            <div className="bg-white text-brand-text font-sans antialiased">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

                        {/* LEFT COLUMN: Content */}
                        <div className="lg:col-span-8">

                            {/* Header Tags */}
                            <div className="flex gap-3 mb-4">
                                <span className="bg-blue-100 text-blue-600 px-4 py-1 rounded-full text-xs font-bold tracking-wide">General</span>
                                <span className="bg-orange-500 text-white px-4 py-1 rounded-full text-xs font-bold tracking-wide">Webinar</span>
                            </div>

                            {/* Main Headline */}
                            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight mb-4">
                                Future-Ready Careers: Explore Jobs & Courses that matter
                            </h1>

                            {/* Sub-description */}
                            <p className="text-brand-muted text-base leading-relaxed mb-8">
                                Companies are hiring ... but only skilled candidates. If you want a high-growth career, this is for you. Discover in-demand careers and upskilling opportunities in this live webinar. Learn about emerging job roles, industry-relevant courses, and how to prepare for the future of work. Get insights from career experts and have your questions answered in real-time.
                            </p>

                            {/* Navigation Tabs */}
                            <div className="border-b border-brand-border mb-8 flex gap-8 text-sm font-semibold overflow-x-auto no-scrollbar">
                                <button onClick={() => switchTab('overview')} className={`${activeTab === 'overview' ? 'tab-active' : 'tab-inactive'} pb-3 whitespace-nowrap transition-colors flex items-center`}>
                                    <i className="fa-solid fa-grid-2 mr-2"></i> Overview
                                </button>
                                <button onClick={() => switchTab('instructor')} className={`${activeTab === 'instructor' ? 'tab-active' : 'tab-inactive'} pb-3 whitespace-nowrap transition-colors flex items-center`}>
                                    <i className="fa-solid fa-user mr-2"></i> Instructor
                                </button>
                                <button onClick={() => switchTab('help')} className={`${activeTab === 'help' ? 'tab-active' : 'tab-inactive'} pb-3 whitespace-nowrap transition-colors flex items-center`}>
                                    <i className="fa-solid fa-headset mr-2"></i> Help
                                </button>
                            </div>

                            {/* Dynamic Content Sections */}

                            {/* SECTION: OVERVIEW */}
                            {activeTab === 'overview' && (
                                <div className="space-y-8 animate-fadeIn">
                                    {/* Event Type Tag */}
                                    <div className="mb-6">
                                        <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded text-xs font-bold uppercase tracking-wider">EVENT TYPE <span className="text-slate-900 ml-1">Webinar</span></span>
                                    </div>

                                    <div>
                                        <h2 className="text-2xl font-bold text-slate-900 mb-4">What you will learn in this event</h2>
                                        <p className="text-slate-600 mb-4">Career opportunities High-demand skills for 2025 How to grow your career fast Placement roadmap</p>
                                    </div>

                                    <div>
                                        <h2 className="text-xl font-bold text-slate-900 mb-4">Agenda</h2>
                                        <ul className="space-y-3 text-slate-700 text-sm font-medium">
                                            <li>Welcome & Introduction</li>
                                            <li>Overview of In-Demand Career Paths</li>
                                            <li>Exploring AI, Data Science & Cloud Computing Roles</li>
                                            <li>Upskilling Strategies & Course Recommendations</li>
                                            <li>Career Transition Success Stories</li>
                                            <li>Live Q&A with Career Experts</li>
                                            <li>Closing Remarks & Next Steps</li>
                                        </ul>
                                    </div>
                                </div>
                            )}

                            {/* SECTION: INSTRUCTOR */}
                            {activeTab === 'instructor' && (
                                <div className="space-y-6 animate-fadeIn">
                                    <h2 className="text-2xl font-bold text-slate-900">Vaibhav Batra</h2>
                                    <p className="text-slate-500 font-medium">Career Counselor & EdTech Specialist</p>

                                    <p className="text-slate-600 leading-relaxed">
                                        Hello, I'm Vaibhav Batra. With six years of experience in trading and training, I help you master practical financial market skills. At Gradus, I focus on bridging academics with industry, preparing you to seize real, market-ready opportunities.
                                    </p>
                                </div>
                            )}

                            {/* SECTION: HELP */}
                            {activeTab === 'help' && (
                                <div className="space-y-6 animate-fadeIn">
                                    <h2 className="text-xl font-bold text-slate-900">Need assistance?</h2>
                                    <p className="text-slate-600">Reach our learner success team if you have questions about enrolment, prerequisites, or need a custom corporate cohort.</p>

                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-slate-700">Email:</span>
                                            <a href="mailto:business@gradusindia.in" className="text-blue-600 hover:underline">business@gradusindia.in</a>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-slate-700">Phone / WhatsApp:</span>
                                            <a href="tel:+919999999999" className="text-blue-600 hover:underline">+91 99999 99999</a>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-slate-700">Support Center:</span>
                                            <a href="#" className="text-blue-600 hover:underline">Open a ticket</a>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>


                        {/* RIGHT COLUMN: Sticky Card */}
                        <div className="lg:col-span-4 relative">
                            <div className="sticky top-24 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">

                                {/* Banner Image from Cloudinary */}
                                <div className="w-full">
                                    <img
                                        src="https://res.cloudinary.com/dnp3j8xb1/image/upload/v1763444134/courses/e8txrslkpt57nsvt05sj.png"
                                        alt="Webinar Banner"
                                        className="w-full h-auto object-cover"
                                    />
                                </div>

                                {/* Event Ended Alert */}
                                <div className="bg-red-50 border-b border-red-100 p-3 flex items-center gap-2 text-red-600 text-sm font-semibold justify-center">
                                    <i className="fa-regular fa-clock"></i> This event has ended
                                </div>

                                {/* Form */}
                                <div className="p-6">
                                    <form onSubmit={(e) => { e.preventDefault(); alert('Registration Submitted!'); }} className="space-y-4">

                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Name <span className="text-red-500">*</span></label>
                                            <input type="text" placeholder="Enter your full name" className="w-full bg-gray-100 border-none rounded-lg px-4 py-3 text-sm text-slate-700 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none" required />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Email <span className="text-red-500">*</span></label>
                                            <input type="email" placeholder="you@email.com" className="w-full bg-gray-100 border-none rounded-lg px-4 py-3 text-sm text-slate-700 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none" required />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Phone <span className="text-red-500">*</span></label>
                                            <input type="tel" placeholder="WhatsApp number" className="w-full bg-gray-100 border-none rounded-lg px-4 py-3 text-sm text-slate-700 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none" required />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">State <span className="text-red-500">*</span></label>
                                            <div className="relative">
                                                <select className="w-full bg-gray-100 border-none rounded-lg px-4 py-3 text-sm text-slate-500 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none appearance-none cursor-pointer">
                                                    <option>Select state</option>
                                                    <option>Delhi</option>
                                                    <option>Maharashtra</option>
                                                    <option>Karnataka</option>
                                                    <option>Other</option>
                                                </select>
                                                <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-500">
                                                    <i className="fa-solid fa-chevron-down text-xs"></i>
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Qualification <span className="text-red-500">*</span></label>
                                            <div className="relative">
                                                <select className="w-full bg-gray-100 border-none rounded-lg px-4 py-3 text-sm text-slate-500 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none appearance-none cursor-pointer">
                                                    <option>Select qualification</option>
                                                    <option>High School</option>
                                                    <option>Undergraduate</option>
                                                    <option>Graduate</option>
                                                    <option>Post Graduate</option>
                                                    <option>Working Professional</option>
                                                </select>
                                                <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-500">
                                                    <i className="fa-solid fa-chevron-down text-xs"></i>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-3 mt-4">
                                            <input type="checkbox" id="auth" className="mt-1 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                                            <label htmlFor="auth" className="text-xs text-slate-400 leading-snug">
                                                I authorize Gradus Team to reach out to me with updates and notifications via Email, SMS, WhatsApp and RCS.
                                            </label>
                                        </div>

                                        <button type="submit" className="w-full bg-[#8B1E25] text-white font-bold py-3 px-4 rounded-lg hover:bg-[#72181e] transition-colors shadow-sm mt-4 text-sm">
                                            Register now
                                        </button>

                                        <div className="mt-4 text-center">
                                            <p className="text-xs text-slate-500 font-bold">200+ students have already registered!</p>
                                        </div>

                                    </form>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {/* Standard Footer */}
            <FooterOne />
        </>
    );
};

export default VaibhavBatraMasterclass;
