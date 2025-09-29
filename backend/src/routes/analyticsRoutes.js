const express = require('express');
const { recordSiteVisit } = require('../controllers/analyticsController');

const router = express.Router();

router.post('/visits', recordSiteVisit);

module.exports = router;
