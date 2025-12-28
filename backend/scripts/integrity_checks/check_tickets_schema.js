const { Client } = require("pg");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function checkTickets() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log("Checking tickets table...");
    const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'tickets'
      ORDER BY ordinal_position;
    `);
    console.log("Tickets columns:", JSON.stringify(res.rows, null, 2));

    console.log("Checking ticket_messages table...");
    const res2 = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'ticket_messages'
      ORDER BY ordinal_position;
    `);
    console.log("Ticket Messages columns:", JSON.stringify(res2.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

checkTickets();
