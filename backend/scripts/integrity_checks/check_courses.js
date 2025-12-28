const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkCourses() {
  const { data: courses, error } = await supabase
    .from("courses")
    .select("id, name, is_visible");
  if (error) {
    console.error(error);
    return;
  }
  console.log(`Total courses: ${courses.length}`);
  console.log(
    "Visible courses:",
    courses.filter((c) => c.is_visible).map((c) => c.name)
  );
  console.log(
    "Hidden courses:",
    courses.filter((c) => !c.is_visible).map((c) => c.name)
  );
}

checkCourses();
