/// <reference lib="deno.ns" />
/**
 * Admin Email Templates API Edge Function
 * Handles transactional email templates
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

// Hardcoded definitions since we cannot import from other files easily in Edge Functions without deno.land URL
const TEMPLATE_DEFINITIONS: Record<string, any> = {
  "welcome_email": { key: "welcome_email", name: "Welcome Email", variables: [{ token: "{{name}}" }] },
  "reset_password": { key: "reset_password", name: "Reset Password", variables: [{ token: "{{link}}" }] },
  // Add others as needed or fetch dynamically
};

serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const url = new URL(req.url);
    const path = url.pathname.replace(/\/$/, "");
    const pathParts = path.split("/").filter(Boolean);
    const funcIndex = pathParts.indexOf("admin-email-templates-api");
    const apiPath = "/" + pathParts.slice(funcIndex + 1).join("/");

    const { admin, error: authError } = await verifyAdminToken(req, supabase);
    if (!admin) return jsonResponse({ error: authError || "Unauthorized" }, 401, cors);

    // GET / - List
    if ((apiPath === "/" || apiPath === "") && req.method === "GET") {
        const { data: records } = await supabase.from("email_templates").select("*");
        const items = Object.values(TEMPLATE_DEFINITIONS).map(def => {
            const rec = records?.find((r: any) => r.key === def.key);
            return {
               key: def.key,
               name: def.name,
               isCustomized: !!rec,
               updatedAt: rec?.updated_at
            };
        });
        return jsonResponse({ items }, 200, cors);
    }
    
    // GET /:key
    const keyMatch = apiPath.match(/^\/([\w_]+)$/);
    if (keyMatch && req.method === "GET") {
        const key = keyMatch[1];
        const { data: record } = await supabase.from("email_templates").select("*").eq("key", key).single();
        const def = TEMPLATE_DEFINITIONS[key];
        // If def missing, we might still return record if it exists
        return jsonResponse({ item: {
           key,
           subject: record?.subject || "",
           html: record?.html || "",
           text: record?.text || ""
        }}, 200, cors);
    }

    // PUT /:key
    if (keyMatch && req.method === "PUT") {
        const key = keyMatch[1];
        const { subject, html, text } = await req.json().catch(() => ({}));
        
        const { data, error } = await supabase.from("email_templates").upsert({
           key,
           subject,
           html,
           text,
           updated_by: admin.id,
           updated_at: new Date().toISOString()
        }, { onConflict: "key" }).select().single();
        
        if (error) return jsonResponse({ error: error.message }, 500, cors);
        return jsonResponse({ message: "Saved", item: data }, 200, cors);
    }

    return jsonResponse({ error: "Not found" }, 404, cors);

  } catch (error) {
    return jsonResponse({ error: String(error) }, 500, getCorsHeaders(req));
  }
});
