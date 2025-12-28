const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env") });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Error: SUPABASE_URL and SUPABASE_SERVICE_KEY are required.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTestimonials() {
  console.log("Checking testimonials table for image_url...");

  const { data: list, error } = await supabase
    .from("testimonials")
    .select("name, image_url, video_url");

  if (error) {
    console.error("Error selecting from testimonials:", error);
  } else {
    console.log("Success. Found", list.length, "entries.");
    list.forEach((item) => {
      console.log(
        `Name: ${item.name}, Image: ${
          item.image_url ? item.image_url.substring(0, 50) + "..." : "NULL"
        }, Video: ${item.video_url ? "Present" : "NULL"}`
      );
    });
  }
}

checkTestimonials();
