const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const { Client } = require("pg");
const fs = require("fs");

const run = async () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("❌ DATABASE_URL is missing in .env");
    process.exit(1);
  }

  const client = new Client({ connectionString });

  try {
    console.log("Connecting to database...");
    await client.connect();

    const sqlPath = path.join(__dirname, "../db_performance_indexes.sql");
    const sql = fs.readFileSync(sqlPath, "utf8");

    console.log("Applying indexes...");
    // Split by statement if needed, or run as a block.
    // pg driver handles multiple statements usually if in one query call?
    // It's safer to just run the whole block for simple DDL.
    await client.query(sql);

    console.log("✅ Performance indexes applied successfully!");
  } catch (err) {
    console.error("❌ Failed to apply indexes:", err);
  } finally {
    await client.end();
  }
};

run();
