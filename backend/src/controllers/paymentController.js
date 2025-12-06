/*
  Payment controller (Razorpay)
  - Creates Razorpay orders for course enrollments with 18% GST
  - Verifies successful payments and updates enrollment
  - Records failed/dismissed payments as FAILED with blank transaction id
*/
const asyncHandler = require('express-async-handler');
const fetch = require('node-fetch');
const crypto = require('crypto');
const config = require('../config/env');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');

const parsePriceNumber = (raw) => {
  if (raw == null) return 0;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : 0;
  const n = Number(String(raw).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

const computeAmountsPaise = (baseRupees, gstRate) => {
  const basePaise = Math.round(Math.max(0, baseRupees) * 100);
  const taxPaise = Math.round(basePaise * (Number(gstRate) || 0));
  const totalPaise = basePaise + taxPaise;
  return { basePaise, taxPaise, totalPaise };
};

// POST /api/payments/course-order
const createCourseOrder = asyncHandler(async (req, res) => {
  const { courseSlug } = req.body || {};
  const slug = typeof courseSlug === 'string' ? courseSlug.trim().toLowerCase() : '';

  if (!slug) {
    res.status(400);
    throw new Error('courseSlug is required');
  }

  if (!config.payments.razorpayKeyId || !config.payments.razorpayKeySecret) {
    res.status(500);
    throw new Error('Payment gateway is not configured');
  }

  const course = await Course.findOne({ slug }).lean();
  if (!course) {
    res.status(404);
    throw new Error('Course not found');
  }

  // Determine base price (rupees) server-side
  const basePrice = parsePriceNumber(course?.hero?.priceINR ?? course?.price);
  if (!basePrice) {
    res.status(400);
    throw new Error('This course does not have a valid price');
  }

  const { basePaise, taxPaise, totalPaise } = computeAmountsPaise(basePrice, config.payments.gstRate);
  // Razorpay limits receipt length to 40 chars. Use a compact, unique value.
  const receipt = `enr_${Date.now().toString(36)}_${crypto
    .createHash('sha1')
    .update(`${req.user._id.toString()}_${course._id.toString()}`)
    .digest('hex')
    .slice(0, 12)}`.slice(0, 40);

  // Create Razorpay order
  const payload = {
    amount: totalPaise,
    currency: 'INR',
    receipt,
    notes: {
      userId: req.user._id.toString(),
      courseId: course._id.toString(),
      courseSlug: course.slug,
    },
  };

  const rzpResp = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'gradus-app/1.0',
      Authorization:
        'Basic ' + Buffer.from(`${config.payments.razorpayKeyId}:${config.payments.razorpayKeySecret}`).toString('base64'),
    },
    body: JSON.stringify(payload),
  });

  if (!rzpResp.ok) {
    let errMsg = 'Failed to create payment order';
    let details = null;
    try {
      details = await rzpResp.json();
      if (details?.error?.description) errMsg = details.error.description;
    } catch (_) {
      try {
        const txt = await rzpResp.text();
        details = { text: txt };
      } catch (_) {}
    }
    console.error('[payments] Razorpay order creation failed:', details || rzpResp.statusText);
    return res.status(502).json({ message: errMsg, details });
  }

  const order = await rzpResp.json();

  // Upsert enrollment with PENDING status and order details
  const update = {
    status: 'ACTIVE',
    paymentStatus: 'PENDING',
    paymentGateway: 'RAZORPAY',
    currency: 'INR',
    priceBase: Math.round(basePaise / 100),
    priceTax: Math.round(taxPaise / 100),
    priceTotal: Math.round((basePaise + taxPaise) / 100),
    razorpayOrderId: order.id,
    paymentReference: '',
    paidAt: null,
    receipt,
  };

  await Enrollment.findOneAndUpdate(
    { user: req.user._id, course: course._id },
    { $set: update },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  res.json({
    keyId: config.payments.razorpayKeyId,
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    course: { slug: course.slug, name: course.name },
    user: { id: req.user._id.toString() },
  });
});

// POST /api/payments/verify
const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    res.status(400);
    throw new Error('Missing payment verification fields');
  }

  // DEV BYPASS: Allow mock verification if not in production
  if (config.nodeEnv !== 'production' && razorpay_signature === 'mock_dev_success') {
    // Skip crypto check
  } else {
    const expected = crypto
      .createHmac('sha256', config.payments.razorpayKeySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    const isValid = expected === razorpay_signature;
    if (!isValid) {
      res.status(400);
      throw new Error('Invalid payment signature');
    }
  }

  const enrollment = await Enrollment.findOne({ user: req.user._id, razorpayOrderId: razorpay_order_id });
  if (!enrollment) {
    res.status(404);
    throw new Error('Enrollment not found for this order');
  }

  enrollment.paymentStatus = 'PAID';
  enrollment.paymentReference = razorpay_payment_id;
  enrollment.razorpayPaymentId = razorpay_payment_id;
  enrollment.razorpaySignature = razorpay_signature;
  enrollment.paidAt = new Date();
  await enrollment.save();

  res.json({ status: 'ok', enrollmentId: enrollment._id.toString() });
});

// POST /api/payments/fail
const recordFailure = asyncHandler(async (req, res) => {
  const { razorpay_order_id } = req.body || {};
  if (!razorpay_order_id) {
    res.status(400);
    throw new Error('razorpay_order_id is required');
  }

  const enrollment = await Enrollment.findOne({ user: req.user._id, razorpayOrderId: razorpay_order_id });
  if (!enrollment) {
    res.status(404);
    throw new Error('Enrollment not found for this order');
  }

  enrollment.paymentStatus = 'FAILED';
  enrollment.paymentReference = '';
  enrollment.razorpayPaymentId = '';
  enrollment.razorpaySignature = '';
  await enrollment.save();

  res.json({ status: 'failed-recorded', enrollmentId: enrollment._id.toString() });
});

module.exports = {
  createCourseOrder,
  verifyPayment,
  recordFailure,
};
