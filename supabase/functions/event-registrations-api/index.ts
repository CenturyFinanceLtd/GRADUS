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

async function verifyUser(req: Request, supabase: SupabaseClient): Promise<{ user: any; error?: string }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return { user: null, error: "No authorization header" };
  
  const token = authHeader.replace("Bearer ", "");
  
  // 1. Supabase Auth
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (user) return { user };
  
  // 2. Custom JWT (Legacy)
  try {
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
          "raw", 
          encoder.encode(JWT_SECRET), 
          { name: "HMAC", hash: "SHA-256" }, 
          false, 
          ["verify"]
      );
      const payload = await verify(token, key);
      // Construct a minimal user object akin to what Supabase returns
      return { user: { id: (payload as any).id || (payload as any).sub } };
  } catch (e) {
      return { user: null, error: "Invalid token" };
  }
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
        
        const { user, error } = await verifyUser(req, supabase);
        if (!user) return jsonResponse({ error: error || "Unauthorized" }, 401, cors);
        
        const userId = user.id;

        // 2. Update User Profile if needed
        // (State, City, College, etc. from form)
        // Check current profile first to avoid overwriting existing data if we want to be safe,
        // but requirement says "if valid string... update".
        // Actually requirement: "if available ... ask to fill ... added data will get store"
        // "any data which is fethed from database that can't be edited ... only new data can be add"
        
        const { data: currentProfile } = await supabase.from("users").select("*").eq("id", userId).single();
        
        console.log("[Registration] Body received:", JSON.stringify(body));
        
        if (currentProfile) {
            const updates: any = {};
            let pd = currentProfile.personal_details || {};
            if (typeof pd === 'string') {
                try { pd = JSON.parse(pd); } catch { pd = {}; }
            }
            
            let ed = currentProfile.education_details || {};
            if (typeof ed === 'string') {
                 try { ed = JSON.parse(ed); } catch { ed = {}; }
            }

            let hasUpdates = false;

            // ALWAYS update Personal Details with form values
            if (body.state) { 
                pd.state = body.state; 
                hasUpdates = true; 
            }
            if (body.city) { 
                pd.city = body.city; 
                hasUpdates = true; 
            }
            
            if (body.state || body.city) {
                updates.personal_details = pd;
            }

            // ALWAYS update Education Details with form value
            if (body.college) {
                ed.institutionName = body.college;
                updates.education_details = ed;
                hasUpdates = true;
            }
            
            // Also top level city column
            if (body.city) { 
                updates.city = body.city; 
            }

            console.log("[Registration] Updates to apply:", JSON.stringify(updates));

            if (hasUpdates) {
                console.log("[Registration] Updating user profile:", userId);
                const { error: updateError, data: updateData } = await supabase.from("users").update(updates).eq("id", userId).select();
                if (updateError) {
                    console.error("[Registration] Failed to update user profile:", updateError);
                } else {
                    console.log("[Registration] Profile updated successfully:", JSON.stringify(updateData));
                }
            } else {
                console.log("[Registration] No profile updates - no data provided in form");
            }
        } else {
            console.log("[Registration] No user profile found for userId:", userId);
        }

        // 3. Register for Event
        if (!body.eventSlug && !body.eventId) {
             return jsonResponse({ error: "Event ID or Slug required" }, 400, cors);
        }

        let eventId = body.eventId;
        if (!eventId && body.eventSlug) {
             const { data: event } = await supabase.from("events").select("id").eq("slug", body.eventSlug).single();
             if (!event) return jsonResponse({ error: "Event not found" }, 404, cors);
             eventId = event.id;
        }

        // Check existing registration
        const { data: existing } = await supabase.from("masterclass_registrations")
            .select("id")
            .eq("event_id", eventId)
            .eq("user_id", userId)
            .maybeSingle();

        if (existing) {
             return jsonResponse({ message: "Already registered", alreadyRegistered: true }, 200, cors);
        }

        const { data: newReg, error: regError } = await supabase.from("masterclass_registrations").insert([{
            event_id: eventId,
            user_id: userId,
            status: "registered"
        }]).select().single();
        if (regError) return jsonResponse({ error: regError.message }, 500, cors);
        return jsonResponse({ success: true, item: newReg }, 201, cors);
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
