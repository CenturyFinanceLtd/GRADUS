/*
  Admin testimonial API
  - CRUD endpoints, protected by admin auth
  - Mounted at /api/admin/testimonials
*/
const express = require('express');
const { protectAdmin } = require('../middleware/adminAuthMiddleware');
const { videoUpload } = require('../middleware/videoUploadMiddleware');
const {
  listAdminTestimonials,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
} = require('../controllers/testimonialController');

const router = express.Router();

router.route('/')
  .get(protectAdmin, listAdminTestimonials)
  .post(protectAdmin, videoUpload.single('video'), createTestimonial);

router.route('/:id')
  .patch(protectAdmin, updateTestimonial)
  .delete(protectAdmin, deleteTestimonial);

module.exports = router;

