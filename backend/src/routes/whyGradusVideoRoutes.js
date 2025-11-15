/*
  Public Why Gradus video API
*/
const express = require('express');
const { listPublicWhyGradusVideo } = require('../controllers/whyGradusVideoController');

const router = express.Router();

router.get('/', listPublicWhyGradusVideo);

module.exports = router;

