const fs = require("fs");
const { Client } = require("pg");
require("dotenv").config();

async function runSql() {
  if (!process.env.DATABASE_URL) {
    console.error("No DATABASE_URL in .env, cannot apply SQL automatically.");
    return;
  }
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const sql = fs.readFileSync("db_schema_auth.sql", "utf8");
  try {
    await client.query(sql);
    console.log("Applied db_schema_auth.sql successfully.");
  } catch (e) {
    console.error(e);
  } finally {
    await client.end();
  }
}

runSql();
