require("dotenv").config();
const {
  getTemplateByKey,
  upsertTemplate,
} = require("../src/services/adminEmailTemplateService");
const templateDefinitions = require("../src/data/emailTemplateDefinitions");
const supabase = require("../src/config/supabase");

async function seedTemplates() {
  console.log("Starting Email Template Seeding...");

  try {
    const keys = Object.keys(templateDefinitions);
    console.log(`Found ${keys.length} definitions: ${keys.join(", ")}`);

    for (const key of keys) {
      const def = templateDefinitions[key];
      const existing = await getTemplateByKey(key);

      if (existing) {
        console.log(`[SKIP] Template '${key}' already exists.`);
      } else {
        console.log(`[INSERT] Creating template '${key}'...`);
        await upsertTemplate(key, {
          name: def.name,
          description: def.description,
          subject: def.subject,
          html: def.html,
          text: def.text,
          variables: def.variables,
          updatedBy: null, // System seed
        });
        console.log(`   > Created.`);
      }
    }

    console.log("Seeding Complete.");
  } catch (err) {
    console.error("SEED FAILED:", err);
    process.exit(1);
  }
}

seedTemplates();
