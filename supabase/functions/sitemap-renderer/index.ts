/// <reference lib="deno.ns" />
import { createClient } from "npm:@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req: Request) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch all blogs
    const { data: blogs, error } = await supabase
      .from("blogs")
      .select("slug, updated_at")
      .order("updated_at", { ascending: false });

    if (error) throw error;

    const baseUrl = "https://gradusindia.in";
    const lastMod = new Date().toISOString().split("T")[0];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`;

    if (blogs) {
      blogs.forEach((blog: any) => {
        const date = blog.updated_at ? new Date(blog.updated_at).toISOString().split("T")[0] : lastMod;
        xml += `
  <url>
    <loc>${baseUrl}/blog/${blog.slug}</loc>
    <lastmod>${date}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
      });
    }

    xml += `
</urlset>`;

    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": "public, max-age=3600, s-maxage=3600", 
      },
    });

  } catch (error) {
    return new Response((error as any).message, { status: 500 });
  }
});
