/*
  Admin Ticket controller
  - List, view, update, assign, and reply to tickets
*/
const asyncHandler = require('express-async-handler');
const { Ticket, TICKET_PRIORITIES, TICKET_STATUSES, TICKET_CATEGORIES } = require('../models/Ticket');
const TicketMessage = require('../models/TicketMessage');
const User = require('../models/User');
const crypto = require('crypto');
const { sendOtpEmail } = require('../utils/email');

const serializeTicketAdmin = (ticket, withUser = false) => {
  const base = {
    id: ticket._id.toString(),
    subject: ticket.subject,
    category: ticket.category,
    priority: ticket.priority,
    status: ticket.status,
    assignedTo: ticket.assignedTo ? (ticket.assignedTo._id ? ticket.assignedTo._id.toString() : ticket.assignedTo.toString()) : null,
    assignee: ticket.assignedTo && ticket.assignedTo._id
      ? { id: ticket.assignedTo._id.toString(), name: ticket.assignedTo.fullName, email: ticket.assignedTo.email }
      : null,
    lastMessageAt: ticket.lastMessageAt,
    messageCount: ticket.messageCount || 0,
    resolutionOutcome: ticket.resolutionOutcome || 'unknown',
    closedAt: ticket.closure?.closedAt || null,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
  };

  if (withUser) {
    base.user = ticket.user
      ? {
          id: ticket.user._id?.toString?.() || ticket.user.toString(),
          firstName: ticket.user.firstName,
          lastName: ticket.user.lastName,
          email: ticket.user.email,
        }
      : null;
  }

  if (ticket.assignment) {
    const tr = ticket.assignment.transfer || {};
    base.assignment = {
      transfer: tr && (tr.to || tr.from)
        ? {
            to: tr.to && tr.to._id ? { id: tr.to._id.toString(), name: tr.to.fullName, email: tr.to.email } : (tr.to ? { id: tr.to.toString() } : null),
            from: tr.from && tr.from._id ? { id: tr.from._id.toString(), name: tr.from.fullName, email: tr.from.email } : (tr.from ? { id: tr.from.toString() } : null),
            requestedAt: tr.requestedAt || null,
          }
        : null,
      history: Array.isArray(ticket.assignment.history)
        ? ticket.assignment.history.map((h) => ({
            user: h.user && h.user._id ? { id: h.user._id.toString(), name: h.user.fullName, email: h.user.email } : (h.user ? { id: h.user.toString() } : null),
            action: h.action,
            at: h.at,
            by: h.by && h.by._id ? { id: h.by._id.toString(), name: h.by.fullName, email: h.by.email } : (h.by ? { id: h.by.toString() } : null),
          }))
        : [],
    };
  }

  return base;
};

const buildFilter = ({ status, priority, search, outcome }) => {
  const filter = {};
  if (status && TICKET_STATUSES.includes(status)) {
    filter.status = status;
  }
  if (priority && TICKET_PRIORITIES.includes(priority)) {
    filter.priority = priority;
  }
  if (search && String(search).trim()) {
    const q = String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(q, 'i');
    filter.$or = [{ subject: regex }];
  }
  if (outcome && ['solved','unsolved','unknown'].includes(String(outcome))) {
    filter.resolutionOutcome = outcome;
  }
  return filter;
};

const listTickets = asyncHandler(async (req, res) => {
  const { status, priority, search, outcome } = req.query || {};
  const filter = buildFilter({ status, priority, search, outcome });

  const tickets = await Ticket.find(filter)
    .sort({ lastMessageAt: -1 })
    .populate('user', 'firstName lastName email')
    .lean();

  const items = tickets.map((t) => serializeTicketAdmin(t, true));
  res.json({ items, total: items.length });
});

const getTicketDetails = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const ticketDoc = await Ticket.findById(id)
    .populate('user', 'firstName lastName email')
    .populate('assignedTo', 'fullName email')
    .populate('assignment.transfer.to', 'fullName email')
    .populate('assignment.transfer.from', 'fullName email')
    .populate('assignment.history.user', 'fullName email')
    .populate('assignment.history.by', 'fullName email');
  if (!ticketDoc) {
    res.status(404);
    throw new Error('Ticket not found');
  }
  // Transition from not_opened -> opened when first viewed
  if (ticketDoc.status === 'not_opened') {
    ticketDoc.status = 'opened';
    ticketDoc.firstOpenedAt = new Date();
  }
  ticketDoc.lastOpenedBy = req.admin._id;
  await ticketDoc.save();

  const ticket = ticketDoc.toObject();
  const messages = await TicketMessage.find({ ticket: id }).sort({ createdAt: 1 }).lean();
  const serializeMessage = (msg) => ({
    id: msg._id.toString(),
    ticketId: msg.ticket.toString(),
    authorType: msg.authorType,
    authorUser: msg.authorUser ? msg.authorUser.toString() : null,
    authorAdmin: msg.authorAdmin ? msg.authorAdmin.toString() : null,
    body: msg.body,
    createdAt: msg.createdAt,
  });
  res.json({ item: serializeTicketAdmin(ticket, true), messages: messages.map(serializeMessage) });
});

const replyToTicket = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { body, newStatus } = req.body || {};

  if (!body || !body.trim()) {
    res.status(400);
    throw new Error('Message body is required');
  }

  const ticket = await Ticket.findById(id);
  if (!ticket) {
    res.status(404);
    throw new Error('Ticket not found');
  }

  // Only assigned admin may reply and closed tickets cannot be replied to
  if (!ticket.assignedTo || ticket.assignedTo.toString() !== req.admin._id.toString()) {
    res.status(403);
    throw new Error('Only the assigned admin can reply to this ticket. Assign it to yourself first.');
  }
  if (ticket.status === 'closed') {
    res.status(400);
    throw new Error('Ticket is closed and cannot be replied to.');
  }

  const message = await TicketMessage.create({
    ticket: ticket._id,
    authorType: 'admin',
    authorAdmin: req.admin._id,
    body: body.trim(),
  });

  ticket.messageCount = (ticket.messageCount || 0) + 1;
  ticket.lastMessageAt = message.createdAt;
  if (newStatus && TICKET_STATUSES.includes(newStatus)) {
    ticket.status = newStatus;
  } else if (['opened', 'not_opened', 'pending_confirmation'].includes(ticket.status)) {
    ticket.status = 'in_progress';
  }
  await ticket.save();

  res.status(201).json({ message: 'Reply posted', item: {
    id: message._id.toString(),
    ticketId: message.ticket.toString(),
    authorType: message.authorType,
    authorUser: null,
    authorAdmin: req.admin._id.toString(),
    body: message.body,
    createdAt: message.createdAt,
  }});
});

const updateTicket = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, priority, category, assignedTo } = req.body || {};

  const ticket = await Ticket.findById(id);
  if (!ticket) {
    res.status(404);
    throw new Error('Ticket not found');
  }

  if (status !== undefined) {
    // Disallow reopening after closed
    if (ticket.status === 'closed' && status !== 'closed') {
      res.status(400);
      throw new Error('Closed tickets cannot be reopened.');
    }
    if (!TICKET_STATUSES.includes(status)) {
      res.status(400);
      throw new Error('Invalid status');
    }
    ticket.status = status;
  }

  if (priority !== undefined) {
    if (!TICKET_PRIORITIES.includes(priority)) {
      res.status(400);
      throw new Error('Invalid priority');
    }
    ticket.priority = priority;
  }

  if (category !== undefined) {
    if (!TICKET_CATEGORIES.includes(category)) {
      res.status(400);
      throw new Error('Invalid category');
    }
    ticket.category = category;
  }

  if (assignedTo !== undefined) {
    const actorId = req.admin._id.toString();
    const current = ticket.assignedTo ? ticket.assignedTo.toString() : null;

    // Disallow assignment changes on closed tickets (optional strong rule)
    if (ticket.status === 'closed') {
      res.status(400);
      throw new Error('Closed tickets cannot be reassigned.');
    }

    if (assignedTo === null) {
      // Unassign: only current assignee can unassign
      if (!current || current !== actorId) {
        res.status(403);
        throw new Error('Only the current assignee can unassign this ticket.');
      }
      ticket.assignedTo = null;
      ticket.assignment = ticket.assignment || {}; 
      ticket.assignment.history = ticket.assignment.history || [];
      ticket.assignment.history.push({ user: req.admin._id, action: 'unassign', at: new Date(), by: req.admin._id });
    } else {
      // Set assignee
      const targetId = String(assignedTo);
      if (current && current !== actorId) {
        // Already assigned to someone else — require transfer flow
        res.status(409);
        throw new Error('Ticket is already assigned. Ask the current assignee to transfer or unassign.');
      }
      if (!current) {
        // Unassigned: allow only self-assign here; use transfer endpoints for assigning others
        if (targetId !== actorId) {
          res.status(403);
          throw new Error('You can only assign unassigned tickets to yourself. Use "Assign to other" to request transfer.');
        }
      }
      ticket.assignedTo = targetId;
      ticket.assignment = ticket.assignment || {}; 
      ticket.assignment.history = ticket.assignment.history || [];
      ticket.assignment.history.push({ user: req.admin._id, action: 'assign', at: new Date(), by: req.admin._id });
    }
  }

  await ticket.save();
  res.json({ message: 'Ticket updated', item: serializeTicketAdmin(ticket) });
});

const generateOtp = () => (Math.floor(100000 + Math.random() * 900000)).toString();
const hashOtp = (otp) => crypto.createHash('sha256').update(String(otp)).digest('hex');

// Request closure with OTP sent to user's email
const requestClosure = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const ticket = await Ticket.findById(id).populate('user', 'email firstName');
  if (!ticket) {
    res.status(404);
    throw new Error('Ticket not found');
  }
  if (ticket.status === 'closed') {
    res.status(400);
    throw new Error('Ticket already closed');
  }

  const otp = generateOtp();
  ticket.status = 'pending_confirmation';
  ticket.closure.otpHash = hashOtp(otp);
  ticket.closure.otpRequestedAt = new Date();
  ticket.closure.requestedBy = req.admin._id;
  await ticket.save();

  await sendOtpEmail({
    to: ticket.user.email,
    otp,
    subject: 'Confirm ticket resolution',
    context: {
      title: 'Confirm Resolution',
      action: 'confirming the resolution of your support ticket',
    },
  });

  res.json({ message: 'OTP sent to user email for confirmation.' });
});

// Confirm closure by entering OTP and outcome (solved/unsolved)
const confirmClosure = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { otp, solved } = req.body || {};
  const ticket = await Ticket.findById(id);
  if (!ticket) {
    res.status(404);
    throw new Error('Ticket not found');
  }
  if (ticket.status !== 'pending_confirmation') {
    res.status(400);
    throw new Error('Ticket is not pending confirmation');
  }
  const EXPECTED_TTL_MS = 10 * 60 * 1000; // 10 minutes
  const now = Date.now();
  if (!ticket.closure.otpHash || !ticket.closure.otpRequestedAt || now - ticket.closure.otpRequestedAt.getTime() > EXPECTED_TTL_MS) {
    res.status(400);
    throw new Error('OTP expired. Please request a new one.');
  }
  if (!otp || hashOtp(otp) !== ticket.closure.otpHash) {
    res.status(400);
    throw new Error('Invalid OTP');
  }

  ticket.status = 'closed';
  ticket.resolutionOutcome = solved === true || solved === 'true' ? 'solved' : 'unsolved';
  ticket.closure.closedAt = new Date();
  ticket.closure.closedBy = req.admin._id;
  ticket.closure.otpHash = null;
  await ticket.save();

  res.json({ message: 'Ticket closed', item: serializeTicketAdmin(ticket) });
});

// Assignment transfer APIs
const requestAssignment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { toAdminId } = req.body || {};
  if (!toAdminId) {
    res.status(400);
    throw new Error('toAdminId is required');
  }
  const ticket = await Ticket.findById(id);
  if (!ticket) {
    res.status(404);
    throw new Error('Ticket not found');
  }
  if (ticket.assignedTo && ticket.assignedTo.toString() !== req.admin._id.toString()) {
    res.status(403);
    throw new Error('Only the current assignee can request a transfer');
  }
  ticket.assignment = ticket.assignment || {};
  ticket.assignment.transfer = { to: toAdminId, from: req.admin._id, requestedAt: new Date() };
  await ticket.save();
  const populated = await Ticket.findById(id).populate('assignedTo', 'fullName email').populate('assignment.transfer.to', 'fullName email').populate('assignment.transfer.from', 'fullName email').lean();
  res.json({ message: 'Transfer requested', item: serializeTicketAdmin(populated, true) });
});

const acceptAssignment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const ticket = await Ticket.findById(id);
  if (!ticket || !ticket.assignment?.transfer?.to) {
    res.status(400);
    throw new Error('No pending transfer');
  }
  if (ticket.assignment.transfer.to.toString() !== req.admin._id.toString()) {
    res.status(403);
    throw new Error('You are not the target of this transfer');
  }
  ticket.assignment.history = ticket.assignment.history || [];
  ticket.assignment.history.push({ user: req.admin._id, action: 'transfer_accept', at: new Date(), by: ticket.assignment.transfer.from });
  ticket.assignedTo = req.admin._id;
  ticket.assignment.transfer = { to: null, from: null, requestedAt: null };
  await ticket.save();
  const populated = await Ticket.findById(id).populate('assignedTo', 'fullName email').populate('assignment.history.user', 'fullName email').populate('assignment.history.by', 'fullName email').lean();
  res.json({ message: 'Assignment accepted', item: serializeTicketAdmin(populated, true) });
});

const declineAssignment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const ticket = await Ticket.findById(id);
  if (!ticket || !ticket.assignment?.transfer?.to) {
    res.status(400);
    throw new Error('No pending transfer');
  }
  if (ticket.assignment.transfer.to.toString() !== req.admin._id.toString()) {
    res.status(403);
    throw new Error('You are not the target of this transfer');
  }
  ticket.assignment.history = ticket.assignment.history || [];
  ticket.assignment.history.push({ user: req.admin._id, action: 'transfer_decline', at: new Date(), by: ticket.assignment.transfer.from });
  ticket.assignment.transfer = { to: null, from: null, requestedAt: null };
  await ticket.save();
  const populated = await Ticket.findById(id).populate('assignedTo', 'fullName email').populate('assignment.history.user', 'fullName email').populate('assignment.history.by', 'fullName email').lean();
  res.json({ message: 'Assignment declined', item: serializeTicketAdmin(populated, true) });
});

module.exports = { listTickets, getTicketDetails, replyToTicket, updateTicket, requestClosure, confirmClosure, requestAssignment, acceptAssignment, declineAssignment };
