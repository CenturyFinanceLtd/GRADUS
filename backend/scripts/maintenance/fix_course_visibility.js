const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function fixCourses() {
  const { error } = await supabase
    .from("courses")
    .update({ is_visible: true })
    .neq("is_visible", true); // Only update necessary

  if (error) {
    console.error("Error updating courses:", error);
  } else {
    console.log("✅ All courses set to is_visible = true");
  }
}

fixCourses();
