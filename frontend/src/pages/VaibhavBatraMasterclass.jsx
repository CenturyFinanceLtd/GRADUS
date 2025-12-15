import React, { useState, useEffect } from 'react';
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
            // Cleanup scripts slightly risky if they are needed elsewhere, but for this CDN approach it's fine to leave them or remove.
            // Removing might break if user navigates back quickly, but usually safe for single page styles.
            // Leaving them is safer for now.
        }
    }, []);

    const switchTab = (tabId) => {
        setActiveTab(tabId);
    };

    return (
        <div className="bg-white text-brand-text font-sans antialiased">
            {/* Navbar (Simple) */}
            <nav className="border-b border-brand-border bg-white sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {/* Logo Placeholder */}
                        <div className="font-bold text-xl tracking-tight text-slate-900">
                            <span className="text-brand-blue">GRADUS</span> FINLIT
                        </div>
                    </div>
                    <div className="text-sm font-medium text-brand-muted hidden sm:block">
                        Financial Literacy Program
                    </div>
                </div>
            </nav>

            {/* Main Layout */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

                    {/* LEFT COLUMN: Content */}
                    <div className="lg:col-span-8">

                        {/* Header Tags */}
                        <div className="flex gap-2 mb-4">
                            <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase">Financial Literacy</span>
                            <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase">Live Cohort</span>
                        </div>

                        {/* Main Headline */}
                        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight mb-4">
                            Master Money. Control Your Future: India’s most practical finance program
                        </h1>

                        {/* Sub-description */}
                        <p className="text-brand-muted text-lg leading-relaxed mb-8">
                            Most Indians work hard, earn more every year… but still struggle with savings. Why? Because no one taught us how money actually works. Learn money basics, investing, budgeting & wealth mindset the way schools never taught — simple, practical, and India‑focused.
                        </p>

                        {/* Navigation Tabs */}
                        <div className="border-b border-brand-border mb-8 flex gap-8 text-sm font-medium overflow-x-auto no-scrollbar">
                            <button onClick={() => switchTab('overview')} className={`${activeTab === 'overview' ? 'tab-active' : 'tab-inactive'} pb-3 whitespace-nowrap transition-colors`}>
                                <i className="fa-solid fa-grid-2 mr-2"></i> Overview
                            </button>
                            <button onClick={() => switchTab('curriculum')} className={`${activeTab === 'curriculum' ? 'tab-active' : 'tab-inactive'} pb-3 whitespace-nowrap transition-colors`}>
                                <i className="fa-solid fa-book-open mr-2"></i> What You'll Learn
                            </button>
                            <button onClick={() => switchTab('instructor')} className={`${activeTab === 'instructor' ? 'tab-active' : 'tab-inactive'} pb-3 whitespace-nowrap transition-colors`}>
                                <i className="fa-solid fa-users mr-2"></i> Who Is This For?
                            </button>
                            <button onClick={() => switchTab('help')} className={`${activeTab === 'help' ? 'tab-active' : 'tab-inactive'} pb-3 whitespace-nowrap transition-colors`}>
                                <i className="fa-solid fa-headset mr-2"></i> Help
                            </button>
                        </div>

                        {/* Dynamic Content Sections */}

                        {/* SECTION: OVERVIEW */}
                        {activeTab === 'overview' && (
                            <div className="space-y-8 animate-fadeIn">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900 mb-4">Why This Matters</h2>
                                    <p className="text-slate-600 mb-4">Gradus FINLIT exists to fix the gap in our education system. Earning money is important. Managing and growing it is life‑changing.</p>

                                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-6">
                                        <h3 className="font-bold text-blue-900 mb-2">Outcomes You Can Expect</h3>
                                        <ul className="grid sm:grid-cols-2 gap-3 text-sm text-blue-800">
                                            <li className="flex items-start gap-2"><i className="fa-solid fa-check mt-1"></i> Clear understanding of money & investing</li>
                                            <li className="flex items-start gap-2"><i className="fa-solid fa-check mt-1"></i> Confidence to make financial decisions</li>
                                            <li className="flex items-start gap-2"><i className="fa-solid fa-check mt-1"></i> Better savings & spending habits</li>
                                            <li className="flex items-start gap-2"><i className="fa-solid fa-check mt-1"></i> Long-term wealth mindset</li>
                                        </ul>
                                    </div>
                                </div>

                                <div>
                                    <h2 className="text-xl font-bold text-slate-900 mb-4">What Learners Say</h2>
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                                            <p className="italic text-slate-600 text-sm mb-3">"I finally understand where my money goes every month."</p>
                                            <p className="font-bold text-xs text-slate-900">— Working Professional</p>
                                        </div>
                                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                                            <p className="italic text-slate-600 text-sm mb-3">"I wish I had learned this in college."</p>
                                            <p className="font-bold text-xs text-slate-900">— Student, Gradus FINLIT</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Tools Section */}
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900 mb-4">Bonus Tools Included</h2>
                                    <div className="flex flex-wrap gap-2">
                                        <span className="bg-white border border-gray-200 px-4 py-2 rounded-lg text-sm text-slate-600"><i className="fa-solid fa-file-pdf mr-2 text-red-500"></i> Starter Guide PDF</span>
                                        <span className="bg-white border border-gray-200 px-4 py-2 rounded-lg text-sm text-slate-600"><i className="fa-solid fa-calculator mr-2 text-blue-500"></i> Budget Planner</span>
                                        <span className="bg-white border border-gray-200 px-4 py-2 rounded-lg text-sm text-slate-600"><i className="fa-solid fa-brain mr-2 text-orange-500"></i> Mindset Workbook</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* SECTION: CURRICULUM */}
                        {activeTab === 'curriculum' && (
                            <div className="space-y-8 animate-fadeIn">
                                <h2 className="text-xl font-bold text-slate-900 mb-2">Program Syllabus</h2>
                                <p className="text-sm text-slate-500 mb-6">Practical knowledge. No jargon. No stock tips.</p>

                                <div className="space-y-4">
                                    {/* Module 1 */}
                                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 font-semibold text-slate-900 flex justify-between items-center">
                                            <span>1. Financial Foundations</span>
                                            <span className="text-xs bg-white border border-gray-200 px-2 py-1 rounded">Basics</span>
                                        </div>
                                        <div className="p-6 text-sm text-slate-600 leading-relaxed">
                                            <ul className="list-disc pl-5 space-y-1">
                                                <li>How money really works</li>
                                                <li>Inflation, interest & compounding (made simple)</li>
                                                <li>Good debt vs bad debt</li>
                                                <li>Smart saving habits</li>
                                            </ul>
                                        </div>
                                    </div>

                                    {/* Module 2 */}
                                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 font-semibold text-slate-900 flex justify-between items-center">
                                            <span>2. Personal Finance</span>
                                            <span className="text-xs bg-white border border-gray-200 px-2 py-1 rounded">Practical</span>
                                        </div>
                                        <div className="p-6 text-sm text-slate-600 leading-relaxed">
                                            <ul className="list-disc pl-5 space-y-1">
                                                <li>Budgeting that actually works</li>
                                                <li>Emergency fund planning</li>
                                                <li>Salary management system</li>
                                                <li>Avoiding common money mistakes</li>
                                            </ul>
                                        </div>
                                    </div>

                                    {/* Module 3 */}
                                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 font-semibold text-slate-900 flex justify-between items-center">
                                            <span>3. Investing Basics</span>
                                            <span className="text-xs bg-white border border-gray-200 px-2 py-1 rounded">Growth</span>
                                        </div>
                                        <div className="p-6 text-sm text-slate-600 leading-relaxed">
                                            <ul className="list-disc pl-5 space-y-1">
                                                <li>Mutual funds explained simply</li>
                                                <li>SIPs, stocks & long-term investing</li>
                                                <li>Risk management</li>
                                                <li>What NOT to invest in (common traps)</li>
                                            </ul>
                                        </div>
                                    </div>

                                    {/* Module 4 */}
                                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 font-semibold text-slate-900 flex justify-between items-center">
                                            <span>4. Money Mindset</span>
                                            <span className="text-xs bg-white border border-gray-200 px-2 py-1 rounded">Psychology</span>
                                        </div>
                                        <div className="p-6 text-sm text-slate-600 leading-relaxed">
                                            <ul className="list-disc pl-5 space-y-1">
                                                <li>Rich vs poor money habits</li>
                                                <li>How middle-class thinking blocks wealth</li>
                                                <li>Building long-term financial discipline</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* SECTION: INSTRUCTOR */}
                        {activeTab === 'instructor' && (
                            <div className="space-y-6 animate-fadeIn">
                                <h2 className="text-xl font-bold text-slate-900">Who should join?</h2>

                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors cursor-default">
                                        <div className="font-bold text-slate-900 mb-1">College Students</div>
                                        <p className="text-sm text-slate-600">Want money clarity early.</p>
                                    </div>
                                    <div className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors cursor-default">
                                        <div className="font-bold text-slate-900 mb-1">Freshers</div>
                                        <p className="text-sm text-slate-600">Earning first salary.</p>
                                    </div>
                                    <div className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors cursor-default">
                                        <div className="font-bold text-slate-900 mb-1">Working Professionals</div>
                                        <p className="text-sm text-slate-600">Stuck in salary‑to‑salary cycle.</p>
                                    </div>
                                    <div className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors cursor-default">
                                        <div className="font-bold text-slate-900 mb-1">Finance Beginners</div>
                                        <p className="text-sm text-slate-600">Scared of investing.</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* SECTION: HELP */}
                        {activeTab === 'help' && (
                            <div className="space-y-4 animate-fadeIn">
                                <h2 className="text-xl font-bold text-slate-900">Need assistance?</h2>
                                <p className="text-slate-600">Reach our learner success team if you have questions about enrolment.</p>

                                <div className="mt-4 space-y-2">
                                    <div className="flex items-center gap-3 text-slate-700">
                                        <i className="fa-regular fa-envelope w-5"></i>
                                        <span>business@gradusindia.in</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-slate-700">
                                        <i className="fa-brands fa-whatsapp w-5"></i>
                                        <span>+91 99999 99999</span>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>


                    {/* RIGHT COLUMN: Sticky Card */}
                    <div className="lg:col-span-4 relative">
                        <div className="sticky top-24 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">

                            {/* Banner Image Area */}
                            <div className="bg-gradient-to-br from-slate-900 to-blue-900 p-6 text-white relative overflow-hidden">
                                {/* Decorative Circles */}
                                <div className="absolute top-0 right-0 w-24 h-24 bg-white opacity-5 rounded-full -mr-10 -mt-10"></div>
                                <div className="absolute bottom-0 left-0 w-16 h-16 bg-white opacity-5 rounded-full -ml-8 -mb-8"></div>

                                <div className="relative z-10">
                                    <div className="uppercase tracking-widest text-xs font-bold text-blue-200 mb-2">Free Starter Kit</div>
                                    <h3 className="text-xl font-bold leading-tight mb-4">Gradus FINLIT: Start Your Journey</h3>
                                    <div className="flex items-center gap-2 text-xs font-medium bg-white/20 inline-flex px-3 py-1 rounded-full backdrop-blur-sm">
                                        <i className="fa-solid fa-bolt text-yellow-400"></i> Most Popular
                                    </div>
                                </div>
                            </div>

                            {/* Alert Box */}
                            <div className="bg-green-50 border-b border-green-100 p-3 flex items-center gap-2 text-green-800 text-sm font-medium">
                                <i className="fa-solid fa-clock"></i> Limited Time Bonuses Available
                            </div>

                            {/* Form */}
                            <div className="p-6">
                                <form onSubmit={(e) => { e.preventDefault(); alert('Success! Welcome to Gradus FINLIT.'); }} className="space-y-5">

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">Name <span className="text-red-500">*</span></label>
                                        <input type="text" placeholder="Enter your full name" className="w-full bg-gray-100 border-none rounded-lg px-4 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none" required />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">Email <span className="text-red-500">*</span></label>
                                        <input type="email" placeholder="you@email.com" className="w-full bg-gray-100 border-none rounded-lg px-4 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none" required />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">Phone <span className="text-red-500">*</span></label>
                                        <input type="tel" placeholder="WhatsApp number" className="w-full bg-gray-100 border-none rounded-lg px-4 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none" required />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">State</label>
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

                                    <div className="flex items-start gap-3 mt-2">
                                        <input type="checkbox" id="auth" className="mt-1 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                                        <label htmlFor="auth" className="text-xs text-slate-500 leading-snug">
                                            I authorize Gradus Team to reach out to me with updates and notifications via Email, SMS, WhatsApp.
                                        </label>
                                    </div>

                                    <button type="submit" className="w-full bg-brand-text text-white font-bold py-3.5 rounded-lg hover:bg-black transition-colors shadow-lg hover:shadow-xl transform active:scale-95 duration-200">
                                        Join Now
                                    </button>

                                </form>

                                {/* Social Proof */}
                                <div className="mt-6 text-center">
                                    <div className="flex justify-center -space-x-2 mb-2">
                                        <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white"></div>
                                        <div className="w-8 h-8 rounded-full bg-gray-300 border-2 border-white"></div>
                                        <div className="w-8 h-8 rounded-full bg-gray-400 border-2 border-white flex items-center justify-center text-[10px] font-bold text-white">+</div>
                                    </div>
                                    <p className="text-xs text-slate-500 font-medium">200+ students have already registered!</p>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default VaibhavBatraMasterclass;
