const { OAuth2Client } = require('google-auth-library');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URIS = (process.env.GOOGLE_REDIRECT_URIS || '')
  .split(',')
  .map((uri) => uri.trim())
  .filter(Boolean);

const ensureGoogleConfig = () => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error('Google OAuth credentials are not configured on the server.');
  }
};

const resolveRedirectUri = (requestedUri) => {
  if (!requestedUri) {
    throw new Error('Google redirect URI is missing.');
  }

  if (GOOGLE_REDIRECT_URIS.length === 0) {
    return requestedUri;
  }

  if (!GOOGLE_REDIRECT_URIS.includes(requestedUri)) {
    throw new Error('The provided redirect URI is not registered for Google OAuth.');
  }

  return requestedUri;
};

const exchangeGoogleCode = async ({ code, redirectUri }) => {
  ensureGoogleConfig();
  const validRedirectUri = resolveRedirectUri(redirectUri);

  const oauthClient = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, validRedirectUri);
  const { tokens } = await oauthClient.getToken(code);

  if (!tokens?.id_token) {
    throw new Error('Google did not return an identity token.');
  }

  const ticket = await oauthClient.verifyIdToken({
    idToken: tokens.id_token,
    audience: GOOGLE_CLIENT_ID,
  });

  const profile = ticket.getPayload();
  return { profile, tokens };
};

const verifyGoogleIdToken = async (idToken) => {
  ensureGoogleConfig();

  if (!idToken) {
    throw new Error('Google identity token is missing.');
  }

  const oauthClient = new OAuth2Client(GOOGLE_CLIENT_ID);
  const ticket = await oauthClient.verifyIdToken({
    idToken,
    audience: GOOGLE_CLIENT_ID,
  });

  return ticket.getPayload();
};

module.exports = {
  exchangeGoogleCode,
  verifyGoogleIdToken,
};
