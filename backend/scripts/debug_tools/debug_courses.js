const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env") });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCourses() {
  console.log("Fetching courses...");
  const { data, error } = await supabase
    .from("course")
    .select("id, name, slug");

  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Courses found:", data.length);
    data.forEach((c) => console.log(`- ${c.slug} (${c.name})`));
  }
}

checkCourses();
