const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkWhy() {
  const { data, error } = await supabase.from("why_gradus_videos").select("*");
  if (error) console.log(error);
  else console.log(JSON.stringify(data, null, 2));
}

checkWhy();
