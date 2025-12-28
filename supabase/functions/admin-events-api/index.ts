/// <reference lib="deno.ns" />
/**
 * Admin Events API Edge Function
 * Handles event CRUD operations
 */
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { verify } from "https://deno.land/x/djwt@v2.8/mod.ts";

// ============================================================================
// CORS & Helpers
// ============================================================================

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

// ============================================================================
// JWT Verification
// ============================================================================

const JWT_SECRET = Deno.env.get("JWT_SECRET") || "fallback_secret_change_me";

async function getJwtKey(): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  return await crypto.subtle.importKey(
    "raw",
    encoder.encode(JWT_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

async function verifyJwt(token: string): Promise<{ sub: string } | null> {
  try {
    const key = await getJwtKey();
    const payload = await verify(token, key);
    return payload as { sub: string };
  } catch {
    return null;
  }
}

async function verifyAdminToken(req: Request, supabase: SupabaseClient): Promise<{ admin: any; error?: string }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { admin: null, error: "No authorization header" };
  }

  const token = authHeader.split(" ")[1];
  
  const { data: supabaseUser } = await supabase.auth.getUser(token);
  
  if (supabaseUser?.user) {
    const { data: adminData } = await supabase
      .from("admin_users")
      .select("*")
      .eq("supabase_id", supabaseUser.user.id)
      .single();
    
    if (adminData) return { admin: adminData };
  }
  
  const payload = await verifyJwt(token);
  if (payload?.sub) {
    const { data: adminData } = await supabase
      .from("admin_users")
      .select("*")
      .eq("id", payload.sub)
      .single();
    
    if (adminData) return { admin: adminData };
  }

  return { admin: null, error: "Invalid token" };
}

// ============================================================================
// Event Mapping
// ============================================================================

function serializeEvent(event: any) {
  if (!event) return null;
  return {
    id: event.id,
    slug: event.slug,
    title: event.title,
    subtitle: event.subtitle || "",
    description: event.description || "",
    status: event.status || "draft",
    mode: event.mode || "online",
    featured: Boolean(event.featured),
    startDate: event.start_date,
    endDate: event.end_date,
    timezone: event.timezone || "Asia/Kolkata",
    location: event.location || {},
    speakers: event.speakers || [],
    agenda: event.agenda || [],
    registrationUrl: event.registration_url || "",
    registrationDeadline: event.registration_deadline,
    maxAttendees: event.max_attendees,
    price: event.price || 0,
    currency: event.currency || "INR",
    tags: event.tags || [],
    category: event.category || "",
    coverImage: event.cover_image || "",
    thumbnailImage: event.thumbnail_image || "",
    createdAt: event.created_at,
    updatedAt: event.updated_at,
  };
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ============================================================================
// Main Handler
// ============================================================================

serve(async (req) => {
  const cors = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const url = new URL(req.url);
    const path = url.pathname.replace(/\/$/, "");
    const pathParts = path.split("/").filter(Boolean);
    
    const funcIndex = pathParts.indexOf("admin-events-api");
    const apiPath = "/" + pathParts.slice(funcIndex + 1).join("/");

    const { admin, error: authError } = await verifyAdminToken(req, supabase);
    if (!admin) {
      return jsonResponse({ error: authError || "Unauthorized" }, 401, cors);
    }

    // ========================================================================
    // LIST EVENTS - GET /
    // ========================================================================

    if ((apiPath === "/" || apiPath === "") && req.method === "GET") {
      const { data: items, error } = await supabase
        .from("events")
        .select("*")
        .order("start_date", { ascending: false });

      if (error) {
        return jsonResponse({ error: error.message }, 500, cors);
      }

      return jsonResponse({ items: (items || []).map(serializeEvent) }, 200, cors);
    }

    // ========================================================================
    // CREATE EVENT - POST /
    // ========================================================================

    if ((apiPath === "/" || apiPath === "") && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      
      const slug = body.slug || slugify(body.title || "event");

      const payload = {
        slug,
        title: body.title,
        subtitle: body.subtitle,
        description: body.description,
        status: body.status || "draft",
        mode: body.mode || "online",
        featured: Boolean(body.featured),
        start_date: body.startDate,
        end_date: body.endDate,
        timezone: body.timezone || "Asia/Kolkata",
        location: body.location || {},
        speakers: body.speakers || [],
        agenda: body.agenda || [],
        registration_url: body.registrationUrl,
        registration_deadline: body.registrationDeadline,
        max_attendees: body.maxAttendees,
        price: body.price || 0,
        currency: body.currency || "INR",
        tags: body.tags || [],
        category: body.category,
        cover_image: body.coverImage,
        thumbnail_image: body.thumbnailImage,
      };

      const { data: event, error } = await supabase
        .from("events")
        .insert([payload])
        .select()
        .single();

      if (error) {
        return jsonResponse({ error: error.message }, 500, cors);
      }

      return jsonResponse({ event: serializeEvent(event) }, 201, cors);
    }

    // ========================================================================
    // GET EVENT - GET /:eventId
    // ========================================================================

    const idMatch = apiPath.match(/^\/([0-9a-f-]+)$/i);
    if (idMatch && req.method === "GET") {
      const eventId = idMatch[1];

      const { data: event, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single();

      if (error || !event) {
        return jsonResponse({ error: "Event not found" }, 404, cors);
      }

      return jsonResponse({ event: serializeEvent(event) }, 200, cors);
    }

    // ========================================================================
    // UPDATE EVENT - PATCH /:eventId
    // ========================================================================

    if (idMatch && req.method === "PATCH") {
      const eventId = idMatch[1];
      const body = await req.json().catch(() => ({}));

      const patch: any = {};
      if (body.title !== undefined) patch.title = body.title;
      if (body.subtitle !== undefined) patch.subtitle = body.subtitle;
      if (body.description !== undefined) patch.description = body.description;
      if (body.status !== undefined) patch.status = body.status;
      if (body.mode !== undefined) patch.mode = body.mode;
      if (body.featured !== undefined) patch.featured = Boolean(body.featured);
      if (body.startDate !== undefined) patch.start_date = body.startDate;
      if (body.endDate !== undefined) patch.end_date = body.endDate;
      if (body.timezone !== undefined) patch.timezone = body.timezone;
      if (body.location !== undefined) patch.location = body.location;
      if (body.speakers !== undefined) patch.speakers = body.speakers;
      if (body.agenda !== undefined) patch.agenda = body.agenda;
      if (body.registrationUrl !== undefined) patch.registration_url = body.registrationUrl;
      if (body.registrationDeadline !== undefined) patch.registration_deadline = body.registrationDeadline;
      if (body.maxAttendees !== undefined) patch.max_attendees = body.maxAttendees;
      if (body.price !== undefined) patch.price = body.price;
      if (body.currency !== undefined) patch.currency = body.currency;
      if (body.tags !== undefined) patch.tags = body.tags;
      if (body.category !== undefined) patch.category = body.category;
      if (body.coverImage !== undefined) patch.cover_image = body.coverImage;
      if (body.thumbnailImage !== undefined) patch.thumbnail_image = body.thumbnailImage;
      if (body.slug !== undefined) patch.slug = body.slug;

      patch.updated_at = new Date().toISOString();

      const { data: event, error } = await supabase
        .from("events")
        .update(patch)
        .eq("id", eventId)
        .select()
        .single();

      if (error) {
        return jsonResponse({ error: error.message }, 500, cors);
      }

      return jsonResponse({ event: serializeEvent(event) }, 200, cors);
    }

    // ========================================================================
    // DELETE EVENT - DELETE /:eventId
    // ========================================================================

    if (idMatch && req.method === "DELETE") {
      const eventId = idMatch[1];

      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", eventId);

      if (error) {
        return jsonResponse({ error: error.message }, 500, cors);
      }

      return jsonResponse({ message: "Deleted" }, 200, cors);
    }

    return jsonResponse({ error: "Not found", path: apiPath }, 404, cors);

  } catch (error) {
    console.error("Admin Events API Error:", error);
    return jsonResponse({ error: String(error) }, 500, getCorsHeaders(req));
  }
});
