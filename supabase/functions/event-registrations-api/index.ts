/// <reference lib="deno.ns" />

/**
 * Event Registrations API Edge Function
 * Handles Public Registration and Admin Management
 */
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { verify } from "https://deno.land/x/djwt@v2.8/mod.ts";

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || req.headers.get("origin");
  const allowedOrigin = origin || "http://localhost:5173"; 

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Credentials": "true",
  };
}

function jsonResponse(data: any, status = 200, cors: any) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

const JWT_SECRET = Deno.env.get("JWT_SECRET") || "fallback_secret_change_me";

async function verifyAdminToken(req: Request, supabase: SupabaseClient): Promise<{ admin: any; error?: string }> {
  /* ... simplified ... */
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return { admin: null, error: "No authorization header" };
  const token = authHeader.split(" ")[1];
  const { data: supabaseUser } = await supabase.auth.getUser(token);
  if (supabaseUser?.user) {
    const { data: adminData } = await supabase.from("admin_users").select("*").eq("supabase_id", supabaseUser.user.id).single();
    if (adminData) return { admin: adminData };
  }
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(JWT_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  try {
    const payload = await verify(token, key);
    if ((payload as any)?.sub) {
      const { data: adminData } = await supabase.from("admin_users").select("*").eq("id", (payload as any).sub).single();
      if (adminData) return { admin: adminData };
    }
  } catch {}
  return { admin: null, error: "Invalid token" };
}

serve(async (req: Request) => {
  const cors = getCorsHeaders(req) as any;
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const url = new URL(req.url);
    const path = url.pathname.replace(/\/$/, "");
    const pathParts = path.split("/").filter(Boolean);
    const funcIndex = pathParts.indexOf("event-registrations-api");
    const apiPath = "/" + pathParts.slice(funcIndex + 1).join("/");

    // GET / - Admin List
    if ((apiPath === "/" || apiPath === "") && req.method === "GET") {
        const { admin } = await verifyAdminToken(req, supabase);
        if (!admin) return jsonResponse({ error: "Unauthorized" }, 401, cors);
        
        const search = url.searchParams.get("search");
        let query = supabase.from("event_registrations").select("*");
        if (search) query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
        
        const { data, error } = await query.order("created_at", { ascending: false });
        if (error) return jsonResponse({ error: error.message }, 500, cors);
        return jsonResponse({ items: data }, 200, cors);
    }
    
    // POST / - Public Register
    if ((apiPath === "/" || apiPath === "") && req.method === "POST") {
        const body = await req.json().catch(() => ({}));
        const { data, error } = await supabase.from("event_registrations").insert([{
            event_slug: body.eventSlug,
            first_name: body.firstName,
            last_name: body.lastName,
            email: body.email,
            phone: body.phone,
            city: body.city,
            occupation: body.occupation,
            status: "registered"
        }]).select().single();
        if (error) return jsonResponse({ error: error.message }, 500, cors);
        return jsonResponse({ success: true, item: data }, 201, cors);
    }
    
    // POST /send-join-link ... etc (Admin) - Placeholder
    if (apiPath.includes("/send-join-link") && req.method === "POST") {
         const { admin } = await verifyAdminToken(req, supabase);
         if (!admin) return jsonResponse({ error: "Unauthorized" }, 401, cors);
         return jsonResponse({ message: "Emails mocked: Sent join link" }, 200, cors);
    }

    // GET /:id
    const idMatch = apiPath.match(/^\/([0-9a-f-]+)$/i);
    if (idMatch && req.method === "GET") {
        const { admin } = await verifyAdminToken(req, supabase);
        if (!admin) return jsonResponse({ error: "Unauthorized" }, 401, cors);
        const { data } = await supabase.from("event_registrations").select("*").eq("id", idMatch[1]).single();
        return jsonResponse({ item: data }, 200, cors);
    }

    return jsonResponse({ error: "Not found" }, 404, cors);

  } catch (error) {
    return jsonResponse({ error: String(error) }, 500, getCorsHeaders(req));
  }
});
