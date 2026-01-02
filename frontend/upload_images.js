import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function uploadImages() {
  try {
    // 1. Read .env to find credentials
    const envPath = path.join(__dirname, ".env");
    if (!fs.existsSync(envPath)) {
      console.error("❌ .env file not found!");
      process.exit(1);
    }

    const envContent = fs.readFileSync(envPath, "utf-8");
    const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.*)/);
    const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/);

    if (!urlMatch || !keyMatch) {
      console.error(
        "❌ Could not find VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env"
      );
      process.exit(1);
    }

    const supabaseUrl = urlMatch[1].trim();
    const supabaseKey = keyMatch[1].trim();

    console.log(`✅ Found credentials for: ${supabaseUrl}`);

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 2. Ensure bucket exists (Client can't create buckets usually without policies, but let's try or assume it's there)
    // We assume the SQL script ran or the user created it, OR we try to access it.
    const BUCKET = "landing_page";

    const images = [
      {
        name: "akhil.png",
        path: path.join(__dirname, "../mentor_images/akhil.png"),
      },
      {
        name: "vaibhav.png",
        path: path.join(__dirname, "../mentor_images/vaibhav.png"),
      },
    ];

    for (const img of images) {
      if (!fs.existsSync(img.path)) {
        console.error(`❌ Image not found: ${img.path}`);
        continue;
      }

      const fileBuffer = fs.readFileSync(img.path);

      // Upload
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .upload(img.name, fileBuffer, {
          contentType: "image/png",
          upsert: true,
        });

      if (error) {
        console.error(`❌ Failed to upload ${img.name}:`, error.message);
      } else {
        console.log(`✅ Uploaded ${img.name}`);
      }
    }
  } catch (err) {
    console.error("❌ Unexpected error:", err);
  }
}

uploadImages();
