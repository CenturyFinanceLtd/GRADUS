/*
  Admin ticket routes
  - Mounted at /api/admin/tickets
*/
const express = require('express');
const { protectAdmin } = require('../middleware/adminAuthMiddleware');
const {
  listTickets,
  getTicketDetails,
  replyToTicket,
  updateTicket,
  requestClosure,
  confirmClosure,
  requestAssignment,
  acceptAssignment,
  declineAssignment,
} = require('../controllers/adminTicketController');

const router = express.Router();

router.get('/', protectAdmin, listTickets);
router.get('/:id', protectAdmin, getTicketDetails);
router.post('/:id/reply', protectAdmin, replyToTicket);
router.patch('/:id', protectAdmin, updateTicket);
router.post('/:id/request-closure', protectAdmin, requestClosure);
router.post('/:id/confirm-closure', protectAdmin, confirmClosure);
router.post('/:id/assign/request', protectAdmin, requestAssignment);
router.post('/:id/assign/accept', protectAdmin, acceptAssignment);
router.post('/:id/assign/decline', protectAdmin, declineAssignment);

module.exports = router;
