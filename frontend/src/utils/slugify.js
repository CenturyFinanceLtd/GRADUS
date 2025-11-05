// Utility helpers for course/programme naming
// - stripBrackets: remove any parenthetical content completely
// - slugify: URL-friendly slug without any bracketed content

export function stripBrackets(input) {
  if (!input) return "";
  return String(input)
    .replace(/\s*\([^)]*\)\s*/g, " ") // remove everything in parentheses
    .replace(/\s+/g, " ")
    .trim();
}

export function slugify(input) {
  if (!input) return "";
  const noBrackets = stripBrackets(input);
  const text = noBrackets
    .normalize("NFKD")
    .replace(/[&+]/g, " and ")
    .replace(/[/_]/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .toLowerCase();
  return text.replace(/\s+/g, "-");
}

export default slugify;
