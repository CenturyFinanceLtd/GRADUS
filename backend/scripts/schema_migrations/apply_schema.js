require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { disable: false, rejectUnauthorized: false },
});

const runSchema = async () => {
  try {
    await client.connect();
    console.log("✅ Connected to PostgreSQL");

    const files = [
      "db_schema.sql",
      "db_schema_batch_2.sql",
      "db_schema_final_batch.sql",
      "db_schema_supplemental.sql",
      "db_schema_supplemental_new.sql",
      "db_schema_fix_frontend.sql", // Added
      "db_schema_add_ordering.sql",
    ];

    for (const file of files) {
      const filePath = path.join(__dirname, "..", file);
      if (fs.existsSync(filePath)) {
        console.log(`📄 Executing ${file}...`);
        const sql = fs.readFileSync(filePath, "utf8");
        try {
          await client.query(sql);
          console.log(`✅ Applied ${file}`);
        } catch (sqlErr) {
          console.error(`❌ Error in ${file}:`, sqlErr.message);
        }
      } else {
        console.warn(`⚠️ File ${file} not found.`);
      }
    }

    console.log("✨ All Schema Scripts Executed.");
  } catch (err) {
    console.error("❌ Connection Error:", err);
  } finally {
    await client.end();
  }
};

runSchema();
