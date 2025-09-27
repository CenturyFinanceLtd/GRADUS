const express = require('express');
const {
  createContactInquiry,
  listContactInquiries,
  updateContactInquiryStatus,
} = require('../controllers/contactController');
const { protectAdmin } = require('../middleware/adminAuthMiddleware');

const router = express.Router();

router
  .route('/')
  .post(createContactInquiry)
  .get(protectAdmin, listContactInquiries);

router.route('/:id').patch(protectAdmin, updateContactInquiryStatus);

module.exports = router;
