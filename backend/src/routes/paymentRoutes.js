/*
  Payment routes (Razorpay)
  - Mounted at /api/payments
*/
const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { createCourseOrder, verifyPayment, recordFailure } = require('../controllers/paymentController');

const router = express.Router();

router.post('/course-order', protect, createCourseOrder);
router.post('/verify', protect, verifyPayment);
router.post('/fail', protect, recordFailure);

module.exports = router;

