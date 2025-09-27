const express = require('express');
const { createContactInquiry, listContactInquiries } = require('../controllers/contactController');
const { protectAdmin } = require('../middleware/adminAuthMiddleware');

const router = express.Router();

router
  .route('/')
  .post(createContactInquiry)
  .get(protectAdmin, listContactInquiries);

module.exports = router;
