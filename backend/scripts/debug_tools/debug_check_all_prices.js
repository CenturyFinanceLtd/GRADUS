const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "frontend", ".env") });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkPrices() {
  console.log("Checking all course prices...");
  const { data, error } = await supabase
    .from("courses")
    .select("id, name, slug, price, price_inr, is_free");

  if (error) {
    console.error("Error:", error);
    return;
  }

  data.forEach((c) => {
    console.log(`Course: ${c.name} (${c.slug})`);
    console.log(`  price: ${c.price}`);
    console.log(`  price_inr: ${c.price_inr}`);
    console.log(`  is_free: ${c.is_free}`);
  });
}

checkPrices().catch(console.error);
