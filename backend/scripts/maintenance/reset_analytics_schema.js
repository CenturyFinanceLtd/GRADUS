const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
require("dotenv").config();

const resetAnalyticsSchema = async () => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log("Connected to PostgreSQL");

    // DROP statement
    console.log("Dropping existing site_visits table...");
    await client.query("DROP TABLE IF EXISTS public.site_visits CASCADE;");

    // Apply schema
    const schemaPath = path.join(__dirname, "../db_schema_analytics.sql");
    const schemaSql = fs.readFileSync(schemaPath, "utf8");

    console.log("Applying db_schema_analytics.sql...");
    await client.query(schemaSql);
    console.log("Analytics schema applied successfully.");
  } catch (err) {
    console.error("Error resetting analytics schema:", err);
  } finally {
    await client.end();
  }
};

resetAnalyticsSchema();
