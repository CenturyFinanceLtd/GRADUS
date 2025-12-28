const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
require("dotenv").config();

const applyNotificationSchema = async () => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log("Connected to PostgreSQL");

    const schemaPath = path.join(__dirname, "../db_schema_notifications.sql");
    const schemaSql = fs.readFileSync(schemaPath, "utf8");

    console.log("Applying db_schema_notifications.sql...");
    await client.query(schemaSql);
    console.log("Notifications schema applied successfully.");
  } catch (err) {
    console.error("Error applying notification schema:", err);
  } finally {
    await client.end();
  }
};

applyNotificationSchema();
