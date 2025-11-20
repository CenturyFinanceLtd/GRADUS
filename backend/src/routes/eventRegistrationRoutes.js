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
  sendJoinLinkEmails,
  resendEventConfirmationEmail,
  resendEventConfirmationsBulk,
  syncEventRegistrationSheetBulk,
} = require('../controllers/eventRegistrationController');
const { protectAdmin } = require('../middleware/adminAuthMiddleware');

const router = express.Router();

router
  .route('/')
  .post(createEventRegistration)
  .get(protectAdmin, listEventRegistrations);

router.post('/send-join-link', protectAdmin, sendJoinLinkEmails);
router.post('/resend-confirmations', protectAdmin, resendEventConfirmationsBulk);
router.post('/:id/resend-confirmation', protectAdmin, resendEventConfirmationEmail);
router.post('/sync-sheet', protectAdmin, syncEventRegistrationSheetBulk);

router
  .route('/:id')
  .get(protectAdmin, getEventRegistration)
  .patch(protectAdmin, updateEventRegistration)
  .delete(protectAdmin, deleteEventRegistration);

module.exports = router;
