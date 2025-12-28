const baseUrl =
  "https://utxxhgoxsywhrdblwhbx.supabase.co/functions/v1/courses-api";

async function inspectCourses() {
  console.log("Fetching courses from Edge Function...");
  const resp = await fetch(baseUrl);
  const data = await resp.json();

  if (data.error) {
    console.error("Error from API:", data.error);
    return;
  }

  const courses = data.items || [];
  if (courses.length === 0) {
    console.log("No courses found.");
    return;
  }

  console.log("--- Sample Course Data Pricing ---");
  courses.slice(0, 3).forEach((course, index) => {
    console.log(`\nCourse ${index + 1}: ${course.title}`);
    console.log("Pricing Info:", {
      price: course.price,
      priceINR: course.priceINR,
      price_inr: course.price_inr,
      is_free: course.is_free,
      isFree: course.isFree,
    });
    console.log("All Keys:", Object.keys(course).join(", "));
  });
}

inspectCourses().catch(console.error);
