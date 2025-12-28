require("dotenv").config();
const {
  listMailboxSummaries,
  listMessagesForAccount,
} = require("../src/services/gmailWorkspaceService");

async function testGmailRead() {
  console.log("Starting Gmail Read Verification...");

  // Check if env vars are loaded
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
    console.error("FAIL: GOOGLE_SERVICE_ACCOUNT_EMAIL is missing.");
    return;
  }

  try {
    console.log("1. Listing Mailbox Summaries...");
    const mailboxes = await listMailboxSummaries();
    console.log(`Found ${mailboxes.length} mailboxes.`);

    if (mailboxes.length === 0) {
      console.warn(
        "No mailboxes configured in config/env.js (or implicit default)."
      );
    }

    for (const mb of mailboxes) {
      console.log(`\nTesting Mailbox: ${mb.email} (${mb.status})`);
      if (mb.status === "error") {
        console.error(` - Error: ${mb.error}`);
        continue;
      }

      console.log("   - Labels loaded:", mb.labels ? mb.labels.length : 0);

      // Try listing messages
      console.log(`2. Listing Messages for ${mb.email}...`);
      try {
        const msgs = await listMessagesForAccount({
          accountEmail: mb.email,
          maxResults: 5,
        });
        console.log(`   - Success! Found ${msgs.messages.length} messages.`);
        if (msgs.messages.length > 0) {
          console.log(`   - Sample Subject: ${msgs.messages[0].subject}`);
        }
      } catch (err) {
        console.error(`   - Failed to list messages: ${err.message}`);
      }
    }
  } catch (err) {
    console.error("CRITICAL FAILURE:", err);
  }
}

testGmailRead();
