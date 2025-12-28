const mongoose = require("mongoose");
const { createClient } = require("@supabase/supabase-js");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const MONGODB_URI = process.env.MONGODB_URI;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!MONGODB_URI) {
  console.error("Missing MONGODB_URI in .env");
  process.exit(1);
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing SUPABASE credentials in .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Define schema directly to avoid requiring the full app
const pageMetaSchema = new mongoose.Schema({
  path: String,
  title: String,
  description: String,
  keywords: String,
  robots: String,
  active: Boolean,
  isDefault: Boolean,
  image: String, // Might have image field?
  createdAt: Date,
  updatedAt: Date,
});

const PageMeta = mongoose.model("PageMeta", pageMetaSchema, "pagemetas");

const migrate = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    const docs = await PageMeta.find({});
    console.log(`Found ${docs.length} PageMeta documents in MongoDB`);

    let processed = 0;
    let errors = 0;

    for (const doc of docs) {
      // FIX: keywords must be array for Supabase (text[]), but source is comma-separated string
      const keywordsArray = doc.keywords
        ? String(doc.keywords)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

      const payload = {
        title: doc.title,
        description: doc.description,
        keywords: keywordsArray,
        robots: doc.robots,
        is_active: doc.active !== false,
        is_default: Boolean(doc.isDefault),
        created_at: doc.createdAt,
        updated_at: doc.updatedAt,
        page_path: null, // Will be set below
      };

      // Only add path if not default, per controller logic
      if (!doc.isDefault) {
        if (doc.path) {
          payload.path = doc.path;
          payload.page_path = doc.path;
        } else {
          console.warn(`Skipping non-default doc without path: ${doc._id}`);
          continue;
        }
      } else {
        // It's default
        payload.path = null;
        payload.page_path = "/"; // Default meta usually corresponds to root or fallback

        // Check if default already exists in Supabase to avoid conflict
        const { data: existingDef } = await supabase
          .from("page_metas")
          .select("id")
          .eq("is_default", true)
          .single();

        if (existingDef) {
          console.log("Updating existing default meta...");
          const { error: updateErr } = await supabase
            .from("page_metas")
            .update(payload)
            .eq("id", existingDef.id);
          if (updateErr) console.error("Error updating default:", updateErr);
          else processed++;
          continue;
        }
      }

      // Check if path exists for non-default
      if (!doc.isDefault && payload.path) {
        const { data: existingPath } = await supabase
          .from("page_metas")
          .select("id")
          .eq("path", payload.path)
          .single();
        if (existingPath) {
          console.log(`Updating existing meta for path: ${payload.path}`);
          const { error: updateErr } = await supabase
            .from("page_metas")
            .update(payload)
            .eq("id", existingPath.id);
          if (updateErr)
            console.error(`Error updating ${payload.path}:`, updateErr);
          else processed++;
          continue;
        }
      }

      const { error } = await supabase.from("page_metas").insert([payload]);

      if (error) {
        console.error(`Error migrating doc ${doc._id}: ${error.message}`);
        errors++;
      } else {
        processed++;
      }
    }

    console.log(
      `Migration complete. Processed: ${processed}, Errors: ${errors}`
    );
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await mongoose.disconnect();
  }
};

migrate();
