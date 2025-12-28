const API_BASE = "https://utxxhgoxsywhrdblwhbx.supabase.co/functions/v1";

async function verify() {
  console.log("--- Verifying Course Pricing ---");
  try {
    const cResp = await fetch(`${API_BASE}/courses-api`);
    const cData = await cResp.json();
    const items = Array.isArray(cData?.items) ? cData.items : [];
    const itemsWithPrice = items.filter((it) => it.priceINR > 0);
    console.log(
      `Found ${items.length} courses, ${itemsWithPrice.length} have non-zero price.`
    );
    if (itemsWithPrice.length > 0) {
      console.log("Sample priced courses:");
      itemsWithPrice
        .slice(0, 3)
        .forEach((it) => console.log(` - ${it.name}: ${it.priceINR}`));
    } else if (items.length > 0) {
      console.error(
        "CRITICAL: No courses have prices! Sample first item priceINR:",
        items[0].priceINR
      );
    } else {
      console.error("No courses found.");
    }
  } catch (e) {
    console.error("Course verify failed:", e.message);
  }

  console.log("\n--- Verifying Events Filtering & Mapping ---");
  try {
    const eResp = await fetch(`${API_BASE}/events-api?timeframe=upcoming`);
    const eData = await eResp.json();
    const items = eData.items || [];
    console.log(`Found ${items.length} upcoming events.`);
    if (items.length > 0) {
      const first = items[0];
      console.log("Sample event mapping:");
      console.log(` - Name: ${first.name}`);
      console.log(
        ` - heroImage URL: ${first.heroImage?.url ? "OK" : "MISSING"}`
      );
      console.log(` - eventType: ${first.eventType}`);
    }
  } catch (e) {
    console.error("Events verify failed:", e.message);
  }
}

verify();
