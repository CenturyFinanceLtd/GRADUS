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

async function checkSchema() {
  console.log("Checking columns for 'users'...");
  const { data: usersData, error: usersError } = await supabase
    .from("users")
    .select("*")
    .limit(1);

  if (usersError) {
    console.error("Error fetching users:", usersError);
  } else {
    console.log(
      "Users columns found:",
      usersData && usersData.length > 0
        ? Object.keys(usersData[0])
        : "No rows found (cant determine columns)"
    );
  }

  console.log("\nChecking columns for 'enrollments'...");
  const { data: enrollData, error: enrollError } = await supabase
    .from("enrollments")
    .select("*")
    .limit(1);

  if (enrollError) {
    console.error("Error fetching enrollments:", enrollError);
  } else {
    console.log(
      "Enrollments columns found:",
      enrollData && enrollData.length > 0
        ? Object.keys(enrollData[0])
        : "No rows found"
    );
  }

  // Test the problematic query
  console.log("\nTesting join query...");
  const { data: testData, error: testError } = await supabase
    .from("enrollments")
    .select("id, users!inner(id), course:course!inner(id)")
    .limit(1);

  if (testError) {
    console.error("Join Query Error:", testError);
  } else {
    console.log("Join Query Success:", testData?.length);
  }
}

checkSchema();
