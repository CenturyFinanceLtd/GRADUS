/*
  Public analytics routes
  - Track site events/visits from the public site
  - Mounted at /api/analytics
*/
const express = require('express');
const { recordSiteVisit } = require('../controllers/analyticsController');

const router = express.Router();

router.post('/visits', recordSiteVisit);

module.exports = router;
