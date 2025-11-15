const normalizeOrigin = (value) => {
  if (!value || typeof value !== "string") {
    return "";
  }

  return value.trim().replace(/\/+$/, "").toLowerCase();
};

export const getCurrentOrigin = () => {
  if (typeof window === "undefined" || typeof window.location?.origin !== "string") {
    return null;
  }

  return normalizeOrigin(window.location.origin);
};

export const getGoogleAllowedOrigins = () => {
  const raw = import.meta.env.VITE_GOOGLE_ALLOWED_ORIGINS;
  if (!raw || typeof raw !== "string") {
    return [];
  }

  return raw
    .split(",")
    .map((item) => normalizeOrigin(item))
    .filter(Boolean);
};

export const isCurrentOriginGoogleAllowed = () => {
  const allowedOrigins = getGoogleAllowedOrigins();
  if (allowedOrigins.length === 0) {
    return true;
  }

  const currentOrigin = getCurrentOrigin();
  if (!currentOrigin) {
    return false;
  }

  return allowedOrigins.includes(currentOrigin);
};

export default isCurrentOriginGoogleAllowed;
