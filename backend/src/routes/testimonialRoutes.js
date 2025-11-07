/*
  Public testimonial API
  - GET /api/testimonials
*/
const express = require('express');
const { listPublicTestimonials } = require('../controllers/testimonialController');

const router = express.Router();

router.get('/', listPublicTestimonials);

module.exports = router;

