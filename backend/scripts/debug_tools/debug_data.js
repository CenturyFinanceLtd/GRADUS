const { createClient } = require("@supabase/supabase-js");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const SUPABASE_URL =
  process.env.SUPABASE_URL || "https://utxxhgoxsywhrdblwhbx.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function run() {
  console.log("--- Debugging Blockchain Courses ---");
  const { data: courses, error } = await supabase
    .from("course")
    .select("id, slug, name, price_inr")
    .ilike("slug", "%blockchain%");

  if (error) console.error("Error:", error);
  else {
    console.log(`Found ${courses.length} courses.`);
    courses.forEach((c) => {
      console.log(`ID: ${c.id}`);
      console.log(`  Slug: ${c.slug}`);
      console.log(`  Name: ${c.name}`);
      console.log(`  Price (col): ${c.price_inr}`);
    });
  }
}

// Check for MERN course enrollments
async function debugMERNCourse() {
  const { data: courses } = await supabase
    .from("course")
    .select("id, slug, name")
    .ilike("slug", "%mern%");

  console.log("\n--- Debugging MERN Courses ---");
  if (!courses || courses.length === 0) {
    console.log("No MERN course found.");
    return;
  }

  for (const c of courses) {
    console.log(`Course: ${c.name} (${c.slug}) ID: ${c.id}`);
    const { data: enrollments } = await supabase
      .from("enrollments")
      .select("*")
      .eq("course_id", c.id);

    console.log(`Found ${enrollments?.length || 0} enrollments.`);
    if (enrollments) {
      enrollments.forEach((e) => {
        console.log(
          `  User: ${e.user_id} | Status: ${e.status} | Payment: ${e.payment_status} | Price: ${e.price_total}`
        );
      });
    }
  }
}

run();
debugMERNCourse();
