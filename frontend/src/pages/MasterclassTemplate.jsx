import React, { useState, useEffect } from 'react';
import HeaderOne from "../components/HeaderOne";
import FooterOne from "../components/FooterOne";
import Preloader from "../helper/Preloader";
import './VaibhavBatraMasterclass.css';
import { Link } from 'react-router-dom';

const MasterclassTemplate = ({ event }) => {
    const [activeTab, setActiveTab] = useState('overview');
    const details = event.masterclassDetails || {};
    const overview = details.overview || {};

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

    const formatDate = (iso) => {
        if (!iso) return '';
        const d = new Date(iso);
        return d.toLocaleDateString("en-IN", { day: 'numeric', month: 'long', year: 'numeric' });
    }

    const formatTime = (iso) => {
        if (!iso) return '';
        const d = new Date(iso);
        return d.toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit' });
    }

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
                        {event.badge && (
                            <span className="inline-block bg-blue-50 text-brand-blue px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase mb-2 border border-blue-100 shadow-sm">
                                {event.badge}
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

                        {/* LEFT COLUMN: Content */}
                        <div className="lg:col-span-8">

                            {/* Main Headline */}
                            <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 leading-tight mb-4 tracking-tight">
                                {event.title}
                            </h1>

                            {/* Sub-description */}
                            {event.summary && (
                                <p className="text-slate-600 text-lg md:text-xl leading-relaxed mb-6 font-medium">
                                    {event.summary}
                                </p>
                            )}

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
                                    {overview.whyMatters?.title && (
                                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                            <h2 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
                                                <i className="fa-solid fa-lightbulb text-brand-orange"></i> {overview.whyMatters.title}
                                            </h2>
                                            <p className="text-slate-600 mb-3 leading-relaxed whitespace-pre-line">
                                                {overview.whyMatters.description}
                                            </p>
                                        </div>
                                    )}

                                    {/* Who Is This For */}
                                    {overview.whoIsFor?.length > 0 && (
                                        <div>
                                            <h2 className="text-2xl font-bold text-slate-900 mb-6">Who Is This For?</h2>
                                            <div className="grid sm:grid-cols-2 gap-4">
                                                {overview.whoIsFor.map((item, idx) => (
                                                    <div key={idx} className="flex items-start gap-3 p-3 bg-white border border-gray-100 rounded-xl hover:shadow-md transition-shadow">
                                                        <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
                                                            <i className="fa-solid fa-check text-green-600 text-xs"></i>
                                                        </div>
                                                        <span className="text-slate-700 font-medium text-sm">{item}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Outcomes & Tools Grid */}
                                    <div className="grid md:grid-cols-2 gap-6">
                                        {/* Outcomes */}
                                        {overview.outcomes?.length > 0 && (
                                            <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
                                                <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                                                    <i className="fa-solid fa-trophy text-brand-blue"></i> Outcomes
                                                </h3>
                                                <ul className="space-y-3">
                                                    {overview.outcomes.map((item, i) => (
                                                        <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                                                            <i className="fa-solid fa-angle-right text-brand-blue mt-1"></i> {item}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {/* Tools */}
                                        {overview.tools?.length > 0 && (
                                            <div className="bg-orange-50/50 p-6 rounded-2xl border border-orange-100">
                                                <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                                                    <i className="fa-solid fa-toolbox text-brand-orange"></i> Tools Included
                                                </h3>
                                                <ul className="space-y-3">
                                                    {overview.tools.map((item, i) => (
                                                        <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                                                            <i className="fa-solid fa-angle-right text-brand-orange mt-1"></i> {item}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>

                                    {/* Community & Bonuses */}
                                    {(overview.bonuses?.length > 0 || overview.community?.length > 0) && (
                                        <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-8 text-white relative overflow-hidden">
                                            <div className="relative z-10">
                                                <h2 className="text-2xl font-bold mb-4">Bonuses & Community</h2>
                                                <div className="grid sm:grid-cols-2 gap-6">
                                                    {overview.bonuses?.length > 0 && (
                                                        <div>
                                                            <h4 className="font-bold text-brand-orange mb-2 text-sm uppercase tracking-wide">Included Bonuses</h4>
                                                            <ul className="space-y-2 text-sm text-gray-300">
                                                                {overview.bonuses.map((item, i) => (
                                                                    <li key={i}><i className="fa-regular fa-star mr-2"></i> {item}</li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                    {overview.community?.length > 0 && (
                                                        <div>
                                                            <h4 className="font-bold text-blue-400 mb-2 text-sm uppercase tracking-wide">Community Support</h4>
                                                            <ul className="space-y-2 text-sm text-gray-300">
                                                                {overview.community.map((item, i) => (
                                                                    <li key={i}><i className="fa-solid fa-users mr-2"></i> {item}</li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                </div>
                            )}

                            {/* SECTION: CURRICULUM */}
                            {activeTab === 'curriculum' && (
                                <div className="space-y-8 animate-fadeIn">
                                    <div>
                                        <h2 className="text-2xl font-bold text-slate-900 mb-2">What You’ll Learn</h2>
                                        <p className="text-slate-500 mb-6">A structured path to mastery.</p>
                                    </div>

                                    <div className="space-y-6">
                                        {details.curriculum?.map((module, i) => (
                                            <div key={i} className="flex gap-4 p-5 rounded-2xl border border-gray-100 bg-white hover:border-blue-200 transition-colors">
                                                <div className="shrink-0 w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-brand-blue text-xl">
                                                    <i className={module.icon || "fa-solid fa-book"}></i>
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-lg text-slate-900 mb-2">{module.title}</h3>
                                                    <p className="text-slate-600 text-sm">{module.description}</p>
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
                                        {details.faqs?.map((item, i) => (
                                            <div key={i} className="bg-white border border-gray-200 rounded-xl p-5">
                                                <h3 className="font-bold text-slate-900 mb-2 text-base">
                                                    {item.question}
                                                </h3>
                                                <p className="text-slate-600 text-sm">{item.answer}</p>
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
                                            {event.host?.avatarUrl ? (
                                                <img src={event.host.avatarUrl} alt={event.host.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full bg-slate-300 flex items-center justify-center text-2xl text-slate-500 font-bold">
                                                    {event.host?.name?.charAt(0)}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-bold text-slate-900">{event.host?.name}</h2>
                                            <p className="text-slate-500 font-medium">{event.host?.title}</p>
                                        </div>
                                    </div>

                                    <p className="text-slate-600 leading-relaxed whitespace-pre-line">
                                        {event.host?.bio}
                                    </p>
                                </div>
                            )}

                        </div>


                        {/* RIGHT COLUMN: Sticky Card */}
                        <div className="lg:col-span-4 relative">
                            <div className="sticky top-24 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden ring-1 ring-slate-900/5">

                                {/* Banner Image */}
                                <div className="w-full relative group">
                                    <img
                                        src={event.heroImage?.url}
                                        alt={event.heroImage?.alt || event.title}
                                        className="w-full h-auto object-cover"
                                    />
                                    {event.isFeatured && (
                                        <div className="absolute bottom-4 left-4 right-4">
                                            <div className="bg-white/90 backdrop-blur-md px-3 py-2 rounded-lg text-xs font-bold text-slate-800 shadow-sm inline-block">
                                                <i className="fa-solid fa-fire text-orange-500 mr-1"></i> Trending
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Header */}
                                <div className="bg-slate-900 p-4 text-center">
                                    <h3 className="text-white font-bold text-lg leading-tight">Join Masterclass</h3>
                                    {event.schedule?.start && (
                                        <p className="text-slate-400 text-xs mt-1 uppercase tracking-wider font-semibold">
                                            {formatDate(event.schedule.start)} @ {formatTime(event.schedule.start)}
                                        </p>
                                    )}
                                </div>

                                {/* Form / CTA */}
                                <div className="p-6 bg-white">
                                    <div className="mb-4 text-center">
                                        <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-bold border border-green-100">
                                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                            Registrations Open
                                        </div>
                                    </div>

                                    <button
                                        className="w-full bg-brand-orange text-white font-bold py-3.5 px-4 rounded-xl hover:bg-orange-600 transition-all shadow-lg hover:shadow-orange-200 transform hover:-translate-y-0.5 duration-200 text-sm flex items-center justify-center gap-2">
                                        <a href={event.cta?.url || "#"} target="_blank" rel="noreferrer" className="text-white no-underline">
                                            {event.cta?.label || "Register Now"}
                                        </a>
                                        <i className="fa-solid fa-arrow-right"></i>
                                    </button>

                                    <div className="mt-4 text-center border-t border-gray-100 pt-4">
                                        <p className="text-xs text-slate-400 font-medium mb-1">Price</p>
                                        <p className="text-lg font-bold text-slate-900">
                                            {event.price?.isFree ? "FREE" : `${event.price?.currency} ${event.price?.amount}`}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* Bottom CTA Banner */}
                <div className="bg-brand-blue py-8 border-t border-blue-400">
                    <div className="max-w-7xl mx-auto px-4 text-center">
                        <h2 className="text-2xl font-bold text-white mb-2">Ready to level up?</h2>
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

export default MasterclassTemplate;
