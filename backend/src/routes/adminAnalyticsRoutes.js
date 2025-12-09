/*
  Admin > Analytics routes
  - Aggregate/report analytics for the admin portal
  - Mounted at /api/admin/analytics
*/
const express = require('express');
const {
  fetchBlogEngagementStats,
  fetchPageViewStats,
  fetchVisitorSummary,
  fetchMonthlyVisitors,
  fetchVisitorLocationStats,
} = require('../controllers/analyticsController');
const { protectAdmin } = require('../middleware/adminAuthMiddleware');

const router = express.Router();

router.get('/blogs/engagement', protectAdmin, fetchBlogEngagementStats);
router.get('/page-views', protectAdmin, fetchPageViewStats);
router.get('/visitors/summary', protectAdmin, fetchVisitorSummary);
router.get('/visitors/monthly', protectAdmin, fetchMonthlyVisitors);
router.get('/visitors/locations', protectAdmin, fetchVisitorLocationStats);

module.exports = router;
