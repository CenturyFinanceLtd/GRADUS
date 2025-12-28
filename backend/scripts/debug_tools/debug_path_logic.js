const urlStr =
  "https://utxxhgoxsywhrdblwhbx.supabase.co/functions/v1/admin-courses-api/progress/gradus-x%2Fagentic-ai-engineering-flagship";

console.log("Testing URL:", urlStr);

const url = new URL(urlStr);
const path = url.pathname.replace(/\/$/, "");
console.log("path (url.pathname):", path);

const pathParts = path.split("/").filter(Boolean);
console.log("pathParts:", pathParts);

const funcIndex = pathParts.indexOf("admin-courses-api");
console.log("funcIndex:", funcIndex);

const rawPath = "/" + pathParts.slice(funcIndex + 1).join("/");
console.log("rawPath:", rawPath);

const apiPath = decodeURIComponent(rawPath).replace(/\/$/, "");
console.log("apiPath:", apiPath);

if (apiPath.startsWith("/progress/")) {
  const courseSlug = decodeURIComponent(apiPath.replace("/progress/", ""));
  console.log("courseSlug:", courseSlug);
  console.log("Expected: gradus-x/agentic-ai-engineering-flagship");
  console.log(
    "Match?",
    courseSlug === "gradus-x/agentic-ai-engineering-flagship"
  );
} else {
  console.log("Did not match /progress/");
}
