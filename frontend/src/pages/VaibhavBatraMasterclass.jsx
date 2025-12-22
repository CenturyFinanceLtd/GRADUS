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
                    {/* Breadcrumbs / Tagline */}
                    <div className="mb-6 text-center md:text-left">
                        <span className="inline-block bg-blue-50 text-brand-blue px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase mb-2 border border-blue-100 shadow-sm">
                            Financial Literacy Program
                        </span>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

                        {/* LEFT COLUMN: Content */}
                        <div className="lg:col-span-8">

                            {/* Main Headline */}
                            <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 leading-tight mb-4 tracking-tight">
                                Gradus FINLIT — Master Money. <span className="text-brand-blue">Control Your Future.</span>
                            </h1>

                            {/* Sub-description */}
                            <p className="text-slate-600 text-lg md:text-xl leading-relaxed mb-6 font-medium">
                                India’s most practical financial literacy program for students & working professionals.
                            </p>
                            <p className="text-brand-muted text-base leading-relaxed mb-8 border-l-4 border-brand-orange pl-4">
                                Learn money basics, financial planning, budgeting & wealth mindset the way schools never taught — simple, practical, and India‑focused.
                            </p>

                            {/* Navigation Tabs */}
                            <div className="border-b border-brand-border mb-8 flex gap-6 text-sm font-semibold overflow-x-auto no-scrollbar">
                                <button onClick={() => switchTab('overview')} className={`${activeTab === 'overview' ? 'tab-active' : 'tab-inactive'} pb-3 whitespace-nowrap transition-colors flex items-center gap-2 px-1`}>
                                    <i className="fa-solid fa-grid-2"></i> Overview
                                </button>
                                <button onClick={() => switchTab('curriculum')} className={`${activeTab === 'curriculum' ? 'tab-active' : 'tab-inactive'} pb-3 whitespace-nowrap transition-colors flex items-center gap-2 px-1`}>
                                    <i className="fa-solid fa-book-open"></i> Curriculum
                                </button>
                                <button onClick={() => switchTab('faq')} className={`${activeTab === 'faq' ? 'tab-active' : 'tab-inactive'} pb-3 whitespace-nowrap transition-colors flex items-center gap-2 px-1`}>
                                    <i className="fa-solid fa-circle-question"></i> FAQ
                                </button>
                                <button onClick={() => switchTab('instructor')} className={`${activeTab === 'instructor' ? 'tab-active' : 'tab-inactive'} pb-3 whitespace-nowrap transition-colors flex items-center gap-2 px-1`}>
                                    <i className="fa-solid fa-user-tie"></i> Instructor
                                </button>
                            </div>

                            {/* Dynamic Content Sections */}

                            {/* SECTION: OVERVIEW */}
                            {activeTab === 'overview' && (
                                <div className="space-y-10 animate-fadeIn">

                                    {/* Why It Matters */}
                                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                        <h2 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
                                            <i className="fa-solid fa-lightbulb text-brand-orange"></i> Why Financial Literacy Matters
                                        </h2>
                                        <p className="text-slate-600 mb-3 leading-relaxed">
                                            Most Indians work hard, earn more every year… but still struggle with savings, debt, and financial stress.
                                            Why? <span className="font-semibold text-slate-900">Because no one taught us how money actually works.</span>
                                        </p>
                                        <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm">
                                            <p className="text-brand-blue font-medium">Gradus FINLIT exists to fix this gap. Increasing income is important. Managing and growing it is life‑changing.</p>
                                        </div>
                                    </div>

                                    {/* Who Is This For */}
                                    <div>
                                        <h2 className="text-2xl font-bold text-slate-900 mb-6">Who Is Gradus FINLIT For?</h2>
                                        <div className="grid sm:grid-cols-2 gap-4">
                                            {[
                                                "College students who want money clarity early",
                                                "Freshers earning their first salary",
                                                "Working professionals stuck in salary‑to‑salary cycle",
                                                "Anyone scared of investing or confused about finance"
                                            ].map((item, idx) => (
                                                <div key={idx} className="flex items-start gap-3 p-3 bg-white border border-gray-100 rounded-xl hover:shadow-md transition-shadow">
                                                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
                                                        <i className="fa-solid fa-check text-green-600 text-xs"></i>
                                                    </div>
                                                    <span className="text-slate-700 font-medium text-sm">{item}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* How It Works */}
                                    <div>
                                        <h2 className="text-2xl font-bold text-slate-900 mb-6">How Gradus FINLIT Works</h2>
                                        <div className="space-y-4 relative pl-4 border-l-2 border-brand-border">
                                            {[
                                                "Learn through simple videos & live sessions",
                                                "Apply with real-life examples & tools",
                                                "Use templates, calculators & trackers",
                                                "Build habits, not just knowledge",
                                                "Stay accountable with community support"
                                            ].map((step, idx) => (
                                                <div key={idx} className="relative pl-6">
                                                    <div className="absolute -left-[25px] top-1 w-4 h-4 rounded-full bg-white border-4 border-brand-blue"></div>
                                                    <h3 className="font-semibold text-slate-900 text-base">Step {idx + 1}</h3>
                                                    <p className="text-slate-600 text-sm">{step}</p>
                                                </div>
                                            ))}
                                        </div>
                                        <p className="mt-4 text-center text-sm font-bold text-slate-500 bg-gray-50 py-2 rounded-lg">No jargon. No market tips. Just clarity.</p>
                                    </div>

                                    {/* Outcomes & Tools Grid */}
                                    <div className="grid md:grid-cols-2 gap-6">
                                        {/* Outcomes */}
                                        <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
                                            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                                                <i className="fa-solid fa-trophy text-brand-blue"></i> Outcomes You Can Expect
                                            </h3>
                                            <ul className="space-y-3">
                                                {[
                                                    "Clear understanding of money & investing",
                                                    "Confidence to make financial decisions",
                                                    "Better savings & spending habits",
                                                    "Long-term wealth mindset"
                                                ].map((item, i) => (
                                                    <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                                                        <i className="fa-solid fa-angle-right text-brand-blue mt-1"></i> {item}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        {/* Tools */}
                                        <div className="bg-orange-50/50 p-6 rounded-2xl border border-orange-100">
                                            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                                                <i className="fa-solid fa-toolbox text-brand-orange"></i> Practical Tools Included
                                            </h3>
                                            <ul className="space-y-3">
                                                {[
                                                    "Monthly budgeting templates",
                                                    "SIP & wealth calculators",
                                                    "Expense trackers",
                                                    "Money checklists",
                                                    "Beginner wealth roadmap"
                                                ].map((item, i) => (
                                                    <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                                                        <i className="fa-solid fa-angle-right text-brand-orange mt-1"></i> {item}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>

                                    {/* Community & Bonuses */}
                                    <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-8 text-white relative overflow-hidden">
                                        <div className="relative z-10">
                                            <h2 className="text-2xl font-bold mb-4">Limited Period Bonuses + Community</h2>
                                            <div className="grid sm:grid-cols-2 gap-6">
                                                <div>
                                                    <h4 className="font-bold text-brand-orange mb-2 text-sm uppercase tracking-wide">Included Bonuses</h4>
                                                    <ul className="space-y-2 text-sm text-gray-300">
                                                        <li><i className="fa-regular fa-file-pdf mr-2"></i> Personal Finance Starter Guide (PDF)</li>
                                                        <li><i className="fa-solid fa-chart-pie mr-2"></i> Budget Planner + Tracker</li>
                                                        <li><i className="fa-solid fa-brain mr-2"></i> Money Mindset Workbook</li>
                                                    </ul>
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-blue-400 mb-2 text-sm uppercase tracking-wide">Community Support</h4>
                                                    <ul className="space-y-2 text-sm text-gray-300">
                                                        <li><i className="fa-regular fa-comments mr-2"></i> Weekly money Q&A sessions</li>
                                                        <li><i className="fa-solid fa-users mr-2"></i> Lifetime community access</li>
                                                        <li><i className="fa-solid fa-bullseye mr-2"></i> Real-life finance examples</li>
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Testimonials */}
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-900 mb-4">What Learners Say</h2>
                                        <div className="grid sm:grid-cols-2 gap-4">
                                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                                <p className="italic text-slate-600 text-sm mb-4">“I finally understand where my money goes every month.”</p>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full bg-gray-200"></div>
                                                    <span className="font-bold text-xs text-slate-900 uppercase">Working Professional</span>
                                                </div>
                                            </div>
                                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                                <p className="italic text-slate-600 text-sm mb-4">“I wish I had learned this in college.”</p>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full bg-gray-200"></div>
                                                    <span className="font-bold text-xs text-slate-900 uppercase">Student, Gradus FINLIT</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* SECTION: CURRICULUM */}
                            {activeTab === 'curriculum' && (
                                <div className="space-y-8 animate-fadeIn">
                                    <div>
                                        <h2 className="text-2xl font-bold text-slate-900 mb-2">What You’ll Learn</h2>
                                        <p className="text-slate-500 mb-6">A structured path to financial freedom.</p>
                                    </div>

                                    <div className="space-y-6">
                                        {[
                                            {
                                                title: "Financial Foundations",
                                                desc: "How money really works, Inflation & compounding, Good debt vs bad debt, Smart saving habits",
                                                icon: "fa-solid fa-coins"
                                            },
                                            {
                                                title: "Personal Finance",
                                                desc: "Budgeting that actually works, Emergency fund planning, Salary management system, Avoiding common money mistakes",
                                                icon: "fa-solid fa-wallet"
                                            },
                                            {
                                                title: "Investing Basics (Beginner-Friendly)",
                                                desc: "Mutual funds explained simply, SIPs & long-term investing, Risk management, What NOT to invest in",
                                                icon: "fa-solid fa-chart-line"
                                            },
                                            {
                                                title: "Money Mindset",
                                                desc: "Rich vs poor money habits, How middle-class thinking blocks wealth, Building long-term financial discipline",
                                                icon: "fa-solid fa-brain"
                                            }
                                        ].map((module, i) => (
                                            <div key={i} className="flex gap-4 p-5 rounded-2xl border border-gray-100 bg-white hover:border-blue-200 transition-colors">
                                                <div className="shrink-0 w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-brand-blue text-xl">
                                                    <i className={module.icon}></i>
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-lg text-slate-900 mb-2">{module.title}</h3>
                                                    <ul className="space-y-1">
                                                        {module.desc.split(', ').map((pt, j) => (
                                                            <li key={j} className="text-slate-600 text-sm flex items-start gap-2">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5 shrink-0"></span>
                                                                {pt}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* SECTION: FAQ */}
                            {activeTab === 'faq' && (
                                <div className="space-y-6 animate-fadeIn">
                                    <h2 className="text-2xl font-bold text-slate-900 mb-4">Frequently Asked Questions</h2>
                                    <div className="space-y-4">
                                        {[
                                            { q: "Do I need prior finance knowledge?", a: "No. This is beginner‑friendly." },
                                            { q: "Is this about market analysis?", a: "No. This is about long‑term financial stability." },
                                            { q: "Is this safe for students?", a: "Yes. We focus on habits, not risky moves." },
                                            { q: "How long is the program?", a: "Self‑paced with guided milestones." }
                                        ].map((item, i) => (
                                            <div key={i} className="bg-white border border-gray-200 rounded-xl p-5">
                                                <h3 className="font-bold text-slate-900 mb-2 text-base flex justify-between items-center">
                                                    {item.q}
                                                    <i className="fa-solid fa-chevron-down text-gray-400 text-xs"></i>
                                                </h3>
                                                <p className="text-slate-600 text-sm">{item.a}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* SECTION: INSTRUCTOR */}
                            {activeTab === 'instructor' && (
                                <div className="space-y-6 animate-fadeIn">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-16 h-16 rounded-full bg-gray-200 border-2 border-white shadow overflow-hidden">
                                            {/* Placeholder or existing image if available */}
                                            <div className="w-full h-full bg-slate-300 flex items-center justify-center text-2xl text-slate-500 font-bold">V</div>
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-bold text-slate-900">Vaibhav Batra</h2>
                                            <p className="text-slate-500 font-medium">Career Counselor & EdTech Specialist</p>
                                        </div>
                                    </div>

                                    <p className="text-slate-600 leading-relaxed">
                                        Hello, I'm Vaibhav Batra. With six years of experience in market analysis and training, I help you master practical financial market skills. At Gradus, I focus on bridging academics with industry, preparing you to seize real, market-ready opportunities.
                                    </p>
                                </div>
                            )}

                        </div>


                        {/* RIGHT COLUMN: Sticky Card */}
                        <div className="lg:col-span-4 relative">
                            <div className="sticky top-24 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden ring-1 ring-slate-900/5">

                                {/* Banner Image from Cloudinary */}
                                <div className="w-full relative group">
                                    <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors"></div>
                                    <img
                                        src="https://res.cloudinary.com/dnp3j8xb1/image/upload/v1763444134/courses/e8txrslkpt57nsvt05sj.png"
                                        alt="Webinar Banner"
                                        className="w-full h-auto object-cover"
                                    />
                                    <div className="absolute bottom-4 left-4 right-4">
                                        <div className="bg-white/90 backdrop-blur-md px-3 py-2 rounded-lg text-xs font-bold text-slate-800 shadow-sm inline-block">
                                            <i className="fa-solid fa-fire text-orange-500 mr-1"></i> Trending Program
                                        </div>
                                    </div>
                                </div>

                                {/* Header */}
                                <div className="bg-slate-900 p-4 text-center">
                                    <h3 className="text-white font-bold text-lg leading-tight">Join Gradus FINLIT</h3>
                                    <p className="text-slate-400 text-xs mt-1 uppercase tracking-wider font-semibold">Download Free Starter Kit</p>
                                </div>

                                {/* Form */}
                                <div className="p-6 bg-white">
                                    <div className="mb-4 text-center">
                                        <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-bold border border-green-100">
                                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                            Registrations Closing Soon
                                        </div>
                                    </div>

                                    <form onSubmit={(e) => { e.preventDefault(); alert('Success! Welcome to Gradus FINLIT.'); }} className="space-y-4">

                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">Name <span className="text-red-500">*</span></label>
                                            <div className="relative">
                                                <i className="fa-regular fa-user absolute left-3 top-3.5 text-slate-400 text-sm"></i>
                                                <input type="text" placeholder="Full name" className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-4 py-3 text-sm text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none" required />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">Email <span className="text-red-500">*</span></label>
                                            <div className="relative">
                                                <i className="fa-regular fa-envelope absolute left-3 top-3.5 text-slate-400 text-sm"></i>
                                                <input type="email" placeholder="Email address" className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-4 py-3 text-sm text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none" required />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">WhatsApp <span className="text-red-500">*</span></label>
                                            <div className="relative">
                                                <i className="fa-brands fa-whatsapp absolute left-3 top-3.5 text-slate-400 text-sm"></i>
                                                <input type="tel" placeholder="Phone number" className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-4 py-3 text-sm text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none" required />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">State</label>
                                                <div className="relative">
                                                    <select className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-3 text-sm text-slate-600 focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer">
                                                        <option>Select</option>
                                                        <option>Delhi</option>
                                                        <option>Mumbai</option>
                                                        <option>Bangalore</option>
                                                        <option>Other</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">Profile</label>
                                                <div className="relative">
                                                    <select className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-3 text-sm text-slate-600 focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer">
                                                        <option>Student</option>
                                                        <option>Pro</option>
                                                        <option>Other</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-3 mt-4 bg-blue-50 p-3 rounded-lg">
                                            <input type="checkbox" id="auth" className="mt-0.5 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 shrink-0" defaultChecked />
                                            <label htmlFor="auth" className="text-[10px] text-slate-500 leading-snug">
                                                I authorize Gradus Team to reach out via Email/SMS/WhatsApp.
                                            </label>
                                        </div>

                                        <button type="submit" className="w-full bg-brand-orange text-white font-bold py-3.5 px-4 rounded-xl hover:bg-orange-600 transition-all shadow-lg hover:shadow-orange-200 transform hover:-translate-y-0.5 duration-200 text-sm flex items-center justify-center gap-2">
                                            <span>Join Gradus FINLIT</span>
                                            <i className="fa-solid fa-arrow-right"></i>
                                        </button>

                                        <div className="mt-4 text-center border-t border-gray-100 pt-4">
                                            <p className="text-xs text-slate-400 font-medium mb-1">Trusted by 200+ Learners</p>
                                            <div className="flex justify-center items-center gap-1 text-yellow-400 text-xs">
                                                <i className="fa-solid fa-star"></i>
                                                <i className="fa-solid fa-star"></i>
                                                <i className="fa-solid fa-star"></i>
                                                <i className="fa-solid fa-star"></i>
                                                <i className="fa-solid fa-star"></i>
                                            </div>
                                        </div>

                                    </form>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* Bottom CTA Banner */}
                <div className="bg-brand-blue py-8 border-t border-blue-400">
                    <div className="max-w-7xl mx-auto px-4 text-center">
                        <h2 className="text-2xl font-bold text-white mb-2">Take Control of Your Money Today</h2>
                        <p className="text-blue-100 mb-6">Money stress is optional. Financial clarity is a choice.</p>
                        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="bg-white text-brand-blue font-bold px-8 py-3 rounded-full hover:bg-blue-50 transition-colors shadow-lg">
                            Get Started Now
                        </button>
                    </div>
                </div>
            </div>

            {/* Standard Footer */}
            <FooterOne />
        </>
    );
};

export default VaibhavBatraMasterclass;
