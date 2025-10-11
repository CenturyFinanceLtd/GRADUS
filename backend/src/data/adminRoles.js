const ADMIN_ROLES = [
  { key: 'programmer_admin', label: 'Programmer(Admin)' },
  { key: 'admin', label: 'Admin' },
  { key: 'teacher', label: 'Teacher' },
  { key: 'seo', label: 'SEO' },
  { key: 'sales', label: 'Sales' },
];

const ADMIN_ROLE_KEYS = ADMIN_ROLES.map((role) => role.key);

const normalizeAdminRole = (role) => (role ? String(role).toLowerCase() : '');

const getAdminRoleLabel = (role) => {
  const normalized = normalizeAdminRole(role);
  const found = ADMIN_ROLES.find((item) => item.key === normalized);
  return found ? found.label : role;
};

module.exports = {
  ADMIN_ROLES,
  ADMIN_ROLE_KEYS,
  normalizeAdminRole,
  getAdminRoleLabel,
};
