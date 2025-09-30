const normalizeRole = (role) => (role ? String(role).toLowerCase() : "");

const getHomePath = (role) => {
  return normalizeRole(role) === "seo" ? "/index-9" : "/";
};

export default getHomePath;
export { normalizeRole, getHomePath };
