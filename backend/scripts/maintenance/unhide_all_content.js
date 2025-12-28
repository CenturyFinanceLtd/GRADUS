const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function unhideAll() {
  console.log("Unhiding content...");

  // Banners (is_active, order)
  const { error: err1 } = await supabase
    .from("banners")
    .update({ is_active: true })
    .neq("is_active", true);
  if (err1) console.error("Banners error:", err1.message);
  else console.log("✅ Banners unhidden");

  // Why Gradus Videos (is_active)
  const { error: err2 } = await supabase
    .from("why_gradus_videos")
    .update({ is_active: true })
    .neq("is_active", true);
  if (err2) console.error("Why Gradus error:", err2.message);
  else console.log("✅ Why Gradus Videos unhidden");

  // Expert Videos (is_active)
  const { error: err3 } = await supabase
    .from("expert_videos")
    .update({ is_active: true })
    .neq("is_active", true);
  if (err3) console.error("Expert Videos error:", err3.message);
  else console.log("✅ Expert Videos unhidden");

  // Testimonial Videos (is_active)
  const { error: err4 } = await supabase
    .from("testimonial_videos")
    .update({ is_active: true })
    .neq("is_active", true);
  if (err4) console.error("Testimonials error:", err4.message);
  else console.log("✅ Testimonials unhidden");

  // Gallery Items (is_visible)
  const { error: err5 } = await supabase
    .from("gallery_items")
    .update({ is_visible: true })
    .neq("is_visible", true);
  if (err5) console.error("Gallery Items error:", err5.message);
  else console.log("✅ Gallery Items unhidden");

  // Partner Logos (is_active)
  const { error: err6 } = await supabase
    .from("partner_logos")
    .update({ is_active: true })
    .neq("is_active", true);
  if (err6) console.error("Partner Logos error:", err6.message);
  else console.log("✅ Partner Logos unhidden");

  console.log("Done.");
}

unhideAll();
