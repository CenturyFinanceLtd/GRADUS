const express = require('express');
const { body, param, query } = require('express-validator');
const { listAdminUsers, updateAdminStatus, updateAdminRole, deleteAdminUser } = require('../controllers/adminUserController');
const { protectAdmin } = require('../middleware/adminAuthMiddleware');
const validateRequest = require('../middleware/validateRequest');

const router = express.Router();

router.get(
  '/',
  protectAdmin,
  [
    query('status')
      .optional({ checkFalsy: true })
      .trim()
      .isIn(['active', 'inactive'])
      .withMessage('Status filter must be active or inactive.'),
    query('search').optional({ checkFalsy: true }).trim().isLength({ max: 120 }),
  ],
  validateRequest,
  listAdminUsers
);

router.patch(
  '/:id/status',
  protectAdmin,
  [
    param('id')
      .trim()
      .isMongoId()
      .withMessage('A valid admin id is required.'),
    body('status')
      .trim()
      .notEmpty()
      .withMessage('Status is required.')
      .isIn(['active', 'inactive'])
      .withMessage('Status must be active or inactive.'),
  ],
  validateRequest,
  updateAdminStatus
);

router.patch(
  '/:id/role',
  protectAdmin,
  [
    param('id')
      .trim()
      .isMongoId()
      .withMessage('A valid admin id is required.'),
    body('role')
      .trim()
      .notEmpty()
      .withMessage('Role is required.')
      .isIn(['admin', 'programmer_admin', 'seo', 'sales'])
      .withMessage('Role must be admin, programmer_admin, seo, or sales.'),
  ],
  validateRequest,
  updateAdminRole
);

router.delete(
  '/:id',
  protectAdmin,
  [
    param('id')
      .trim()
      .isMongoId()
      .withMessage('A valid admin id is required.'),
  ],
  validateRequest,
  deleteAdminUser
);

module.exports = router;

