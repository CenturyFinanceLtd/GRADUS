/*
  Event registration controller
  - Handles public event registration submissions
  - Provides admin CRUD endpoints for event registrations
*/
const asyncHandler = require('express-async-handler');
const EventRegistration = require('../models/EventRegistration');
const Event = require('../models/Event');
const { sendEmail, sendEventRegistrationEmail } = require('../utils/email');
const config = require('../config/env');
const { syncRegistrationToGoogleDoc } = require('../services/googleDocsRegistrationSync');
const { syncRegistrationToGoogleSheet } = require('../services/googleSheetsRegistrationSync');
const {
  resyncEventRegistrationsForEvent,
  isRegistrationSheetWatcherEnabled,
} = require('../services/registrationSpreadsheetSync');

const SHEETS_SYNC_DELAY_MS = Number(process.env.GOOGLE_SHEETS_SYNC_DELAY_MS) || 2000;
const DEFAULT_BULK_EMAIL_CONCURRENCY = 1; // Send sequentially to reduce provider throttling
const BULK_EMAIL_CONCURRENCY = (() => {
  const parsed = Number(process.env.EVENT_CONFIRMATION_CONCURRENCY);
  if (Number.isFinite(parsed) && parsed > 0) {
    return Math.min(Math.floor(parsed), 25);
  }
  return DEFAULT_BULK_EMAIL_CONCURRENCY;
})();
const DEFAULT_BULK_EMAIL_DELAY_MS = 2000;
const BULK_EMAIL_DELAY_MS = (() => {
  const parsed = Number(process.env.EVENT_CONFIRMATION_DELAY_MS);
  if (Number.isFinite(parsed) && parsed >= 0) {
    return parsed;
  }
  return DEFAULT_BULK_EMAIL_DELAY_MS;
})();
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const shouldManuallySyncRegistration = () => !isRegistrationSheetWatcherEnabled();

const runWithConcurrency = async (
  items,
  handler,
  { limit = BULK_EMAIL_CONCURRENCY, delayMs = BULK_EMAIL_DELAY_MS } = {}
) => {
  if (!Array.isArray(items) || !items.length) {
    return;
  }

  const workerCount = Math.max(1, Math.min(limit, items.length));
  let cursor = 0;

  const getNextIndex = () => {
    if (cursor >= items.length) {
      return null;
    }
    const next = cursor;
    cursor += 1;
    return next;
  };

  const workers = Array.from({ length: workerCount }, () =>
    (async function worker() {
      while (true) {
        const index = getNextIndex();
        if (index === null) {
          break;
        }
        // eslint-disable-next-line no-await-in-loop
        await handler(items[index], index);
        if (delayMs > 0) {
          // eslint-disable-next-line no-await-in-loop
          await delay(delayMs);
        }
      }
    })()
  );

  await Promise.all(workers);
};

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
    return true;
  } catch (error) {
    console.error('[event-registration] Failed to send event confirmation email', {
      error: error?.message,
      email: registration.email,
      course: registration.course,
    });
    return false;
  }
};

// Shared helper so contact controller can delegate event registrations here
const createEventRegistrationEntry = async (payload = {}) => {
  const normalized = normalizePayload(payload);
  await checkDuplicateRegistration({ email: normalized.email, phone: normalized.phone });
  const registration = await EventRegistration.create(normalized);
  await sendEventConfirmation(registration, normalized.eventDetails);
  await syncRegistrationToGoogleDoc(registration, { mode: 'create' });
  if (shouldManuallySyncRegistration()) {
    const sheetRow = await syncRegistrationToGoogleSheet(registration);
    if (Number.isFinite(sheetRow)) {
      try {
        await EventRegistration.updateOne(
          { _id: registration._id },
          { sheetRowIndex: sheetRow }
        );
        registration.sheetRowIndex = sheetRow;
      } catch (error) {
        console.warn('[event-registration] Failed to store sheetRowIndex', error?.message);
      }
    }
  }
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
  await syncRegistrationToGoogleDoc(registration, { mode: 'update' });
  if (shouldManuallySyncRegistration()) {
    const sheetRow = await syncRegistrationToGoogleSheet(registration);
    if (Number.isFinite(sheetRow)) {
      try {
        await EventRegistration.updateOne(
          { _id: registration._id },
          { sheetRowIndex: sheetRow }
        );
        registration.sheetRowIndex = sheetRow;
      } catch (error) {
        console.warn('[event-registration] Failed to store sheetRowIndex', error?.message);
      }
    }
  }

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
  const eventName =
    registration.course ||
    (registration.eventDetails && registration.eventDetails.title) ||
    '';
  if (eventName) {
    resyncEventRegistrationsForEvent(eventName).catch((error) => {
      console.warn('[event-registration] Failed to resync sheet after delete', {
        event: eventName,
        error: error?.message,
      });
    });
  }
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

  await runWithConcurrency(
    registrations,
    async (registration) => {
      const displayName = registration.name || 'Learner';
      const textLines = [
        `Dear ${displayName},`,
        '',
        'Thank you for registering for the "Future-Ready Careers: Explore Jobs & Courses that matter" webinar!',
        '',
        'As promised, here is your joining link for the session happening today.',
        '',
        'Webinar Details:',
        'Topic: Future-Ready Careers: Explore Jobs & Courses that matter',
        'Date: Friday, November 21, 2025',
        'Time: 5:00 PM IST',
        'Agenda: In-demand career paths, AI, Data Science & Cloud Computing roles, upskilling strategies, placement roadmap, and live Q&A with experts',
        '',
        'Joining Link:',
        normalizedJoinUrl,
        '',
        'Click the link above to join the webinar at the scheduled time from any device. If you have questions or need technical assistance, please reply to this email.',
        note ? note : null,
        '',
        'Looking forward to your participation!',
        'Best Regards,',
        'Team Gradus',
      ].filter(Boolean);

      const html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1F2937;">
          <p style="margin: 0 0 12px;">Dear ${displayName},</p>
          <p style="margin: 0 0 12px;">Thank you for registering for the "<strong>Future-Ready Careers: Explore Jobs & Courses that matter</strong>" webinar!</p>
          <p style="margin: 0 0 12px;">As promised, here is your joining link for the session happening today.</p>
          <p style="margin: 0 0 12px;"><strong>Webinar Details:</strong></p>
          <ul style="margin: 0 0 12px 20px; padding: 0; color: #1F2937;">
            <li style="margin-bottom: 4px;"><strong>Topic:</strong> Future-Ready Careers: Explore Jobs & Courses that matter</li>
            <li style="margin-bottom: 4px;"><strong>Date:</strong> Friday, November 21, 2025</li>
            <li style="margin-bottom: 4px;"><strong>Time:</strong> 5:00 PM IST</li>
            <li style="margin-bottom: 4px;"><strong>Agenda:</strong> In-demand career paths, AI, Data Science & Cloud Computing roles, upskilling strategies, placement roadmap, and live Q&A with experts</li>
          </ul>
          <p style="margin: 0 0 8px;"><strong>Joining Link:</strong></p>
          <p style="margin: 0 0 16px;">
            <a href="${normalizedJoinUrl}" style="color: #0B5394;">${normalizedJoinUrl}</a>
          </p>
          <p style="margin: 0 0 12px;">Click the link above to join the webinar at the scheduled time from any device. If you have questions or need technical assistance, please reply to this email.</p>
          ${note ? `<p style="margin: 0 0 12px;">${note}</p>` : ''}
          <p style="margin: 0 0 12px;">Looking forward to your participation!</p>
          <p style="margin: 0 0 4px;">Best Regards,</p>
          <p style="margin: 0;">Team Gradus</p>
        </div>
      `;

      try {
        await sendEmail({
          from: config.smtp.registrationFrom,
          to: registration.email,
          subject: emailSubject,
          text: textLines.join('\n'),
          html,
          mailbox: 'registration',
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
    },
    { delayMs: 1000 }
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

  const sent = await sendEventConfirmation(registration, registration.eventDetails || {});
  if (!sent) {
    res.status(500);
    throw new Error('Unable to resend confirmation email. Please try again later.');
  }

  res.json({
    message: 'Confirmation email resent successfully',
    item: serializeRegistration(registration),
  });
});

const resendEventConfirmationsBulk = asyncHandler(async (req, res) => {
  const { registrationIds } = req.body || {};
  const ids = Array.isArray(registrationIds) ? registrationIds.filter(Boolean) : [];

  const filter = ids.length ? { _id: { $in: ids } } : {};
  const registrations = await EventRegistration.find(filter);

  if (!registrations.length) {
    res.status(404);
    throw new Error(ids.length ? 'No registrations found for the provided IDs' : 'No event registrations found to resend');
  }

  let sentCount = 0;
  const failures = [];

  await runWithConcurrency(
    registrations,
    async (registration) => {
      const ok = await sendEventConfirmation(registration, registration.eventDetails || {});
      if (ok) {
        sentCount += 1;
        return;
      }
      failures.push({
        id: registration._id.toString(),
        email: registration.email,
      });
    },
    { delayMs: 1000 }
  );

  res.json({
    message: `Confirmation emails processed for ${registrations.length} registration(s)`,
    total: registrations.length,
    sent: sentCount,
    failed: failures,
  });
});

const syncEventRegistrationSheetBulk = asyncHandler(async (req, res) => {
  const { registrationIds } = req.body || {};
  const ids = Array.isArray(registrationIds) ? registrationIds.filter(Boolean) : [];

  const filter = ids.length ? { _id: { $in: ids } } : {};
  const registrations = await EventRegistration.find(filter);

  if (!registrations.length) {
    res.status(404);
    throw new Error(ids.length ? 'No registrations found for the provided IDs' : 'No registrations found to sync');
  }

  const eventStats = new Map();
  const failures = [];
  registrations.forEach((registration) => {
    const eventName =
      registration.course ||
      (registration.eventDetails && registration.eventDetails.title) ||
      '';
    if (!eventName.trim()) {
      failures.push(`missing-event:${registration._id.toString()}`);
      return;
    }
    const normalized = eventName.trim();
    const stats = eventStats.get(normalized) || { count: 0 };
    stats.count += 1;
    eventStats.set(normalized, stats);
  });

  if (!eventStats.size) {
    res.status(400);
    throw new Error('Unable to determine event names for the selected registrations');
  }

  let eventsSynced = 0;
  let syncedRegistrations = 0;

  for (const [eventName, stats] of eventStats.entries()) {
    const ok = await resyncEventRegistrationsForEvent(eventName);
    if (ok) {
      eventsSynced += 1;
      syncedRegistrations += stats.count;
    } else {
      failures.push(`event:${eventName}`);
    }
    if (SHEETS_SYNC_DELAY_MS > 0) {
      await delay(SHEETS_SYNC_DELAY_MS);
    }
  }

  res.json({
    message: `Sheet sync processed for ${eventsSynced}/${eventStats.size} event(s)`,
    total: registrations.length,
    synced: syncedRegistrations,
    failed: failures,
    eventsProcessed: eventStats.size,
    eventsSynced,
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
  resendEventConfirmationsBulk,
  syncEventRegistrationSheetBulk,
};
