const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { protectAdmin } = require('../middleware/adminAuthMiddleware');
const { createCallbackRequest, listCallbackRequests } = require('../controllers/callbackRequestController');

router.route('/')
  .post(protect, createCallbackRequest)
  .get(protectAdmin, listCallbackRequests);

module.exports = router;
