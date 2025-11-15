/*
  Public expert videos API
  - GET /api/expert-videos
*/
const express = require('express');
const { listPublicExpertVideos } = require('../controllers/expertVideoController');

const router = express.Router();

router.get('/', listPublicExpertVideos);

module.exports = router;

