/*
  Contact controller
  - Handles public contact submissions and admin status updates
*/
const asyncHandler = require('express-async-handler');
const ContactInquiry = require('../models/ContactInquiry');

const CONTACT_STATUS_VALUES = ['pending', 'contacted', 'unable_to_contact'];

const serializeInquiry = (inquiry) => ({
  id: inquiry._id.toString(),
  name: inquiry.name,
  email: inquiry.email,
  phone: inquiry.phone,
  region: inquiry.region,
  institution: inquiry.institution,
  course: inquiry.course,
  message: inquiry.message,
  contactStatus: inquiry.contactStatus,
  leadGenerated: inquiry.leadGenerated,
  inquirySolved: inquiry.inquirySolved,
  createdAt: inquiry.createdAt,
  updatedAt: inquiry.updatedAt,
});

const createContactInquiry = asyncHandler(async (req, res) => {
  const { name, email, phone, region, institution, course, message } = req.body || {};

  if (!name || !email || !phone || !region || !institution || !course || !message) {
    res.status(400);
    throw new Error('All fields are required');
  }

  const inquiry = await ContactInquiry.create({
    name,
    email,
    phone,
    region,
    institution,
    course,
    message,
  });

  res.status(201).json({
    message: 'Inquiry submitted successfully',
    inquiryId: inquiry._id,
  });
});

const buildRegionFilter = (regionValue) => {
  if (!regionValue) {
    return null;
  }

  const tokens = String(regionValue)
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean);

  if (!tokens.length) {
    return null;
  }

  if (tokens.length === 1) {
    const escaped = tokens[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`^${escaped}$`, 'i');
  }

  return {
    $in: tokens.map((token) => {
      const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`^${escaped}$`, 'i');
    }),
  };
};

const listContactInquiries = asyncHandler(async (req, res) => {
  const { search, region } = req.query || {};

  const filter = {};

  if (search && search.trim()) {
    const normalizedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(normalizedSearch, 'i');
    filter.$or = [
      { name: regex },
      { email: regex },
      { phone: regex },
      { region: regex },
      { institution: regex },
      { course: regex },
      { message: regex },
    ];
  }

  const regionFilter = buildRegionFilter(region);

  if (regionFilter) {
    filter.region = regionFilter;
  }

  const inquiries = await ContactInquiry.find(filter)
    .sort({ createdAt: -1 })
    .lean();

  const items = inquiries.map(serializeInquiry);

  res.json({
    items,
    total: items.length,
  });
});

const updateContactInquiryStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { contactStatus, leadGenerated, inquirySolved } = req.body || {};

  const inquiry = await ContactInquiry.findById(id);

  if (!inquiry) {
    res.status(404);
    throw new Error('Inquiry not found');
  }

  if (contactStatus !== undefined) {
    if (!CONTACT_STATUS_VALUES.includes(contactStatus)) {
      res.status(400);
      throw new Error('Invalid contact status');
    }

    inquiry.contactStatus = contactStatus;
  }

  if (!CONTACT_STATUS_VALUES.includes(inquiry.contactStatus)) {
    res.status(400);
    throw new Error('Invalid contact status');
  }

  if (inquiry.contactStatus === 'contacted') {
    if (leadGenerated === undefined || inquirySolved === undefined) {
      res.status(400);
      throw new Error('Lead generated and inquiry solved status are required when marked as contacted');
    }

    inquiry.leadGenerated = !!leadGenerated;
    inquiry.inquirySolved = !!inquirySolved;
  } else {
    inquiry.leadGenerated = null;
    inquiry.inquirySolved = null;
  }

  await inquiry.save();

  res.json({
    message: 'Inquiry updated successfully',
    item: serializeInquiry(inquiry),
  });
});

module.exports = {
  createContactInquiry,
  listContactInquiries,
  updateContactInquiryStatus,
};
