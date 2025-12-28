/// <reference lib="deno.ns" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || req.headers.get("origin");
  if (origin) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Credentials": "true",
    };
  }
  return {
    "Access-Control-Allow-Origin": "http://localhost:5174",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Credentials": "true",
  };
}

serve(async (req: Request) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors as any });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { message, history, page } = await req.json();

    if (!message) {
      throw new Error("Message is required");
    }

    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
        throw new Error("Message cannot be empty");
    }

    // --- Helpers ---
    const STOPWORDS = new Set(['a', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by', 'for', 'from', 'has', 'have', 'if', 'in', 'into', 'is', 'it', 'its', 'of', 'on', 'or', 'that', 'the', 'their', 'this', 'to', 'with', 'you', 'your']);
    
    const tokenize = (text: string) => {
        if (!text) return [];
        return text.toLowerCase()
            .replace(/[^\p{L}\p{N}\s]/gu, ' ')
            .split(/\s+/u)
            .filter(token => token && !STOPWORDS.has(token));
    };

    const normalizeWhitespace = (value: string) => value.replace(/\s+/g, " ").trim();
    
    const truncate = (value: string, limit = 360) => {
        const clean = normalizeWhitespace(value);
        if (!clean) return "";
        if (clean.length <= limit) return clean;
        return `${clean.slice(0, limit).trim()}...`;
    };

    // --- Core Logic ---

    // 1. Course Recommendations Data
    const getCourseRecommendations = async () => {
        const { data: courses } = await supabaseClient
            .from('courses')
            .select('name, slug, programme, hero, stats, about_program, learn, skills, career_outcomes, tools_frameworks, details, modules, instructors');

        if (!courses || !courses.length) return 'No course data available.';

        // Formatting logic (simplified for edge)
        return courses.map(c => `**${c.name}** (${c.programme}): ${c.hero?.subtitle || ''}`).join('\n');
    };

    // 2. Knowledge Base Search (Simplified)
    // Note: Ideally, this should use pgvector embeddings for better search. 
    // For now, porting the keyword-based approach is complex without the in-memory knowledgeBase file.
    // Assuming we might eventually move knowledgeBase to a DB table. 
    // For this migration, we'll fetch 'blogs' as context.
    
    const { data: blogs } = await supabaseClient
        .from('blogs')
        .select('title, slug, category, excerpt, content')
        .order('published_at', { ascending: false })
        .limit(5);
        
    const blogContext = blogs?.map(b => `${b.title}: ${truncate(b.excerpt || b.content || '')}`).join('\n') || "";

    // 3. Build System Prompt
    const courseData = await getCourseRecommendations();
    
    const systemPrompt = `You are GradusAI, a helpful assistant for Gradus India.
    
    CONTEXT:
    ${blogContext}
    
    COURSES:
    ${courseData}
    
    Be professional, warm, and concise.`;

    // 4. Call OpenAI
    const openAiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openAiKey) {
        throw new Error("OpenAI API Key not configured");
    }

    const messages = [
        { role: "system", content: systemPrompt },
        ...(history || []).slice(-5), // Last 5 messages
        { role: "user", content: trimmedMessage }
    ];

    const openAiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openAiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.2,
      }),
    });

    const data = await openAiResponse.json();
    const reply = data.choices?.[0]?.message?.content;

    return new Response(JSON.stringify({ reply }), {
      headers: { ...cors as any, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("[chatbot] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...getCorsHeaders(req) as any, "Content-Type": "application/json" },
    });
  }
});
