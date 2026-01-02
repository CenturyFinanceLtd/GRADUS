/// <reference lib="deno.ns" />
import { createClient } from "npm:@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";



const getCorsHeaders = (req: Request) => {
  const origin = req.headers.get("Origin") || req.headers.get("origin");
  const allowedOrigin = origin || "http://localhost:5173"; 

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Credentials": "true",
  };
};

serve(async (req: Request) => {
  const cors = getCorsHeaders(req) as any;
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.replace(/\/$/, ""); 
    const segments = path.split("/").filter(Boolean);
    const routeParts = segments.slice(1); // args

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const resource = routeParts[0];

    // 1. Banners: GET /banners
    if (req.method === "GET" && resource === "banners") {
      const { data, error } = await supabase
        .from("banners")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      
      if (error) throw error;
      return new Response(JSON.stringify({ items: (data || []).map(mapBanner) }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // 2. Why Gradus Video: GET /why-gradus-video
    if (req.method === "GET" && resource === "why-gradus-video") {
      const { data, error } = await supabase
        .from("why_gradus_videos")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return new Response(JSON.stringify({ item: data ? mapWhyGradusVideo(data) : null }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // 3. Partners: GET /partners
    if (req.method === "GET" && resource === "partners") {
      const { data, error } = await supabase
        .from("partner_logos")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return new Response(JSON.stringify({ items: (data || []).map(mapPartner) }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // 4. Testimonials: GET /testimonials
    if (req.method === "GET" && resource === "testimonials") {
      const { data, error } = await supabase
        .from("testimonials")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return new Response(JSON.stringify({ items: (data || []).map(mapTestimonial) }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // 5. Expert Videos: GET /expert-videos
    if (req.method === "GET" && resource === "expert-videos") {
      const { data, error } = await supabase
        .from("expert_videos")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return new Response(JSON.stringify({ items: (data || []).map(mapExpertVideo) }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // 6. Contact Inquiries: POST /inquiries
    if (req.method === "POST" && resource === "inquiries") {
      const body = await req.json();
      const { data, error } = await supabase
        .from("contact_inquiries")
        .insert([body])
        .select()
        .single();
      
      if (error) throw error;
      return new Response(JSON.stringify(data), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // 7. Event Registrations: POST /event-registrations
    if (req.method === "POST" && resource === "event-registrations") {
      const body = await req.json();
      const { data, error } = await supabase
        .from("event_registrations")
        .insert([body])
        .select()
        .single();
      
      if (error) throw error;
      return new Response(JSON.stringify(data), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // 8. Gallery: GET /gallery
    if (req.method === "GET" && resource === "gallery") {
      const category = url.searchParams.get("category");
      const limit = url.searchParams.get("limit");

      let query = supabase.from("gallery_items").select("*").eq("is_active", true);
      if (category) query = query.eq("category", category);
      query = query.order("created_at", { ascending: false });
      if (limit) query = query.limit(parseInt(limit, 10));

      const { data, error } = await query;
      if (error) throw error;

      return new Response(JSON.stringify({
        success: true,
        count: data.length,
        items: (data || []).map(mapGalleryItem)
      }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // 9. Landing Pages: GET /landing-pages/:slug OR /landing-pages/:id
    if (req.method === "GET" && resource === "landing-pages" && routeParts[1]) {
      const param = routeParts[1];
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(param);

      let query = supabase.from("landing_pages").select("*");
      if (isUuid) {
        query = query.eq("id", param);
      } else {
        query = query.eq("slug", param);
      }

      const { data, error } = await query.single();
      
      if (error || !data) return new Response(JSON.stringify({ message: "Landing page not found" }), { status: 404, headers: cors });
      return new Response(JSON.stringify(mapLandingPage(data)), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // 10. List Landing Pages (minimal): GET /landing-pages
    if (req.method === "GET" && resource === "landing-pages") {
      const { data, error } = await supabase
        .from("landing_pages")
        .select("id, slug, created_at, updated_at")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return new Response(JSON.stringify((data || []).map(row => ({
        _id: row.id,
        id: row.id,
        slug: row.slug,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }))), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Not found", resource }), { status: 404, headers: cors });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: cors });
  }
});

// Mappers
const mapBanner = (doc: any) => ({
  id: doc.id,
  title: doc.title || "",
  subtitle: doc.subtitle || "",
  description: doc.description || "",
  ctaLabel: doc.cta_label || "",
  ctaUrl: doc.cta_url || "",
  active: Boolean(doc.is_active),
  order: doc.sort_order || 0,
  imageUrl: doc.image_url,
  desktopImageUrl: doc.image_url,
  mobileImageUrl: doc.mobile_image_url || "",
});

const mapWhyGradusVideo = (doc: any) => {
  const videoUrl = doc.video_url || "";
  return {
    id: doc.id,
    title: doc.title,
    subtitle: doc.subtitle,
    description: doc.description,
    ctaLabel: doc.cta_label,
    ctaHref: doc.cta_href,
    playbackUrl: videoUrl,
    videoUrl: videoUrl,
    secureUrl: videoUrl,
    thumbnailUrl: doc.thumbnail_url,
    duration: doc.duration,
    active: Boolean(doc.is_active),
    order: doc.sort_order,
  };
};

const mapPartner = (doc: any) => ({
  id: doc.id,
  name: doc.name || "",
  website: doc.website_url || "",
  programs: Array.isArray(doc.programs) ? doc.programs : [],
  active: Boolean(doc.is_active),
  order: doc.sort_order || 0,
  logoUrl: doc.logo_url,
});

const mapTestimonial = (doc: any) => {
  const videoUrl = doc.video_url || "";
  return {
    id: doc.id,
    name: doc.name,
    role: doc.role,
    company: doc.company,
    quote: doc.quote,
    playbackUrl: videoUrl,
    videoUrl: videoUrl,
    secureUrl: videoUrl,
    thumbnailUrl: doc.image_url,
    active: true,
    order: doc.sort_order,
    isFeatured: doc.featured,
  };
};

const mapExpertVideo = (doc: any) => {
  const videoUrl = doc.video_url || "";
  return {
    id: doc.id,
    title: doc.title,
    subtitle: doc.subtitle,
    description: doc.description,
    order: doc.sort_order,
    active: doc.is_active,
    playbackUrl: videoUrl,
    videoUrl: videoUrl,
    secureUrl: videoUrl,
    thumbnailUrl: doc.thumbnail_url,
    duration: doc.duration,
  };
};

const mapGalleryItem = (item: any) => ({
  id: item.id,
  title: item.title,
  category: item.category,
  imageUrl: item.image_url,
  publicId: item.public_id,
  isActive: item.is_active,
  createdAt: item.created_at,
});

const mapLandingPage = (row: any) => ({
  _id: row.id,
  id: row.id,
  slug: row.slug,
  title: row.title,
  hero: row.hero || {},
  middleSection: row.middle_section || {},
  mentor: row.mentor || {},
  certificate: row.certificate || {},
  faq: row.faq || [],
  stickyFooter: row.sticky_footer || {},
  metaTitle: row.meta_title,
  metaDescription: row.meta_description,
  isPublished: row.is_published,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});
