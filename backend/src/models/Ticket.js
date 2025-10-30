/*
  Ticket model
  - Tracks user support requests with priority, status, and assignment
  - Message thread stored in TicketMessage collection
*/
const mongoose = require('mongoose');

const TICKET_PRIORITIES = ['low', 'medium', 'high', 'urgent'];
// Status lifecycle aligned with requested flow
// - not_opened: created by user, no admin opened it yet
// - opened: an admin viewed the ticket
// - in_progress: two-way chat started, working on solution
// - pending_confirmation: admin requested OTP confirmation to close
// - closed: admin confirmed OTP and closed; resolutionOutcome indicates solved/unsolved
const TICKET_STATUSES = ['not_opened', 'opened', 'in_progress', 'pending_confirmation', 'closed'];
const TICKET_CATEGORIES = ['general', 'billing', 'technical', 'course', 'account', 'other'];

const ticketSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    subject: { type: String, required: true, trim: true },
    category: { type: String, enum: TICKET_CATEGORIES, default: 'general' },
    priority: { type: String, enum: TICKET_PRIORITIES, default: 'medium', index: true },
    status: { type: String, enum: TICKET_STATUSES, default: 'not_opened', index: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser', default: null, index: true },
    lastMessageAt: { type: Date, default: Date.now, index: true },
    messageCount: { type: Number, default: 0 },
    firstOpenedAt: { type: Date, default: null },
    lastOpenedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser', default: null },
    resolutionOutcome: { type: String, enum: ['solved', 'unsolved', 'unknown'], default: 'unknown' },
    closure: {
      otpHash: { type: String, default: null },
      otpRequestedAt: { type: Date, default: null },
      requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser', default: null },
      closedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser', default: null },
      closedAt: { type: Date, default: null },
    },
    assignment: {
      transfer: {
        to: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser', default: null },
        from: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser', default: null },
        requestedAt: { type: Date, default: null },
      },
      history: [
        {
          user: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
          action: { type: String, enum: ['assign', 'unassign', 'transfer_accept', 'transfer_decline'], default: 'assign' },
          at: { type: Date, default: Date.now },
          by: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
        },
      ],
    },
  },
  { timestamps: true, collection: 'customer_support_tickets' }
);

const Ticket = mongoose.model('Ticket', ticketSchema);

module.exports = { Ticket, TICKET_PRIORITIES, TICKET_STATUSES, TICKET_CATEGORIES };
