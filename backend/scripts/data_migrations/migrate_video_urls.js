require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function migrate() {
  console.log("Migrating Why Gradus Videos...");
  const { data: whyVideos, error: whyError } = await supabase
    .from("why_gradus_videos")
    .select("id, secure_url, video_url");

  if (whyError) console.error(whyError);
  else {
    for (const v of whyVideos) {
      if (!v.video_url && v.secure_url) {
        console.log(`Updating Why Gradus ${v.id}...`);
        await supabase
          .from("why_gradus_videos")
          .update({ video_url: v.secure_url })
          .eq("id", v.id);
      }
    }
  }

  // Expert videos usually have video_url but let's check
  console.log("Migrating Expert Videos...");
  // Expert videos schema might not have secure_url column?
  // Let's check if they have it. If not, we can't migrate easily unless it's in a JSON column or we re-upload.
  // But wait, the previous `expert-videos` curl output returned "playbackUrl": "https://placeholder.com" in one case?
  // The user script output for Expert Videos showed:
  // [ { "id": "...", "title": "Expert VIdeo", "video_url": "https://placeholder.com", ... } ]
  // So expert videos HAVE video_url.
  // But Why Gradus showed: "video_url": null, "secure_url": "..." in my imagination (need to verify `check_video_urls.js` output).
}

migrate();
