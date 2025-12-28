const BASE_URL = "https://utxxhgoxsywhrdblwhbx.supabase.co/functions/v1";

async function testEndpoint(name, url, method = "GET", body = null) {
  console.log(`Testing ${name} (${method} ${url})...`);
  try {
    const options = {
      method,
      headers: { "Content-Type": "application/json" },
    };
    if (body) options.body = JSON.stringify(body);

    const resp = await fetch(url, options);
    const data = await resp.json();

    if (resp.ok) {
      console.log(
        `✅ ${name} Success:`,
        JSON.stringify(data).slice(0, 150) + "..."
      );
    } else {
      console.error(`❌ ${name} Failed (${resp.status}):`, data);
    }
  } catch (err) {
    console.error(`❌ ${name} Error:`, err.message);
  }
}

async function runTests() {
  console.log("--- SITE SERVICES API ---");
  await testEndpoint("Page Meta", `${BASE_URL}/site-services-api/page-meta`);
  await testEndpoint("Jobs List", `${BASE_URL}/site-services-api/jobs`);
  await testEndpoint(
    "Analytics Visit",
    `${BASE_URL}/site-services-api/visits`,
    "POST",
    { path: "/test-page", pageTitle: "Test Page" }
  );
  await testEndpoint(
    "Callback Request",
    `${BASE_URL}/site-services-api/callback-requests`,
    "POST",
    {
      name: "Test User",
      email: "test@example.com",
      phone: "1234567890",
    }
  );

  console.log("\n--- CONTENT API ---");
  await testEndpoint("Gallery list", `${BASE_URL}/content-api/gallery`);
  await testEndpoint(
    "Landing Pages list",
    `${BASE_URL}/content-api/landing-pages`
  );
  await testEndpoint(
    "Landing Page single (mock slug)",
    `${BASE_URL}/content-api/landing-pages/advanced-markets-mastery`
  );
}

runTests();
