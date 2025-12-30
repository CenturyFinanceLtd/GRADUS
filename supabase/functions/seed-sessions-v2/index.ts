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

// Helper to get random item
const getRandom = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1. Fetch existing courses (select * to be safe)
    const { data: courses, error: courseError } = await supabase
      .from("course")
      .select("*");

    if (courseError) {
      return new Response(JSON.stringify({ error: "Failed to fetch courses: " + courseError.message }), { status: 500 });
    }

    if (!courses || courses.length === 0) {
       return new Response(JSON.stringify({ error: "No courses found in 'course' table." }), { status: 400 });
    }
    
    // Check if title exists, fallback to name or other fields
    const getCourseTitle = (c: any) => c.title || c.name || "Untitled Course";

    // 2. Prepare sessions
    const baseSessions = [
        // PAST
        { title: 'Week 1: Introduction to Financial Markets', status: 'ended', scheduled_offset: -10, host: 'Rahul Verma', tags: ['finance'] },
        { title: 'Module 2: Risk Management', status: 'ended', scheduled_offset: -7, host: 'Rahul Verma', tags: ['finance'] },
        { title: 'Project Review: Portfolio Allocations', status: 'ended', scheduled_offset: -5, host: 'Rahul Verma', tags: ['finance'] },
        { title: 'Design Systems 101', status: 'ended', scheduled_offset: -3, host: 'Aditi Sharma', tags: ['design'] },
        { title: 'Sprint Planning Workshop', status: 'ended', scheduled_offset: -1, host: 'Amit Patel', tags: ['management'] },
        // UPCOMING
        { title: 'Week 2: Advanced Equity Research', status: 'scheduled', scheduled_offset: 1, host: 'Rahul Verma', tags: ['finance'] },
        { title: 'Figma Prototyping Masterclass', status: 'scheduled', scheduled_offset: 2, host: 'Aditi Sharma', tags: ['design'] },
        { title: 'Guest Lecture: AI in Finance', status: 'scheduled', scheduled_offset: 4, host: 'Dr. S. Gupta', tags: ['finance', 'ai'] },
        { title: 'Leadership in Crisis', status: 'scheduled', scheduled_offset: 7, host: 'Amit Patel', tags: ['management'] },
        { title: 'Portfolio Review & Final Presentation', status: 'scheduled', scheduled_offset: 10, host: 'Aditi Sharma', tags: ['design'] }
    ];

    const sessionsToInsert = baseSessions.map((s, i) => {
        const course = getRandom(courses);
        const startTime = new Date(Date.now() + s.scheduled_offset * 86400000);
        
        // Check if course.id is a valid UUID
      const isUuid = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
      const validCourseId = isUuid(course.id) ? course.id : null;

      return {
        title: s.title,
        course_id: validCourseId, 
        course_name: getCourseTitle(course),
        course_slug: course.slug,
          status: s.status,
          scheduled_for: startTime.toISOString(),
          host_display_name: s.host,
          host_secret: `secret_${Math.random().toString(36).substring(7)}`, 
          created_at: startTime.toISOString(),
          waiting_room_enabled: false,
          locked: false
        };
    });

    // 3. Insert data
    const { error } = await supabase.from("live_sessions").insert(sessionsToInsert);

    if (error) {
      return new Response(JSON.stringify({ error: "Insert failed: " + error.message, details: error }), { status: 500, headers: { "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ 
        message: `Seeded ${sessionsToInsert.length} sessions using courses: ${courses.map(c => getCourseTitle(c)).join(", ")}` 
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err) {
      return new Response(JSON.stringify({ error: "Unexpected error: " + String(err) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
