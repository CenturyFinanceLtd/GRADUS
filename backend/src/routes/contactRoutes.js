/*
  Contact inquiry routes
  - Public submission endpoint and admin listing/status updates
  - Mounted at /api/inquiries
*/
const express = require('express');
const {
  createContactInquiry,
  listContactInquiries,
  getContactInquiry,
  updateContactInquiry,
  deleteContactInquiry,
} = require('../controllers/contactController');
const { protectAdmin } = require('../middleware/adminAuthMiddleware');

const router = express.Router();

router
  .route('/')
  .post(createContactInquiry)
  .get(protectAdmin, listContactInquiries);

router
  .route('/:id')
  .get(protectAdmin, getContactInquiry)
  .patch(protectAdmin, updateContactInquiry)
  .delete(protectAdmin, deleteContactInquiry);

module.exports = router;
