/*
  Public live session routes
  - Exposes read-only endpoints for learners to discover and join active sessions
*/
const express = require('express');
const {
  getActiveLiveSession,
  getLiveSessionByCode,
} = require('../controllers/liveSessionController');

const router = express.Router();

router.get('/active', getActiveLiveSession);
router.get('/code/:viewerCode', getLiveSessionByCode);

module.exports = router;

