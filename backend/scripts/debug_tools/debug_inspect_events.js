const baseUrl =
  "https://utxxhgoxsywhrdblwhbx.supabase.co/functions/v1/events-api";

async function inspectEvents() {
  console.log("Fetching events from Edge Function...");
  const resp = await fetch(baseUrl);
  const data = await resp.json();

  if (data.error) {
    console.error("Error from API:", data.error);
    return;
  }

  const events = data.items || [];
  if (events.length === 0) {
    console.log("No events found.");
    return;
  }

  console.log("--- Sample Event Data ---");
  events.slice(0, 2).forEach((event, index) => {
    console.log(`\nEvent ${index + 1}: ${event.title}`);
    console.log("Keys:", Object.keys(event));
    console.log(
      "Hero Image:",
      JSON.stringify(event.hero_image || event.heroImage || "MISSING", null, 2)
    );
    console.log(
      "Featured Image:",
      JSON.stringify(
        event.featured_image || event.featuredImage || "MISSING",
        null,
        2
      )
    );
    console.log(
      "Schedule:",
      JSON.stringify(event.schedule || "MISSING", null, 2)
    );
    console.log("Full Object (keys only):", Object.keys(event).join(", "));
  });
}

inspectEvents().catch(console.error);
