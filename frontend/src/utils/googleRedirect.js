export const resolveGoogleRedirectUri = () => {
  if (typeof window === "undefined") {
    return "http://localhost:5173/auth/google/callback";
  }

  const origin = window.location.origin.replace(/\/$/, "");

  if (origin.includes("localhost")) {
    return "http://localhost:5173/auth/google/callback";
  }

  return `${origin}/auth/google/callback`;
};

export default resolveGoogleRedirectUri;
