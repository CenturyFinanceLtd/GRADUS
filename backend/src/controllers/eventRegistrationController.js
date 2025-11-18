/*
  Event registration controller
  - Handles public event registration submissions
  - Provides admin CRUD endpoints for event registrations
*/
const asyncHandler = require('express-async-handler');
const EventRegistration = require('../models/EventRegistration');
const Event = require('../models/Event');
const { sendEmail, sendEventRegistrationEmail } = require('../utils/email');

const serializeRegistration = (registration) => ({
  id: registration._id.toString(),
  name: registration.name,
  email: registration.email,
  phone: registration.phone,
  state: registration.state || '',
  qualification: registration.qualification || '',
  course: registration.course,
  message: registration.message,
  consent: Boolean(registration.consent),
  eventDetails: registration.eventDetails || {},
  createdAt: registration.createdAt,
  updatedAt: registration.updatedAt,
});

const extractEventDetails = (rawDetails, fallbackTitle) => {
  if (!rawDetails || typeof rawDetails !== 'object') {
    return { title: fallbackTitle || '' };
  }

  const schedule = rawDetails.schedule && typeof rawDetails.schedule === 'object' ? rawDetails.schedule : {};
  const start =
    rawDetails.start || rawDetails.startsAt || schedule.start || rawDetails.eventDate || null;
  const timezone =
    rawDetails.timezone || schedule.timezone || rawDetails.eventTimezone || rawDetails.zone || '';

  return {
    title: rawDetails.title || fallbackTitle || '',
    startsAt: start,
    timezone,
    joinUrl: rawDetails.joinUrl || rawDetails.ctaUrl || rawDetails.registrationUrl || '',
    hostName: rawDetails.hostName || '',
  };
};

const findEventRecord = async (eventDetails) => {
  if (!eventDetails || typeof eventDetails !== 'object') {
    return null;
  }

  const { id, slug } = eventDetails;

  if (id) {
    try {
      const eventById = await Event.findById(id).lean();
      if (eventById) {
        return eventById;
      }
    } catch (error) {
      console.warn('[event-registration] Unable to load event by id', { id, error: error?.message });
    }
  }

  if (slug) {
    try {
      const eventBySlug = await Event.findOne({ slug }).lean();
      if (eventBySlug) {
        return eventBySlug;
      }
    } catch (error) {
      console.warn('[event-registration] Unable to load event by slug', { slug, error: error?.message });
    }
  }

  return null;
};

const buildEventEmailDetails = (rawDetails, fallbackTitle, eventRecord) => {
  const normalized = extractEventDetails(rawDetails, fallbackTitle);

  if (!eventRecord) {
    return normalized;
  }

  const schedule = eventRecord.schedule || {};
  const startValue = schedule.start
    ? schedule.start instanceof Date
      ? schedule.start.toISOString()
      : schedule.start
    : normalized.startsAt;

  return {
    title: eventRecord.title || normalized.title,
    startsAt: startValue,
    timezone: schedule.timezone || normalized.timezone,
    joinUrl: (eventRecord.cta && eventRecord.cta.url) || normalized.joinUrl,
    hostName: (eventRecord.host && eventRecord.host.name) || normalized.hostName,
  };
};

const normalizePayload = (payload = {}) => {
  const trimmedName = (payload.name || '').trim();
  const trimmedEmail = (payload.email || '').trim().toLowerCase();
  const trimmedPhone = (payload.phone || '').trim();
  const trimmedState = (payload.state || '').trim();
  const trimmedQualification = (payload.qualification || '').trim();
  const trimmedCourse = (payload.course || '').trim();
  const trimmedMessage = (payload.message || '').trim();

  if (!trimmedName || !trimmedEmail || !trimmedPhone || !trimmedState || !trimmedQualification) {
    const error = new Error('Name, email, phone, state, and qualification are required for event registrations');
    error.statusCode = 400;
    throw error;
  }

  const courseValue = trimmedCourse || 'Event';
  const messageValue = trimmedMessage || `Interested in ${courseValue} event`;

  return {
    name: trimmedName,
    email: trimmedEmail,
    phone: trimmedPhone,
    state: trimmedState,
    qualification: trimmedQualification,
    course: courseValue,
    message: messageValue,
    consent: !!payload.consent,
    eventDetails: payload.eventDetails && typeof payload.eventDetails === 'object' ? payload.eventDetails : {},
  };
};

const checkDuplicateRegistration = async ({ email, phone, excludeId } = {}) => {
  const conditions = [];
  if (email) {
    conditions.push({ email: email.toLowerCase() });
  }
  if (phone) {
    conditions.push({ phone });
  }

  if (!conditions.length) return;

  const query = { $or: conditions };
  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  const existing = await EventRegistration.findOne(query).lean();
  if (!existing) return;

  const emailMatch = email && existing.email.toLowerCase() === email.toLowerCase();
  const phoneMatch = phone && existing.phone === phone;

  let message = 'Already registered';
  if (emailMatch && phoneMatch) {
    message = 'Email and mobile number are already registered';
  } else if (emailMatch) {
    message = 'Email is already registered';
  } else if (phoneMatch) {
    message = 'Mobile number is already registered';
  }

  const error = new Error(message);
  error.statusCode = 400;
  throw error;
};

const sendEventConfirmation = async (registration, eventDetails) => {
  const eventRecord = await findEventRecord(eventDetails);
  const details = buildEventEmailDetails(eventDetails, registration.course, eventRecord);

  try {
    await sendEventRegistrationEmail({
      to: registration.email,
      name: registration.name,
      eventTitle: details.title || registration.course,
      startsAt: details.startsAt,
      timezone: details.timezone,
      joinUrl: details.joinUrl,
      hostName: details.hostName,
    });
  } catch (error) {
    console.error('[event-registration] Failed to send event confirmation email', {
      error: error?.message,
      email: registration.email,
      course: registration.course,
    });
  }
};

// Shared helper so contact controller can delegate event registrations here
const createEventRegistrationEntry = async (payload = {}) => {
  const normalized = normalizePayload(payload);
  await checkDuplicateRegistration({ email: normalized.email, phone: normalized.phone });
  const registration = await EventRegistration.create(normalized);
  await sendEventConfirmation(registration, normalized.eventDetails);
  return registration;
};

const listEventRegistrations = asyncHandler(async (req, res) => {
  const { search } = req.query || {};
  const filter = {};

  if (search && search.trim()) {
    const normalizedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(normalizedSearch, 'i');
    filter.$or = [
      { name: regex },
      { email: regex },
      { phone: regex },
      { state: regex },
      { qualification: regex },
      { course: regex },
      { message: regex },
    ];
  }

  const registrations = await EventRegistration.find(filter).sort({ createdAt: -1 }).lean();
  const items = registrations.map(serializeRegistration);

  res.json({
    items,
    total: items.length,
  });
});

const getEventRegistration = asyncHandler(async (req, res) => {
  const registration = await EventRegistration.findById(req.params.id);

  if (!registration) {
    res.status(404);
    throw new Error('Event registration not found');
  }

  res.json({ item: serializeRegistration(registration) });
});

const createEventRegistration = asyncHandler(async (req, res) => {
  try {
    const registration = await createEventRegistrationEntry(req.body || {});

    res.status(201).json({
      message: 'Registration submitted successfully',
      registrationId: registration._id,
    });
  } catch (error) {
    res.status(error?.statusCode || 400);
    throw error;
  }
});

const updateEventRegistration = asyncHandler(async (req, res) => {
  const registration = await EventRegistration.findById(req.params.id);

  if (!registration) {
    res.status(404);
    throw new Error('Event registration not found');
  }

  const updatableFields = [
    'name',
    'email',
    'phone',
    'state',
    'qualification',
    'course',
    'message',
    'consent',
    'eventDetails',
  ];

  updatableFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      const value = req.body[field];
      registration[field] =
        typeof value === 'string' && field !== 'eventDetails' ? value.trim() : value;
    }
  });

  // Ensure required fields remain valid after update
  let normalized;
  try {
    normalized = normalizePayload(registration);
  } catch (error) {
    res.status(error?.statusCode || 400);
    throw error;
  }
  registration.name = normalized.name;
  registration.email = normalized.email;
  registration.phone = normalized.phone;
  registration.state = normalized.state;
  registration.qualification = normalized.qualification;
  registration.course = normalized.course;
  registration.message = normalized.message;
  registration.consent = normalized.consent;
  registration.eventDetails = normalized.eventDetails;

  await checkDuplicateRegistration({
    email: registration.email,
    phone: registration.phone,
    excludeId: registration._id,
  });

  await registration.save();

  res.json({
    message: 'Event registration updated successfully',
    item: serializeRegistration(registration),
  });
});

const deleteEventRegistration = asyncHandler(async (req, res) => {
  const registration = await EventRegistration.findById(req.params.id);

  if (!registration) {
    res.status(404);
    throw new Error('Event registration not found');
  }

  await registration.deleteOne();
  res.json({ success: true });
});

const sendJoinLinkEmails = asyncHandler(async (req, res) => {
  const { registrationIds, joinUrl, subject, additionalNote } = req.body || {};

  const normalizedJoinUrl = (joinUrl || '').trim();
  if (!normalizedJoinUrl) {
    res.status(400);
    throw new Error('Join URL is required');
  }

  const ids = Array.isArray(registrationIds) ? registrationIds.filter(Boolean) : [];
  if (!ids.length) {
    res.status(400);
    throw new Error('Select at least one registration to send the link');
  }

  const registrations = await EventRegistration.find({ _id: { $in: ids } }).lean();
  if (!registrations.length) {
    res.status(404);
    throw new Error('No registrations found for the provided IDs');
  }

  const emailSubject = (subject || 'Join link for your upcoming webinar').trim();
  const note = (additionalNote || '').trim();
  let sentCount = 0;
  const failures = [];

  await Promise.all(
    registrations.map(async (registration) => {
      const displayName = registration.name || 'Learner';
      const displayCourse = registration.course || 'your webinar';
      const textLines = [
        `Hi ${displayName},`,
        '',
        `Here is the join link for ${displayCourse}:`,
        normalizedJoinUrl,
        '',
        note ? note : null,
        'See you there!',
        'Team Gradus',
      ].filter(Boolean);

      const html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1F2937;">
          <p style="margin: 0 0 12px;">Hi ${displayName},</p>
          <p style="margin: 0 0 12px;">Here is the join link for <strong>${displayCourse}</strong>:</p>
          <p style="margin: 0 0 16px;">
            <a href="${normalizedJoinUrl}" style="color: #0B5394;">${normalizedJoinUrl}</a>
          </p>
          ${note ? `<p style="margin: 0 0 12px;">${note}</p>` : ''}
          <p style="margin: 0 0 12px;">See you there!</p>
          <p style="margin: 0;">Team Gradus</p>
        </div>
      `;

      try {
        await sendEmail({
          to: registration.email,
          subject: emailSubject,
          text: textLines.join('\n'),
          html,
        });
        sentCount += 1;
      } catch (error) {
        failures.push({
          id: registration._id.toString(),
          email: registration.email,
          error: error?.message || 'Failed to send',
        });
        console.error('[event-registration] Failed to send join link email', {
          id: registration._id,
          email: registration.email,
          error: error?.message,
        });
      }
    })
  );

  res.json({
    message: 'Join link emails processed',
    sent: sentCount,
    total: registrations.length,
    failed: failures,
  });
});

const resendEventConfirmationEmail = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const registration = await EventRegistration.findById(id);
  if (!registration) {
    res.status(404);
    throw new Error('Event registration not found');
  }

  await sendEventConfirmation(registration, registration.eventDetails || {});

  res.json({
    message: 'Confirmation email resent successfully',
    item: serializeRegistration(registration),
  });
});

module.exports = {
  createEventRegistration,
  listEventRegistrations,
  getEventRegistration,
  updateEventRegistration,
  deleteEventRegistration,
  createEventRegistrationEntry,
  sendJoinLinkEmails,
  resendEventConfirmationEmail,
};
