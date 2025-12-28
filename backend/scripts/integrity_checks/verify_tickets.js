require("dotenv").config();
const ticketService = require("../src/services/ticketService");
const adminTicketService = require("../src/services/adminTicketService");

// Mock User and Admin IDs (Assuming these exist in your DB or using placeholders if RLS allows)
// Note: For this to work, we need real UUIDs from the `auth.users` or `public.users` table.
// If you don't have known IDs, we might fail foreign key constraints.
// Let's assume we can use the ones from the previous context or placeholders.

async function testTickets() {
  console.log("Starting Ticket System Verification...");

  try {
    // 1. Create Ticket (User Side)
    // We need a valid user ID. Let's try to fetch one or insert a dummy if possible?
    // Since we can't easily fetch users here without userService,
    // we'll rely on the user providing one or assume a specific test user exists.
    // Or we can query supabase directly here to get a user.
    const supabase = require("../src/config/supabase");

    const { data: user } = await supabase
      .from("users")
      .select("id")
      .limit(1)
      .single();
    if (!user) throw new Error("No users found in DB to test with.");
    const userId = user.id;

    const { data: admin } = await supabase
      .from("admin_users")
      .select("id")
      .limit(1)
      .single();
    // If no admin, we skip admin parts or try to create one?
    // For now, let's assume admin exists or we can't test admin reply fully.
    const adminId = admin ? admin.id : null;

    console.log(`Testing with User: ${userId}, Admin: ${adminId}`);

    const ticketMap = await ticketService.createTicket(userId, {
      subject: "Automated Migration Test Ticket",
      message: "This is a test ticket to verify Supabase migration.",
    });
    const ticketId = ticketMap.id;
    console.log("1. User created ticket:", ticketId);

    // 2. List Tickets (Admin Side)
    const allTickets = await adminTicketService.listTickets({
      search: "Migration Test",
    });
    const found = allTickets.find((t) => t.id === ticketId);
    if (!found) throw new Error("Admin could not find the created ticket.");
    console.log("2. Admin found ticket:", found.subject);

    // 3. Admin Reply
    if (adminId) {
      console.log("3. Admin replying...");
      await adminTicketService.createMessage(ticketId, {
        authorType: "admin",
        authorAdmin: adminId,
        body: "Admin reply form verification.",
      });
      console.log("3. Admin replied to ticket.");
    } else {
      console.log("3. Skipping Admin reply (no admin user found).");
    }

    // 4. Verify User sees reply
    const details = await ticketService.getTicketDetails(userId, ticketId);
    if (details.messages.length < 2 && adminId)
      throw new Error("User did not see admin reply.");
    console.log("4. User sees messages count:", details.messages.length);

    console.log("SUCCESS: Ticket System Verified.");

    // Clean up
    await supabase.from("tickets").delete().eq("id", ticketId);
    console.log("Cleanup: Deleted test ticket.");
  } catch (err) {
    console.error("VERIFICATION FAILED FULL ERROR:", err);
    if (err.message) console.error("Message:", err.message);
    if (err.stack) console.error("Stack:", err.stack);
    process.exit(1);
  }
}

testTickets();
