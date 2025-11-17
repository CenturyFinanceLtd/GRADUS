/*
  Public partner logos routes
  - GET /api/partners
*/
const express = require('express');
const { listPublicPartners } = require('../controllers/partnerController');

const router = express.Router();

router.get('/', listPublicPartners);

module.exports = router;
