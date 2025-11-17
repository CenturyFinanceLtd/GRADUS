/*
  Admin testimonial API
  - CRUD endpoints, protected by admin auth
  - Mounted at /api/admin/testimonials
*/
const express = require('express');
const { protectAdmin } = require('../middleware/adminAuthMiddleware');
const { testimonialUpload } = require('../middleware/testimonialUploadMiddleware');
const {
  listAdminTestimonials,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
} = require('../controllers/testimonialController');

const router = express.Router();

router.route('/')
  .get(protectAdmin, listAdminTestimonials)
  .post(protectAdmin, testimonialUpload, createTestimonial);

router.route('/:id')
  .patch(protectAdmin, testimonialUpload, updateTestimonial)
  .delete(protectAdmin, deleteTestimonial);

module.exports = router;
