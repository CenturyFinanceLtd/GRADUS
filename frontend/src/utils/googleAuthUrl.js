import resolveGoogleRedirectUri from "./googleRedirect.js";

const GOOGLE_AUTH_BASE_URL = "https://accounts.google.com/o/oauth2/v2/auth";

export const buildGoogleAuthUrl = ({ redirectUri, prompt = "select_account" } = {}) => {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error("Google OAuth client ID is missing.");
  }

  const finalRedirectUri = redirectUri || resolveGoogleRedirectUri();

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: finalRedirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    include_granted_scopes: "true",
    prompt,
  });

  return `${GOOGLE_AUTH_BASE_URL}?${params.toString()}`;
};

export default buildGoogleAuthUrl;
