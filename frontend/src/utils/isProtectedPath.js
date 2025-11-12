const PROTECTED_PATTERNS = [
  /^\/profile(?:\/|$)/,
  /^\/my-courses(?:\/|$)/,
  /^\/support(?:\/|$)/,
  /^\/payment(?:\/|$)/,
  /^\/[^/]+\/[^/]+\/home(?:\/|$)/,
];

const isProtectedPath = (pathname = "") => {
  return PROTECTED_PATTERNS.some((pattern) => pattern.test(pathname));
};

export default isProtectedPath;
