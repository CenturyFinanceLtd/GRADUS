/// <reference lib="deno.ns" />
import { createClient } from "jsr:@supabase/supabase-js@2";

const getCorsHeaders = (req: Request) => {
  const origin = req.headers.get("Origin");
  const allowedOrigin = origin || "http://localhost:5173"; 

  // NOTE: credentials: "true" requires explicit origin, not wildcard.
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Credentials": "true",
  };
};

Deno.serve(async (req) => {
  // Handle CORS for OPTIONS requests explicitly and early
  if (req.method === "OPTIONS") {
     return new Response("ok", { headers: getCorsHeaders(req) });
  }

  const cors = getCorsHeaders(req);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseKey) {
        throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    if (req.method === "POST") {
      const body = await req.json();
      
      const { data, error } = await supabase
        .from("landing_page_registrations")
        .insert([body])
        .select()
        .single();
      
      if (error) {
           console.error("Insert Error:", error);
           throw error;
      }
      return new Response(JSON.stringify(data), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: cors });

  } catch (error) {
    console.error("Function Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: cors });
  }
});
