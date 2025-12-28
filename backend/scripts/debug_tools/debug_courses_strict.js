const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env") });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCourses() {
  const targetSlug = "gradus-x/agentic-ai-engineering-flagship";
  console.log(`Looking for slug: '${targetSlug}'`);

  const { data, error } = await supabase
    .from("course")
    .select("id, slug")
    .eq("slug", targetSlug);

  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Found matches:", data.length);
    data.forEach((c) => console.log(`- ID: ${c.id}, Slug: '${c.slug}'`));
  }

  // Check all for similarity
  const { data: all } = await supabase.from("course").select("slug");
  console.log("\nAll slugs:");
  all.forEach((c) => {
    if (c.slug.includes("agentic")) {
      console.log(`'${c.slug}' (Length: ${c.slug.length})`);
    }
  });
}

checkCourses();
