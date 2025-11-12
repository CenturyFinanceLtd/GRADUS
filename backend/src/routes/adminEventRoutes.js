/*
  Admin > Events routes
  - CRUD endpoints for marketing/community events
  - Mounted at /api/admin/events
*/
const express = require('express');
const { protectAdmin } = require('../middleware/adminAuthMiddleware');
const {
  listAdminEvents,
  getAdminEvent,
  createEvent,
  updateEvent,
  deleteEvent,
} = require('../controllers/eventController');

const router = express.Router();

router.use(protectAdmin);

router.get('/', listAdminEvents);
router.post('/', createEvent);
router.get('/:eventId', getAdminEvent);
router.patch('/:eventId', updateEvent);
router.delete('/:eventId', deleteEvent);

module.exports = router;

