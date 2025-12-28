const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const applySchema = async () => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log("Connected to PostgreSQL Supabase DB");

    const schemaPath = path.join(
      __dirname,
      "../db_schema_progress_deduplicate.sql"
    );
    const schemaSql = fs.readFileSync(schemaPath, "utf8");

    console.log("Applying Course Progress deduplication and constraint...");
    await client.query(schemaSql);
    console.log("Course Progress deduplication applied successfully.");
  } catch (err) {
    console.error("Error applying schema:", err);
  } finally {
    await client.end();
  }
};

applySchema();
