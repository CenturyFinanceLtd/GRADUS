const normalizeRole = (role) => (role ? String(role).toLowerCase() : "");

const ROLE_HOME_PATHS = {
  seo: "/",
};

const getHomePath = (role) => {
  const normalizedRole = normalizeRole(role);
  return ROLE_HOME_PATHS[normalizedRole] || "/";
};

export default getHomePath;
export { normalizeRole, getHomePath };
