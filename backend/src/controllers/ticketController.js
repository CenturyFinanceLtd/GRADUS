/*
  Ticket controller (user-facing)
  - Create ticket, list own tickets, view details, add messages, close/reopen
*/
const asyncHandler = require("express-async-handler");
const {
  Ticket,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  TICKET_CATEGORIES,
} = require("../models/Ticket");
const TicketMessage = require("../models/TicketMessage");

const serializeTicket = (ticket) => ({
  id: ticket._id.toString(),
  subject: ticket.subject,

  status: ticket.status,
  assignedTo: ticket.assignedTo ? ticket.assignedTo.toString() : null,
  lastMessageAt: ticket.lastMessageAt,
  messageCount: ticket.messageCount || 0,
  resolutionOutcome: ticket.resolutionOutcome || "unknown",
  createdAt: ticket.createdAt,
  updatedAt: ticket.updatedAt,
});

const serializeMessage = (msg) => ({
  id: msg._id.toString(),
  ticketId: msg.ticket.toString(),
  authorType: msg.authorType,
  authorUser: msg.authorUser ? msg.authorUser.toString() : null,
  authorAdmin: msg.authorAdmin ? msg.authorAdmin.toString() : null,
  body: msg.body,
  createdAt: msg.createdAt,
});

const listMyTickets = asyncHandler(async (req, res) => {
  const { status } = req.query || {};
  const filter = { user: req.user._id };

  if (status && TICKET_STATUSES.includes(status)) {
    filter.status = status;
  }

  const tickets = await Ticket.find(filter).sort({ lastMessageAt: -1 }).lean();
  const items = tickets.map(serializeTicket);
  res.json({ items, total: items.length });
});

const createTicket = asyncHandler(async (req, res) => {
  if (!subject || !description) {
    res.status(400);
    throw new Error("Subject and description are required");
  }

  const ticket = await Ticket.create({
    user: req.user._id,
    subject: subject.trim(),
  });

  await TicketMessage.create({
    ticket: ticket._id,
    authorType: "user",
    authorUser: req.user._id,
    body: description.trim(),
  });

  ticket.messageCount = 1;
  ticket.lastMessageAt = new Date();
  await ticket.save();

  res
    .status(201)
    .json({ message: "Ticket created", item: serializeTicket(ticket) });
});

const getMyTicketDetails = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const ticket = await Ticket.findOne({ _id: id, user: req.user._id }).lean();
  if (!ticket) {
    res.status(404);
    throw new Error("Ticket not found");
  }

  const messages = await TicketMessage.find({ ticket: id })
    .sort({ createdAt: 1 })
    .lean();
  res.json({
    item: serializeTicket(ticket),
    messages: messages.map(serializeMessage),
  });
});

const addMyTicketMessage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { body } = req.body || {};

  if (!body || !body.trim()) {
    res.status(400);
    throw new Error("Message body is required");
  }

  const ticket = await Ticket.findOne({ _id: id, user: req.user._id });
  if (!ticket) {
    res.status(404);
    throw new Error("Ticket not found");
  }

  // Prevent posting to closed tickets
  if (ticket.status === "closed") {
    res.status(400);
    throw new Error("Ticket is closed");
  }

  const message = await TicketMessage.create({
    ticket: ticket._id,
    authorType: "user",
    authorUser: req.user._id,
    body: body.trim(),
  });

  ticket.messageCount = (ticket.messageCount || 0) + 1;
  ticket.lastMessageAt = message.createdAt;
  // If the ticket was resolved, bump to in_progress on new user reply
  if (ticket.status !== "pending_confirmation") {
    ticket.status = "in_progress";
  }
  await ticket.save();

  res
    .status(201)
    .json({ message: "Message added", item: serializeMessage(message) });
});

const closeMyTicket = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const ticket = await Ticket.findOne({ _id: id, user: req.user._id });
  if (!ticket) {
    res.status(404);
    throw new Error("Ticket not found");
  }

  ticket.status = "closed";
  await ticket.save();
  res.json({ message: "Ticket closed", item: serializeTicket(ticket) });
});

module.exports = {
  listMyTickets,
  createTicket,
  getMyTicketDetails,
  addMyTicketMessage,
  closeMyTicket,
};
