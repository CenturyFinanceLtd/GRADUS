/*
  TicketMessage model
  - Conversation entries for a support ticket
  - Author can be a user or admin; keep explicit authorType
*/
const mongoose = require('mongoose');

const ticketMessageSchema = new mongoose.Schema(
  {
    ticket: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', required: true, index: true },
    authorType: { type: String, enum: ['user', 'admin'], required: true },
    authorUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    authorAdmin: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser', default: null },
    body: { type: String, required: true, trim: true },
  },
  { timestamps: true, collection: 'customer_support_messages' }
);

ticketMessageSchema.index({ ticket: 1, createdAt: 1 });

const TicketMessage = mongoose.model('TicketMessage', ticketMessageSchema);

module.exports = TicketMessage;
