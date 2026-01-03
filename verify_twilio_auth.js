const { createClient } = require("@supabase/supabase-js");

// Config
const SUPABASE_URL = "https://utxxhgoxsywhrdblwhbx.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0eHhoZ294c3l3aHJkYmx3aGJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3NDk4OTgsImV4cCI6MjA4MjMyNTg5OH0.EFbrWoLswgg25WTtpHkVv9OYOZ8-EsN-_APW3eGjUmc";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const PHONE = "+919454971531";
const OTP = "123456"; // Requires this number/OTP to be added in Supabase Auth > Providers > Phone > Phone numbers for testing

async function testSupabaseAuth() {
  console.log("--- Testing Supabase Native Phone Auth ---");

  // 1. Send OTP
  console.log(`1. Sending OTP to ${PHONE}...`);
  const { error: sendError } = await supabase.auth.signInWithOtp({
    phone: PHONE,
  });

  if (sendError) {
    console.error("FAILED to send OTP:", sendError.message);
    console.log(
      "TIP: Ensure Twilio is configured OR add this number to 'Phone numbers for testing' in Supabase Dashboard."
    );
    process.exit(1);
  }
  console.log("OTP Sent (or simulated).");

  // 2. Verify OTP
  console.log(`2. Verifying OTP '${OTP}'...`);
  const { data, error: verifyError } = await supabase.auth.verifyOtp({
    phone: PHONE,
    token: OTP,
    type: "sms",
  });

  if (verifyError) {
    console.error("FAILED to verify OTP:", verifyError.message);
    if (verifyError.message.includes("tokens")) {
      console.log(
        "TIP: If using Test Number, ensure '123456' is the configured code."
      );
    }
    process.exit(1);
  }

  console.log("Verification SUCCESS!");
  console.log("User ID:", data.user?.id);
  console.log(
    "Session Access Token:",
    data.session?.access_token ? "Yes" : "No"
  );

  console.log("--- TEST COMPLETE ---");
}

testSupabaseAuth();
