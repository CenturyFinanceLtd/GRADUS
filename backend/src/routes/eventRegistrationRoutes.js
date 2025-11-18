/*
  Event registration routes
  - Public submission endpoint and admin CRUD
  - Mounted at /api/event-registrations
*/
const express = require('express');
const {
  createEventRegistration,
  listEventRegistrations,
  getEventRegistration,
  updateEventRegistration,
  deleteEventRegistration,
} = require('../controllers/eventRegistrationController');
const { protectAdmin } = require('../middleware/adminAuthMiddleware');

const router = express.Router();

router
  .route('/')
  .post(createEventRegistration)
  .get(protectAdmin, listEventRegistrations);

router
  .route('/:id')
  .get(protectAdmin, getEventRegistration)
  .patch(protectAdmin, updateEventRegistration)
  .delete(protectAdmin, deleteEventRegistration);

module.exports = router;
