const https = require("https");

const email = "gradus_test_user@example.com";
const phone = "1234567890"; // Using the test number pattern if needed, or generic
// Note: auth-api/index.ts has a bypass for 9454971531 and OTP 123456
const testPhone = "9454971531"; // Use this for bypass
const testOtp = "123456";

const SUPABASE_URL =
  process.env.SUPABASE_URL || "https://utxxhgoxsywhrdblwhbx.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0eHhoZ294c3l3aHJkYmx3aGJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3NDk4OTgsImV4cCI6MjA4MjMyNTg5OH0.EFbrWoLswgg25WTtpHkVv9OYOZ8-EsN-_APW3eGjUmc";
const EDGE_BASE_URL = `${SUPABASE_URL.replace(/\/$/, "")}/functions/v1`;

function request(endpoint, method, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    };

    if (body) {
      options.headers["Content-Length"] = Buffer.byteLength(
        JSON.stringify(body)
      );
    }

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on("error", (e) => reject(e));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runVerification() {
  console.log("--- Starting Refactor Verification ---");
  console.log(`Target: ${EDGE_BASE_URL}`);
  console.log(`Test User: ${testPhone} (OTP: ${testOtp})`);

  try {
    // 1. Send OTP (Simulate Phone Login)
    console.log("\n1. Sending OTP...");
    const sendResp = await request(
      `${EDGE_BASE_URL}/auth-api/phone/otp/send`,
      "POST",
      {
        phone: testPhone,
      }
    );
    console.log("Send Status:", sendResp.status);

    if (sendResp.status !== 200) {
      console.error("Failed to send OTP:", sendResp.data);
      return;
    }
    const sessionId = sendResp.data.sessionId;
    console.log("Session ID:", sessionId);

    // 2. Verify OTP
    console.log("\n2. Verifying OTP...");
    const verifyResp = await request(
      `${EDGE_BASE_URL}/auth-api/phone/otp/verify`,
      "POST",
      {
        phone: testPhone,
        otp: testOtp,
        sessionId: sessionId,
      }
    );

    console.log("Verify Status:", verifyResp.status);
    if (verifyResp.status !== 200) {
      console.error("Failed to verify OTP:", verifyResp.data);
      return;
    }

    const user = verifyResp.data.user;
    const token = verifyResp.data.token;
    console.log("User verified.");
    console.log("User Phone from API:", user.phone);
    console.log("User Mobile from API (Legacy):", user.mobile); // Should be undefined or same if mapped

    if (user.phone !== testPhone && user.phone !== `+91${testPhone}`) {
      console.warn("WARNING: User phone does not match input!");
    } else {
      console.log("SUCCESS: User phone matches.");
    }

    // 3. Update Profile using /me (Test users-api refactor)
    console.log("\n3. Updating Profile (users-api)...");
    const updateBody = {
      fullname: "Refactor Verify User",
      personalDetails: { city: "Test City" },
    };

    // Authorization header for this request
    const updateUrl = new URL(`${EDGE_BASE_URL}/users-api/me`);
    const updateOptions = {
      hostname: updateUrl.hostname,
      port: 443,
      path: updateUrl.pathname,
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    };

    const updateReq = https.request(updateOptions, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => {
        console.log("Update Status:", res.statusCode);
        try {
          const json = JSON.parse(body);
          console.log("Update Body:", JSON.stringify(json, null, 2));
          if (json.user && json.user.phone) {
            console.log(
              "\n--- VERIFICATION COMPLETE: PHONE FIELD IS WORKING ---"
            );
          } else {
            console.error(
              "\n[FAILURE] Update failed or phone missing in response."
            );
            if (json.error) console.error("Error Message:", json.error);
          }
        } catch (e) {
          console.log("Update Body (Raw):", body);
        }
      });
    });
    updateReq.write(JSON.stringify(updateBody));
    updateReq.end();
  } catch (err) {
    console.error("Verification Error:", err);
  }
}

runVerification();
