const express = require('express');
const {
  fetchBlogEngagementStats,
  fetchPageViewStats,
  fetchVisitorSummary,
  fetchMonthlyVisitors,
} = require('../controllers/analyticsController');
const { protectAdmin } = require('../middleware/adminAuthMiddleware');

const router = express.Router();

router.get('/blogs/engagement', protectAdmin, fetchBlogEngagementStats);
router.get('/page-views', protectAdmin, fetchPageViewStats);
router.get('/visitors/summary', protectAdmin, fetchVisitorSummary);
router.get('/visitors/monthly', protectAdmin, fetchMonthlyVisitors);

module.exports = router;
