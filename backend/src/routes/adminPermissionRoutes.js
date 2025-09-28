const express = require('express');
const { body, param } = require('express-validator');
const {
  getCurrentAdminPermissions,
  getAllRolePermissions,
  updateRolePermissions,
} = require('../controllers/adminPermissionController');
const { protectAdmin, requireAdminRole } = require('../middleware/adminAuthMiddleware');
const validateRequest = require('../middleware/validateRequest');

const router = express.Router();

router.get('/me', protectAdmin, getCurrentAdminPermissions);

router.get('/', protectAdmin, requireAdminRole('programmer_admin'), getAllRolePermissions);

router.put(
  '/:role',
  protectAdmin,
  requireAdminRole('programmer_admin'),
  [
    param('role').trim().notEmpty().withMessage('Role is required.'),
    body('allowedPages')
      .isArray()
      .withMessage('allowedPages must be an array.'),
  ],
  validateRequest,
  updateRolePermissions
);

module.exports = router;
