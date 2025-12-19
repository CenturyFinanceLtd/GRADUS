const mongoose = require('mongoose');

/*
  Event model
  - Represents marketing-facing masterclasses / upcoming events
  - Admins can publish events that become visible on the public site
*/

const HostSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: '' },
    title: { type: String, trim: true, default: '' },
    avatarUrl: { type: String, trim: true, default: '' },
    bio: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const HeroImageSchema = new mongoose.Schema(
  {
    url: { type: String, trim: true, default: '' },
    alt: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const PriceSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true, default: '' },
    amount: { type: Number, default: 0 },
    currency: { type: String, trim: true, default: 'INR' },
    isFree: { type: Boolean, default: true },
  },
  { _id: false }
);

const CtaSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true, default: 'Join us live' },
    url: { type: String, trim: true, default: '' },
    external: { type: Boolean, default: false },
  },
  { _id: false }
);

const ScheduleSchema = new mongoose.Schema(
  {
    start: { type: Date, required: true },
    end: { type: Date },
    timezone: { type: String, trim: true, default: 'Asia/Kolkata' },
  },
  { _id: false }
);

const EventSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, required: true },
    slug: { type: String, trim: true, required: true, unique: true },
    subtitle: { type: String, trim: true, default: '' },
    summary: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },
    category: { type: String, trim: true, default: 'General' },
    badge: { type: String, trim: true, default: '' },
    eventType: { type: String, trim: true, default: 'Webinar' },
    tags: { type: [String], default: [] },
    level: { type: String, trim: true, default: '' },
    trackLabel: { type: String, trim: true, default: '' },
    heroImage: { type: HeroImageSchema, default: () => ({}) },
    host: { type: HostSchema, default: () => ({}) },
    price: { type: PriceSchema, default: () => ({}) },
    cta: { type: CtaSchema, default: () => ({}) },
    schedule: { type: ScheduleSchema, required: true },
    mode: {
      type: String,
      enum: ['online', 'in-person', 'hybrid'],
      default: 'online',
    },
    location: { type: String, trim: true, default: '' },
    seatLimit: { type: Number },
    durationMinutes: { type: Number },
    recordingAvailable: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
    },
    sortOrder: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
    meta: {
      highlights: { type: [String], default: [] },
      agenda: { type: [String], default: [] },
    },
    isMasterclass: { type: Boolean, default: false },
    masterclassDetails: {
      overview: {
        whyMatters: {
          title: { type: String, default: '' },
          description: { type: String, default: '' },
        },
        whoIsFor: { type: [String], default: [] },
        howItWorks: [{
          step: Number,
          title: String,
          description: String
        }],
        outcomes: { type: [String], default: [] },
        tools: { type: [String], default: [] },
        bonuses: { type: [String], default: [] },
        community: { type: [String], default: [] },
      },
      curriculum: [{
        title: String,
        description: String,
        icon: { type: String, default: 'fa-solid fa-book' } // FontAwesome icon class
      }],
      faqs: [{
        question: String,
        answer: String
      }]
    }
  },
  {
    timestamps: true,
  }
);

EventSchema.index({ status: 1, 'schedule.start': 1 });
EventSchema.index({ category: 1, status: 1 });

module.exports = mongoose.model('Event', EventSchema);
