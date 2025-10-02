const express = require('express');
const { query } = require('express-validator');
const { listWebsiteUsers } = require('../controllers/adminWebsiteUserController');
const { protectAdmin } = require('../middleware/adminAuthMiddleware');
const validateRequest = require('../middleware/validateRequest');

const router = express.Router();

router.get(
  '/',
  protectAdmin,
  [query('search').optional({ checkFalsy: true }).trim().isLength({ max: 120 })],
  validateRequest,
  listWebsiteUsers
);

module.exports = router;
