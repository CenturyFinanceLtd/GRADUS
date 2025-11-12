/*
  Public event routes
  - Mounted at /api/events
  - Lists/pulls published events for the marketing site
*/
const express = require('express');
const { listPublicEvents, getPublicEvent } = require('../controllers/eventController');

const router = express.Router();

router.get('/', listPublicEvents);
router.get('/:slugOrId', getPublicEvent);

module.exports = router;

