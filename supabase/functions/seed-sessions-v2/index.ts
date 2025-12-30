import { createClient } from "npm:@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const SESSIONS = [
  // PAST
  {
    title: 'Week 1: Introduction to Financial Markets',
    course_name: 'Gradus Finlit',
    status: 'ended', // enum check: scheduled, live, ended
    scheduled_for: new Date(Date.now() - 10*86400000).toISOString(),
    host_display_name: 'Rahul Verma',
    host_secret: 'dummy_secret_1',
    created_at: new Date(Date.now() - 10*86400000).toISOString()
  },
  {
    title: 'Module 2: Risk Management',
    course_name: 'Gradus Finlit',
    status: 'ended',
    scheduled_for: new Date(Date.now() - 7*86400000).toISOString(),
    host_display_name: 'Rahul Verma',
    host_secret: 'dummy_secret_2',
    created_at: new Date(Date.now() - 7*86400000).toISOString()
  },
  {
    title: 'Project Review: Portfolio Allocations',
    course_name: 'Gradus Finlit',
    status: 'ended',
    scheduled_for: new Date(Date.now() - 5*86400000).toISOString(),
    host_display_name: 'Rahul Verma',
    host_secret: 'dummy_secret_3',
    created_at: new Date(Date.now() - 5*86400000).toISOString()
  },
  {
    title: 'Design Systems 101',
    course_name: 'Gradus X',
    status: 'ended',
    scheduled_for: new Date(Date.now() - 3*86400000).toISOString(),
    host_display_name: 'Aditi Sharma',
    host_secret: 'dummy_secret_4',
    created_at: new Date(Date.now() - 3*86400000).toISOString()
  },
  {
    title: 'Sprint Planning Workshop',
    course_name: 'Gradus Lead',
    status: 'ended',
    scheduled_for: new Date(Date.now() - 1*86400000).toISOString(),
    host_display_name: 'Amit Patel',
    host_secret: 'dummy_secret_5',
    created_at: new Date(Date.now() - 1*86400000).toISOString()
  },
  
  // UPCOMING
  {
    title: 'Week 2: Advanced Equity Research',
    course_name: 'Gradus Finlit',
    status: 'scheduled',
    scheduled_for: new Date(Date.now() + 1*86400000).toISOString(),
    host_display_name: 'Rahul Verma',
    host_secret: 'dummy_secret_6',
    created_at: new Date().toISOString()
  },
  {
    title: 'Figma Prototyping Masterclass',
    course_name: 'Gradus X',
    status: 'scheduled',
    scheduled_for: new Date(Date.now() + 2*86400000).toISOString(),
    host_display_name: 'Aditi Sharma',
    host_secret: 'dummy_secret_7',
    created_at: new Date().toISOString()
  },
  {
    title: 'Guest Lecture: AI in Finance',
    course_name: 'Gradus Finlit',
    status: 'scheduled',
    scheduled_for: new Date(Date.now() + 4*86400000).toISOString(),
    host_display_name: 'Dr. S. Gupta',
    host_secret: 'dummy_secret_8',
    created_at: new Date().toISOString()
  },
  {
    title: 'Leadership in Crisis',
    course_name: 'Gradus Lead',
    status: 'scheduled',
    scheduled_for: new Date(Date.now() + 7*86400000).toISOString(),
    host_display_name: 'Amit Patel',
    host_secret: 'dummy_secret_9',
    created_at: new Date().toISOString()
  },
  {
    title: 'Portfolio Review & Final Presenation',
    course_name: 'Gradus X',
    status: 'scheduled',
    scheduled_for: new Date(Date.now() + 10*86400000).toISOString(),
    host_display_name: 'Aditi Sharma',
    host_secret: 'dummy_secret_10',
    created_at: new Date().toISOString()
  }
];

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  // Insert data
  const { error } = await supabase.from("live_sessions").insert(SESSIONS);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }

  return new Response(JSON.stringify({ message: "Seeded 10 sessions successfully into live_sessions!" }), { status: 200, headers: { "Content-Type": "application/json" } });
});
