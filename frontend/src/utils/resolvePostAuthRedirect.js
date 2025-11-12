const EXCLUDED_PATHS = new Set(["/sign-in", "/sign-up", "/forgot-password", "/auth/google/callback"]);

const readStoredPath = () => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return sessionStorage.getItem("gradus_last_path");
  } catch (err) {
    console.warn("Failed to read last path", err);
    return null;
  }
};

const normalizePath = (path) => {
  if (!path || EXCLUDED_PATHS.has(path)) {
    return null;
  }
  return path;
};

const resolvePostAuthRedirect = ({ locationState, fallback = "/" } = {}) => {
  const preferredTarget = normalizePath(
    locationState?.redirectTo || locationState?.redirectOverride || locationState?.targetPath
  );
  if (preferredTarget) {
    return preferredTarget;
  }

  const fromPath = locationState?.from?.pathname || locationState?.fromPath;
  const fromTarget = normalizePath(fromPath);
  if (fromTarget) {
    return fromTarget;
  }

  const stored = normalizePath(readStoredPath());
  if (stored) {
    return stored;
  }

  return fallback;
};

export default resolvePostAuthRedirect;
