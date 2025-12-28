const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
require("dotenv").config();

const applySchema = async () => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log("Connected to PostgreSQL");

    const schemaPath = path.join(__dirname, "../db_schema_live_rooms.sql");
    const schemaSql = fs.readFileSync(schemaPath, "utf8");

    console.log("Applying schema...");
    await client.query(schemaSql);
    console.log("Schema applied successfully.");
  } catch (err) {
    console.error("Error applying schema:", err);
  } finally {
    await client.end();
  }
};

applySchema();
