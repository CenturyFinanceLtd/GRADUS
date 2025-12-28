const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
require("dotenv").config();

const applyPermissionsSchema = async () => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log("Connected to PostgreSQL");

    const schemaPath = path.join(__dirname, "../db_schema_permissions.sql");
    const schemaSql = fs.readFileSync(schemaPath, "utf8");

    console.log("Applying db_schema_permissions.sql...");
    await client.query(schemaSql);
    console.log("Permissions schema applied successfully.");
  } catch (err) {
    console.error("Error applying permissions schema:", err);
  } finally {
    await client.end();
  }
};

applyPermissionsSchema();
