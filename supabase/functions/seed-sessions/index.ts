import { createClient } from "npm:@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const SESSIONS = [
  // PAST
  {
    slug: 'session-past-1',
    title: 'Week 1: Introduction to Financial Markets',
    subtitle: 'Gradus Finlit',
    description: 'Kickoff session for the Gradus Finlit course.',
    status: 'published',
    mode: 'online',
    is_featured: false,
    schedule: { start: new Date(Date.now() - 10*86400000).toISOString(), end: new Date(Date.now() - 10*86400000 + 3600000).toISOString(), timezone: 'Asia/Kolkata' },
    location: 'Zoom',
    host: { name: 'Rahul Verma' },
    meta: { agenda: ['Intro', 'Market Basics'] },
    cta: { url: '#' },
    price: { amount: 0, currency: 'INR', isFree: true },
    tags: ['finance', 'basics'],
    category: 'session',
    badge: 'Live Class',
    event_type: 'live_session',
    hero_image: { url: 'https://images.unsplash.com/photo-1611974765270-ca1258634369?auto=format&fit=crop&q=80&w=1000' }
  },
  {
    slug: 'session-past-2',
    title: 'Module 2: Risk Management',
    subtitle: 'Gradus Finlit',
    description: 'Understanding risk and reward.',
    status: 'published',
    mode: 'online',
    is_featured: false,
    schedule: { start: new Date(Date.now() - 7*86400000).toISOString(), end: new Date(Date.now() - 7*86400000 + 3600000).toISOString(), timezone: 'Asia/Kolkata' },
    location: 'Zoom',
    host: { name: 'Rahul Verma' },
    meta: { agenda: ['Types of Risk', 'Hedging'] },
    cta: { url: '#' },
    price: { amount: 0, currency: 'INR', isFree: true },
    tags: ['finance', 'risk'],
    category: 'session',
    badge: 'Live Class',
    event_type: 'live_session',
    hero_image: { url: 'https://images.unsplash.com/photo-1611974765270-ca1258634369?auto=format&fit=crop&q=80&w=1000' }
  },
  {
    slug: 'session-past-3',
    title: 'Project Review: Portfolio Allocations',
    subtitle: 'Gradus Finlit',
    description: 'Reviewing student portfolio assignments.',
    status: 'published',
    mode: 'online',
    is_featured: false,
    schedule: { start: new Date(Date.now() - 5*86400000).toISOString(), end: new Date(Date.now() - 5*86400000 + 3600000).toISOString(), timezone: 'Asia/Kolkata' },
    location: 'Zoom',
    host: { name: 'Rahul Verma' },
    meta: { agenda: ['Review', 'Q&A'] },
    cta: { url: '#' },
    price: { amount: 0, currency: 'INR', isFree: true },
    tags: ['finance', 'feedback'],
    category: 'session',
    badge: 'Live Class',
    event_type: 'live_session',
    hero_image: { url: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&q=80&w=1000' }
  },
  {
    slug: 'session-past-4',
    title: 'Design Systems 101',
    subtitle: 'Gradus X',
    description: 'Introduction to atomic design.',
    status: 'published',
    mode: 'online',
    is_featured: false,
    schedule: { start: new Date(Date.now() - 3*86400000).toISOString(), end: new Date(Date.now() - 3*86400000 + 3600000).toISOString(), timezone: 'Asia/Kolkata' },
    location: 'Zoom',
    host: { name: 'Aditi Sharma' },
    meta: { agenda: ['Atomic Design', 'Figma'] },
    cta: { url: '#' },
    price: { amount: 0, currency: 'INR', isFree: true },
    tags: ['design', 'systems'],
    category: 'session',
    badge: 'Live Class',
    event_type: 'live_session',
    hero_image: { url: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&q=80&w=1000' }
  },
  {
    slug: 'session-past-5',
    title: 'Sprint Planning Workshop',
    subtitle: 'Gradus Lead',
    description: 'How to run an effective sprint planning meeting.',
    status: 'published',
    mode: 'online',
    is_featured: false,
    schedule: { start: new Date(Date.now() - 1*86400000).toISOString(), end: new Date(Date.now() - 1*86400000 + 3600000).toISOString(), timezone: 'Asia/Kolkata' },
    location: 'Zoom',
    host: { name: 'Amit Patel' },
    meta: { agenda: ['Agile', 'Planning'] },
    cta: { url: '#' },
    price: { amount: 0, currency: 'INR', isFree: true },
    tags: ['management', 'agile'],
    category: 'session',
    badge: 'Live Class',
    event_type: 'live_session',
    hero_image: { url: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&q=80&w=1000' }
  },
  
  // UPCOMING
  {
    slug: 'session-upcoming-1',
    title: 'Week 2: Advanced Equity Research',
    subtitle: 'Gradus Finlit',
    description: 'Deep dive into equity valuation models.',
    status: 'published',
    mode: 'online',
    is_featured: false,
    schedule: { start: new Date(Date.now() + 1*86400000).toISOString(), end: new Date(Date.now() + 1*86400000 + 3600000).toISOString(), timezone: 'Asia/Kolkata' },
    location: 'Zoom',
    host: { name: 'Rahul Verma' },
    meta: { agenda: ['DCF', 'Multiples'] },
    cta: { url: '#' },
    price: { amount: 0, currency: 'INR', isFree: true },
    tags: ['finance', 'valuation'],
    category: 'session',
    badge: 'Live Class',
    event_type: 'live_session',
    hero_image: { url: 'https://images.unsplash.com/photo-1611974765270-ca1258634369?auto=format&fit=crop&q=80&w=1000' }
  },
  {
    slug: 'session-upcoming-2',
    title: 'Figma Prototyping Masterclass',
    subtitle: 'Gradus X',
    description: 'Learn advanced prototyping techniques in Figma.',
    status: 'published',
    mode: 'online',
    is_featured: false,
    schedule: { start: new Date(Date.now() + 2*86400000).toISOString(), end: new Date(Date.now() + 2*86400000 + 3600000).toISOString(), timezone: 'Asia/Kolkata' },
    location: 'Zoom',
    host: { name: 'Aditi Sharma' },
    meta: { agenda: ['Smart Animate', 'Variables'] },
    cta: { url: '#' },
    price: { amount: 0, currency: 'INR', isFree: true },
    tags: ['design', 'prototyping'],
    category: 'session',
    badge: 'Live Class',
    event_type: 'live_session',
    hero_image: { url: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&q=80&w=1000' }
  },
  {
    slug: 'session-upcoming-3',
    title: 'Guest Lecture: AI in Finance',
    subtitle: 'Gradus Finlit',
    description: 'Special session with industry expert on AI adoption.',
    status: 'published',
    mode: 'online',
    is_featured: false,
    schedule: { start: new Date(Date.now() + 4*86400000).toISOString(), end: new Date(Date.now() + 4*86400000 + 3600000).toISOString(), timezone: 'Asia/Kolkata' },
    location: 'Zoom',
    host: { name: 'Dr. S. Gupta' },
    meta: { agenda: ['AI Trends', 'Future of Fintech'] },
    cta: { url: '#' },
    price: { amount: 0, currency: 'INR', isFree: true },
    tags: ['finance', 'ai'],
    category: 'session',
    badge: 'Live Class',
    event_type: 'live_session',
    hero_image: { url: 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&q=80&w=1000' }
  },
  {
    slug: 'session-upcoming-4',
    title: 'Leadership in Crisis',
    subtitle: 'Gradus Lead',
    description: 'Case studies on managing teams during high-pressure situations.',
    status: 'published',
    mode: 'online',
    is_featured: false,
    schedule: { start: new Date(Date.now() + 7*86400000).toISOString(), end: new Date(Date.now() + 7*86400000 + 3600000).toISOString(), timezone: 'Asia/Kolkata' },
    location: 'Zoom',
    host: { name: 'Amit Patel' },
    meta: { agenda: ['Case Study', 'Role Play'] },
    cta: { url: '#' },
    price: { amount: 0, currency: 'INR', isFree: true },
    tags: ['management', 'leadership'],
    category: 'session',
    badge: 'Live Class',
    event_type: 'live_session',
    hero_image: { url: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&q=80&w=1000' }
  },
  {
    slug: 'session-upcoming-5',
    title: 'Portfolio Review & Final Presenation',
    subtitle: 'Gradus X',
    description: 'Final review of capstone projects.',
    status: 'published',
    mode: 'online',
    is_featured: false,
    schedule: { start: new Date(Date.now() + 10*86400000).toISOString(), end: new Date(Date.now() + 10*86400000 + 3600000).toISOString(), timezone: 'Asia/Kolkata' },
    location: 'Zoom',
    host: { name: 'Aditi Sharma' },
    meta: { agenda: ['Presentations', 'Graduation'] },
    cta: { url: '#' },
    price: { amount: 0, currency: 'INR', isFree: true },
    tags: ['design', 'capstone'],
    category: 'session',
    badge: 'Live Class',
    event_type: 'live_session',
    hero_image: { url: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&q=80&w=1000' }
  }
];

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  // Insert data
  const { error } = await supabase.from("events").insert(SESSIONS);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }

  return new Response(JSON.stringify({ message: "Seeded 10 sessions successfully!" }), { status: 200, headers: { "Content-Type": "application/json" } });
});
