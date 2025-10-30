/*
  User ticket routes
  - Mounted at /api/tickets
*/
const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  listMyTickets,
  createTicket,
  getMyTicketDetails,
  addMyTicketMessage,
  closeMyTicket,
} = require('../controllers/ticketController');

const router = express.Router();

router.get('/', protect, listMyTickets);
router.post('/', protect, createTicket);
router.get('/:id', protect, getMyTicketDetails);
router.post('/:id/messages', protect, addMyTicketMessage);
router.put('/:id/close', protect, closeMyTicket);

module.exports = router;

