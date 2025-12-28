const supabase = require("./src/config/supabase");

const inspectTable = async () => {
  console.log("Inspecting site_visits table...");
  // Try to select one row with all columns to see what we get
  const { data, error } = await supabase
    .from("site_visits")
    .select("*")
    .limit(1);

  if (error) {
    console.error("Error fetching site_visits:", error);
    return;
  }

  if (data && data.length > 0) {
    console.log("Columns found:", Object.keys(data[0]));
    console.log("Sample Data:", data[0]);
  } else {
    console.log("No data found, cannot infer columns easily via select *.");
    // Try inserting a dummy row to check constraints? No, bad idea.
  }
};

inspectTable();
