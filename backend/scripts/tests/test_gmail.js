/*
  Minimal script to test Gmail Delegation
  Usage: node scripts/test_gmail.js <mailbox_email>
*/
require("dotenv").config();
const { google } = require("googleapis");

const GMAIL_SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];

async function testDelegation() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!clientEmail || !privateKey) {
    console.error("❌ Missing credentials in .env");
    return;
  }

  // Get first mailbox from args or env
  const mailbox =
    process.argv[2] ||
    (process.env.ADMIN_GMAIL_INBOXES
      ? process.env.ADMIN_GMAIL_INBOXES.split(",")[0].trim()
      : null);

  if (!mailbox) {
    console.error(
      "❌ No mailbox email provided. Usage: node scripts/test_gmail.js <email>"
    );
    return;
  }

  console.log(`Testing delegation for: ${clientEmail} -> ${mailbox}`);

  try {
    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey.replace(/\\n/g, "\n"),
      scopes: GMAIL_SCOPES,
      subject: mailbox,
    });

    await auth.authorize();
    console.log(
      "✅ OAuth2 Client created (Note: Delegation is only checked on API call)"
    );

    const gmail = google.gmail({ version: "v1", auth });

    console.log("Attempting to list messages...");
    const res = await gmail.users.messages.list({
      userId: "me",
      maxResults: 1,
    });

    console.log("✅ Success! Found messages:", res.data.resultSizeEstimate);
  } catch (error) {
    console.error("\n❌ FAILED:");
    console.error(error.message);
    if (error.response) {
      console.error(JSON.stringify(error.response.data, null, 2));
    }
  }
}

testDelegation();
