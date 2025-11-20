/*
  Admin permission controller
  - Defines CRUD operations for role-based permissions in admin portal
*/
const asyncHandler = require('express-async-handler');
const AdminPermission = require('../models/AdminPermission');
const { ADMIN_ROLES, ADMIN_ROLE_KEYS, normalizeAdminRole, getAdminRoleLabel } = require('../data/adminRoles');
const { ADMIN_PAGE_DEFINITIONS, ADMIN_PAGE_KEYS } = require('../data/adminPageDefinitions');

const DEFAULT_ROLE_PERMISSIONS = {
  programmer_admin: ['*'],
  admin: ['*'],
  seo: ['blog_list', 'blog_details', 'blog_details_alt', 'blog_add', 'testimonials', 'expert_videos', 'page_meta', 'inquiries'],
  sales: ['inquiries'],
  teacher: [],
};

const uniqueArray = (values = []) => {
  const seen = new Set();
  const result = [];
  values.forEach((value) => {
    if (!seen.has(value)) {
      seen.add(value);
      result.push(value);
    }
  });
  return result;
};

const resolveAllowedPages = (role, record) => {
  const normalizedRole = normalizeAdminRole(role);
  if (normalizedRole === 'programmer_admin') {
    return ['*'];
  }

  const stored = Array.isArray(record?.allowedPages) ? record.allowedPages : null;
  if (stored && stored.length > 0) {
    return uniqueArray(stored);
  }

  return uniqueArray(DEFAULT_ROLE_PERMISSIONS[normalizedRole] || []);
};

const ensurePermissionDocument = async (role) => {
  const normalizedRole = normalizeAdminRole(role);
  let document = await AdminPermission.findOne({ role: normalizedRole });
  if (!document) {
    const defaults = DEFAULT_ROLE_PERMISSIONS[normalizedRole] || [];
    document = await AdminPermission.create({ role: normalizedRole, allowedPages: defaults });
  }
  return document;
};

const getCurrentAdminPermissions = asyncHandler(async (req, res) => {
  const normalizedRole = normalizeAdminRole(req.admin?.role);
  if (!normalizedRole || !ADMIN_ROLE_KEYS.includes(normalizedRole)) {
    res.status(200).json({ role: normalizedRole, allowedPages: ['*'] });
    return;
  }

  const document = await ensurePermissionDocument(normalizedRole);
  const allowedPages = resolveAllowedPages(normalizedRole, document);

  res.status(200).json({ role: normalizedRole, allowedPages });
});

const getAllRolePermissions = asyncHandler(async (req, res) => {
  const records = await AdminPermission.find({ role: { $in: ADMIN_ROLE_KEYS } }).lean();
  const map = {};

  ADMIN_ROLE_KEYS.forEach((role) => {
    const record = records.find((item) => item.role === role);
    map[role] = resolveAllowedPages(role, record);
  });

  res.status(200).json({
    roles: ADMIN_ROLES,
    pages: ADMIN_PAGE_DEFINITIONS,
    permissions: map,
  });
});

const updateRolePermissions = asyncHandler(async (req, res) => {
  const normalizedRole = normalizeAdminRole(req.params.role);

  if (!normalizedRole || !ADMIN_ROLE_KEYS.includes(normalizedRole)) {
    res.status(400);
    throw new Error('A valid role must be provided.');
  }

  if (normalizedRole === 'programmer_admin') {
    res.status(400);
    throw new Error('Programmer(Admin) accounts always have full access.');
  }

  const { allowedPages } = req.body;

  if (!Array.isArray(allowedPages)) {
    res.status(422);
    throw new Error('allowedPages must be an array of page identifiers.');
  }

  const sanitized = uniqueArray(
    allowedPages
      .map((page) => String(page).trim())
      .filter((page) => page === '*' || ADMIN_PAGE_KEYS.includes(page))
  );

  const document = await AdminPermission.findOneAndUpdate(
    { role: normalizedRole },
    { role: normalizedRole, allowedPages: sanitized },
    { new: true, upsert: true }
  );

  res.status(200).json({
    message: `${getAdminRoleLabel(normalizedRole)} permissions updated successfully.`,
    role: normalizedRole,
    allowedPages: resolveAllowedPages(normalizedRole, document),
  });
});

module.exports = {
  getCurrentAdminPermissions,
  getAllRolePermissions,
  updateRolePermissions,
};
