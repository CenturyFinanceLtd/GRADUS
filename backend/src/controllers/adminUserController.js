/*
  Admin user controller
  - List/update/delete admin user accounts and roles/status
*/
const asyncHandler = require('express-async-handler');
const AdminUser = require('../models/AdminUser');

const ROLE_PROGRAMMER_ADMIN = 'programmer_admin';
const ROLE_ADMIN = 'admin';
const ROLE_SEO = 'seo';
const ROLE_SALES = 'sales';

const ROLE_LABELS = {
  [ROLE_PROGRAMMER_ADMIN]: 'Programmer(Admin)',
  [ROLE_ADMIN]: 'Admin',
  [ROLE_SEO]: 'SEO',
  [ROLE_SALES]: 'Sales',
};

const normalizeRole = (role) => {
  if (!role) {
    return ROLE_ADMIN;
  }
  return String(role).toLowerCase();
};

const formatAdminUser = (adminDoc) => {
  const role = normalizeRole(adminDoc.role);

  return {
    id: adminDoc._id.toString(),
    fullName: adminDoc.fullName,
    email: adminDoc.email,
    phoneNumber: adminDoc.phoneNumber,
    department: adminDoc.department || '',
    designation: adminDoc.designation || '',
    languages: Array.isArray(adminDoc.languages) ? adminDoc.languages : [],
    bio: adminDoc.bio || '',
    role,
    roleLabel: ROLE_LABELS[role] || (adminDoc.role ? String(adminDoc.role) : 'Unknown'),
    status: adminDoc.status || 'active',
    createdAt: adminDoc.createdAt,
    updatedAt: adminDoc.updatedAt,
  };
};

const canManageTarget = (actorRole, targetRole) => {
  const actor = normalizeRole(actorRole);
  const target = normalizeRole(targetRole);

  if (target === ROLE_PROGRAMMER_ADMIN) {
    return actor === ROLE_PROGRAMMER_ADMIN;
  }

  if (actor === ROLE_PROGRAMMER_ADMIN) {
    return true;
  }

  if (actor === ROLE_ADMIN) {
    return target !== ROLE_PROGRAMMER_ADMIN;
  }

  return false;
};

const escapeRegExp = (value) => value.replace(/[-\/\^$*+?.()|[\]{}]/g, '\\$&');

const listAdminUsers = asyncHandler(async (req, res) => {
  const { search, status } = req.query;
  const filters = {};

  if (status) {
    const normalizedStatus = String(status).toLowerCase();
    if (['active', 'inactive'].includes(normalizedStatus)) {
      filters.status = normalizedStatus;
    }
  }

  if (search && search.trim().length > 0) {
    const safeSearch = escapeRegExp(search.trim());
    const regex = new RegExp(safeSearch, 'i');
    filters.$or = [
      { fullName: regex },
      { email: regex },
      { department: regex },
      { designation: regex },
      { phoneNumber: regex },
    ];
  }

  const admins = await AdminUser.find(filters).sort({ createdAt: -1 }).lean();

  const users = admins.map((admin) => formatAdminUser(admin));

  res.status(200).json({ users });
});

const updateAdminStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const normalizedStatus = status ? String(status).toLowerCase() : '';

  if (!['active', 'inactive'].includes(normalizedStatus)) {
    res.status(400);
    throw new Error('Status must be either active or inactive.');
  }

  const target = await AdminUser.findById(id);

  if (!target) {
    res.status(404);
    throw new Error('Admin user not found.');
  }

  if (target._id.toString() === req.admin._id.toString()) {
    res.status(400);
    throw new Error('You cannot change your own status.');
  }

  if (!canManageTarget(req.admin.role, target.role)) {
    res.status(403);
    throw new Error('You do not have permission to change this admin\'s status.');
  }

  if (target.status === normalizedStatus) {
    res.status(200).json({
      message: `Admin is already ${normalizedStatus}.`,
      admin: formatAdminUser(target),
    });
    return;
  }

  target.status = normalizedStatus;
  await target.save();

  res.status(200).json({
    message: `Admin marked as ${normalizedStatus}.`,
    admin: formatAdminUser(target),
  });
});


const updateAdminRole = asyncHandler(async (req, res) => {
  if (normalizeRole(req.admin.role) !== ROLE_PROGRAMMER_ADMIN) {
    res.status(403);
    throw new Error('Only Programmer(Admin) accounts can update admin roles.');
  }

  const { id } = req.params;
  const { role } = req.body;

  const normalizedRole = normalizeRole(role);

  if (!ROLE_LABELS[normalizedRole]) {
    res.status(400);
    throw new Error('Please provide a valid role.');
  }

  const target = await AdminUser.findById(id);

  if (!target) {
    res.status(404);
    throw new Error('Admin user not found.');
  }

  const previousRole = normalizeRole(target.role);

  if (previousRole === normalizedRole) {
    res.status(200).json({
      message: `Admin already has the ${ROLE_LABELS[normalizedRole]} role.`,
      admin: formatAdminUser(target),
    });
    return;
  }

  target.role = normalizedRole;
  await target.save();

  res.status(200).json({
    message: `Role updated to ${ROLE_LABELS[normalizedRole]}.`,
    admin: formatAdminUser(target),
  });
});

const deleteAdminUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const target = await AdminUser.findById(id);

  if (!target) {
    res.status(404);
    throw new Error('Admin user not found.');
  }

  if (target._id.toString() === req.admin._id.toString()) {
    res.status(400);
    throw new Error('You cannot remove your own account.');
  }

  if (!canManageTarget(req.admin.role, target.role)) {
    res.status(403);
    throw new Error('You do not have permission to remove this admin.');
  }

  await target.deleteOne();

  res.status(200).json({ message: 'Admin removed successfully.', id: target._id.toString() });
});

module.exports = {
  listAdminUsers,
  updateAdminStatus,
  updateAdminRole,
  deleteAdminUser,

};

