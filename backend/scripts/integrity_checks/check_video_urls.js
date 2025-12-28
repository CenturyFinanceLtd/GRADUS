require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function check() {
  console.log("Checking Why Gradus Videos...");
  const { data: whyVideos, error: whyError } = await supabase
    .from("why_gradus_videos")
    .select("id, title, video_url, secure_url");

  if (whyError) console.error(whyError);
  else console.log(JSON.stringify(whyVideos, null, 2));

  console.log("\nChecking Expert Videos...");
  const { data: expertVideos, error: expertError } = await supabase
    .from("expert_videos")
    .select("id, title, video_url, thumbnail_url");

  if (expertError) console.error(expertError);
  else console.log(JSON.stringify(expertVideos, null, 2));
}

check();
