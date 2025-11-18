/*
  Contact controller
  - Handles public contact submissions and admin status updates
*/
const asyncHandler = require('express-async-handler');
const ContactInquiry = require('../models/ContactInquiry');
const { createEventRegistrationEntry } = require('./eventRegistrationController');

const CONTACT_STATUS_VALUES = ['pending', 'contacted', 'unable_to_contact'];

const serializeInquiry = (inquiry) => ({
  id: inquiry._id.toString(),
  name: inquiry.name,
  email: inquiry.email,
  phone: inquiry.phone,
  state: inquiry.state || '',
  region: inquiry.region,
  institution: inquiry.institution,
  qualification: inquiry.qualification || '',
  course: inquiry.course,
  message: inquiry.message,
  contactStatus: inquiry.contactStatus,
  leadGenerated: inquiry.leadGenerated,
  inquirySolved: inquiry.inquirySolved,
  createdAt: inquiry.createdAt,
  updatedAt: inquiry.updatedAt,
});

const EVENT_REGION_KEY = 'events';
const isEventRegion = (value) =>
  typeof value === 'string' && value.trim().toLowerCase() === EVENT_REGION_KEY;

const createContactInquiry = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    phone,
    state,
    region,
    institution,
    course,
    message,
    qualification,
    eventDetails,
  } = req.body || {};

  const trimmedName = (name || '').trim();
  const trimmedEmail = (email || '').trim();
  const trimmedPhone = (phone || '').trim();
  const trimmedRegion = (region || '').trim();
  const trimmedInstitution = (institution || '').trim();
  const trimmedCourse = (course || '').trim();
  const trimmedMessage = (message || '').trim();
  const trimmedQualification = (qualification || '').trim();
  const normalizedState = (state || '').trim();
  const eventRegion = isEventRegion(trimmedRegion);

  if (!trimmedName || !trimmedEmail || !trimmedPhone || !trimmedRegion) {
    res.status(400);
    throw new Error('Name, email, phone, and region are required');
  }

  if (eventRegion) {
    if (!normalizedState) {
      res.status(400);
      throw new Error('State is required for event registrations');
    }
    if (!trimmedQualification) {
      res.status(400);
      throw new Error('Qualification is required for event registrations');
    }
  } else if (!trimmedInstitution || !trimmedCourse || !trimmedMessage) {
    res.status(400);
    throw new Error('Institution, course, and message are required');
  }

  const courseValue = trimmedCourse || (eventRegion ? 'Event interest' : '');
  const messageValue =
    trimmedMessage || (eventRegion ? `Interested in ${courseValue || 'event'} masterclass` : '');
  const institutionValue = eventRegion
    ? trimmedInstitution || trimmedQualification || 'Not provided'
    : trimmedInstitution;

  if (eventRegion) {
    let registration;
    try {
      registration = await createEventRegistrationEntry({
        name: trimmedName,
        email: trimmedEmail,
        phone: trimmedPhone,
        state: normalizedState,
        qualification: trimmedQualification,
        course: courseValue,
        message: messageValue,
        eventDetails,
        consent: !!req.body.consent,
      });
    } catch (error) {
      res.status(error?.statusCode || 400);
      throw error;
    }

    res.status(201).json({
      message: 'Registration submitted successfully',
      registrationId: registration._id,
    });
    return;
  }

  const inquiry = await ContactInquiry.create({
    name: trimmedName,
    email: trimmedEmail,
    phone: trimmedPhone,
    state: normalizedState,
    region: trimmedRegion,
    institution: institutionValue,
    course: courseValue,
    message: messageValue,
    qualification: trimmedQualification,
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

const getContactInquiry = asyncHandler(async (req, res) => {
  const inquiry = await ContactInquiry.findById(req.params.id);

  if (!inquiry) {
    res.status(404);
    throw new Error('Inquiry not found');
  }

  res.json({ item: serializeInquiry(inquiry) });
});

const validateEventRequirements = (regionValue, stateValue, qualificationValue) => {
  if (!isEventRegion(regionValue)) {
    return;
  }

  if (!stateValue || !stateValue.trim()) {
    throw new Error('State is required for event registrations');
  }
  if (!qualificationValue || !qualificationValue.trim()) {
    throw new Error('Qualification is required for event registrations');
  }
};

const updateContactInquiry = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const inquiry = await ContactInquiry.findById(id);

  if (!inquiry) {
    res.status(404);
    throw new Error('Inquiry not found');
  }

  const updatableFields = [
    'name',
    'email',
    'phone',
    'state',
    'region',
    'institution',
    'course',
    'message',
    'qualification',
  ];

  updatableFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      inquiry[field] = typeof req.body[field] === 'string' ? req.body[field].trim() : req.body[field];
    }
  });

  try {
    validateEventRequirements(inquiry.region, inquiry.state, inquiry.qualification);
  } catch (error) {
    res.status(400);
    throw error;
  }

  const nextContactStatus = req.body.contactStatus ?? inquiry.contactStatus;
  if (!CONTACT_STATUS_VALUES.includes(nextContactStatus)) {
    res.status(400);
    throw new Error('Invalid contact status');
  }
  inquiry.contactStatus = nextContactStatus;

  if (nextContactStatus === 'contacted') {
    const leadValue =
      req.body.leadGenerated !== undefined ? req.body.leadGenerated : inquiry.leadGenerated;
    const solvedValue =
      req.body.inquirySolved !== undefined ? req.body.inquirySolved : inquiry.inquirySolved;

    if (leadValue === undefined || leadValue === null || solvedValue === undefined || solvedValue === null) {
      res.status(400);
      throw new Error('Lead generated and inquiry solved status are required when marked as contacted');
    }

    inquiry.leadGenerated = !!leadValue;
    inquiry.inquirySolved = !!solvedValue;
  } else {
    if (req.body.leadGenerated !== undefined) {
      inquiry.leadGenerated = !!req.body.leadGenerated;
    } else if (inquiry.contactStatus !== 'contacted') {
      inquiry.leadGenerated = null;
    }

    if (req.body.inquirySolved !== undefined) {
      inquiry.inquirySolved = !!req.body.inquirySolved;
    } else if (inquiry.contactStatus !== 'contacted') {
      inquiry.inquirySolved = null;
    }
  }

  await inquiry.save();

  res.json({
    message: 'Inquiry updated successfully',
    item: serializeInquiry(inquiry),
  });
});

const deleteContactInquiry = asyncHandler(async (req, res) => {
  const inquiry = await ContactInquiry.findById(req.params.id);

  if (!inquiry) {
    res.status(404);
    throw new Error('Inquiry not found');
  }

  await inquiry.deleteOne();
  res.json({ success: true });
});

module.exports = {
  createContactInquiry,
  listContactInquiries,
  getContactInquiry,
  updateContactInquiry,
  deleteContactInquiry,
};
