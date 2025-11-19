/*
  Event controller
  - Public listing + detail for upcoming events/masterclasses
  - Admin CRUD endpoints so marketing/community teams can manage the calendar
*/
const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const Event = require('../models/Event');
const slugify = require('../utils/slugify');
const { ensureEventSpreadsheet } = require('../services/googleSheetsRegistrationSync');

const allowedStatuses = new Set(['draft', 'published', 'archived']);
const allowedModes = new Set(['online', 'in-person', 'hybrid']);

const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeStringList = (input) => {
  if (input === undefined || input === null) {
    return [];
  }

  let list = input;

  if (typeof list === 'string') {
    const trimmed = list.trim();
    if (!trimmed) {
      return [];
    }

    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        list = JSON.parse(trimmed);
      } catch (error) {
        list = trimmed.split(',');
      }
    } else if (trimmed.includes('|')) {
      list = trimmed.split('|');
    } else {
      list = trimmed.split(',');
    }
  }

  if (!Array.isArray(list)) {
    return [];
  }

  return list
    .map((item) => (item === undefined || item === null ? '' : String(item)))
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .map((item) => item.replace(/\s+/g, ' '))
    .filter(
      (item, index, array) =>
        array.findIndex((value) => value.toLowerCase() === item.toLowerCase()) === index
    );
};

const normalizeAgendaList = (input) => {
  if (input === undefined || input === null) {
    return [];
  }

  let list = input;

  if (typeof list === 'string') {
    const trimmed = list.trim();
    if (!trimmed) {
      return [];
    }

    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        list = JSON.parse(trimmed);
      } catch (error) {
        list = trimmed.split('|');
      }
    } else if (trimmed.includes('|')) {
      list = trimmed.split('|');
    } else if (trimmed.includes('\n')) {
      list = trimmed.split('\n');
    } else {
      list = trimmed.split('.');
    }
  }

  if (!Array.isArray(list)) {
    return [];
  }

  return list
    .map((item) => (item === undefined || item === null ? '' : String(item)))
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
};

const boolFromInput = (value, fallback = null) => {
  if (value === undefined || value === null) {
    return fallback;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) {
      return true;
    }
    if (['false', '0', 'no', 'n', 'off'].includes(normalized)) {
      return false;
    }
  }

  return fallback;
};

const numberFromInput = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const num = Number(value);
  if (Number.isFinite(num)) {
    return num;
  }

  return null;
};

const parseDateInput = (value) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
};

const buildUniqueSlug = async (incomingSlugOrTitle, currentId) => {
  const baseSlug = slugify(incomingSlugOrTitle);
  if (!baseSlug) {
    throw new Error('Unable to generate slug from the provided title');
  }

  let candidate = baseSlug;
  let suffix = 1;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const query = { slug: candidate };
    if (currentId) {
      query._id = { $ne: currentId };
    }

    const exists = await Event.exists(query);
    if (!exists) {
      return candidate;
    }

    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;

    if (suffix > 500) {
      throw new Error('Unable to generate a unique slug, please adjust the title');
    }
  }
};

const serializeEvent = (event) => {
  if (!event) {
    return null;
  }

  const schedule = event.schedule || {};
  const host = event.host || {};
  const heroImage = event.heroImage || {};
  const price = event.price || {};
  const cta = event.cta || {};
  const meta = event.meta || {};

  return {
    id: event._id?.toString?.() || event.id,
    slug: event.slug,
    title: event.title,
    subtitle: event.subtitle || '',
    summary: event.summary || '',
    description: event.description || '',
    category: event.category || 'General',
    badge: event.badge || '',
    eventType: event.eventType || '',
    tags: Array.isArray(event.tags) ? event.tags : [],
    level: event.level || '',
    trackLabel: event.trackLabel || '',
    heroImage: {
      url: heroImage.url || '',
      alt: heroImage.alt || event.title || '',
    },
    host: {
      name: host.name || '',
      title: host.title || '',
      avatarUrl: host.avatarUrl || '',
      bio: host.bio || '',
    },
    price: {
      label: price.label || (price.isFree ? 'Free' : ''),
      amount: price.amount ?? null,
      currency: price.currency || 'INR',
      isFree: price.isFree ?? true,
    },
    cta: {
      label: cta.label || 'Join us live',
      url: cta.url || '',
      external: Boolean(cta.external),
    },
    schedule: {
      start: schedule.start ? schedule.start.toISOString() : null,
      end: schedule.end ? schedule.end.toISOString() : null,
      timezone: schedule.timezone || 'Asia/Kolkata',
    },
    mode: event.mode || 'online',
    location: event.location || '',
    seatLimit: event.seatLimit ?? null,
    durationMinutes: event.durationMinutes ?? null,
    recordingAvailable: Boolean(event.recordingAvailable),
    isFeatured: Boolean(event.isFeatured),
    status: event.status || 'draft',
    sortOrder: event.sortOrder ?? 0,
    createdAt: event.createdAt ? event.createdAt.toISOString() : null,
    updatedAt: event.updatedAt ? event.updatedAt.toISOString() : null,
    meta: {
      highlights: Array.isArray(meta.highlights) ? meta.highlights : [],
      agenda: Array.isArray(meta.agenda) ? meta.agenda : [],
    },
  };
};

const findEventByIdentifier = async (identifier, { includeDrafts = false } = {}) => {
  if (!identifier) {
    return null;
  }

  const baseFilter = {};
  if (!includeDrafts) {
    baseFilter.status = 'published';
  }

  if (mongoose.isValidObjectId(identifier)) {
    return Event.findOne({ ...baseFilter, _id: identifier });
  }

  return Event.findOne({ ...baseFilter, slug: identifier });
};

const buildEventPayload = (input = {}, { isCreate = false } = {}) => {
  const payload = {};

  if (input.title !== undefined) {
    const title = String(input.title || '').trim();
    if (!title) {
      throw new Error('Title is required');
    }
    payload.title = title;
  } else if (isCreate) {
    throw new Error('Title is required');
  }

  if (input.subtitle !== undefined) {
    payload.subtitle = String(input.subtitle || '').trim();
  }

  if (input.summary !== undefined) {
    payload.summary = String(input.summary || '').trim();
  }

  if (input.description !== undefined) {
    payload.description = String(input.description || '').trim();
  }

  if (input.category !== undefined) {
    const category = String(input.category || 'General').trim();
    payload.category = category || 'General';
  }

  if (input.badge !== undefined) {
    payload.badge = String(input.badge || '').trim();
  }

  if (input.eventType !== undefined) {
    payload.eventType = String(input.eventType || '').trim();
  }

  if (input.tags !== undefined) {
    payload.tags = normalizeStringList(input.tags);
  }

  if (input.level !== undefined) {
    payload.level = String(input.level || '').trim();
  }

  if (input.trackLabel !== undefined) {
    payload.trackLabel = String(input.trackLabel || '').trim();
  }

  if (
    input.heroImage !== undefined ||
    input.heroImageUrl !== undefined ||
    input.heroImageAlt !== undefined
  ) {
    const heroImage = input.heroImage || {};
    const url = heroImage.url ?? input.heroImageUrl;
    const alt = heroImage.alt ?? input.heroImageAlt;
    payload.heroImage = {
      url: url ? String(url).trim() : '',
      alt: alt ? String(alt).trim() : '',
    };
  }

  if (
    input.host !== undefined ||
    input.hostName !== undefined ||
    input.hostTitle !== undefined ||
    input.hostAvatarUrl !== undefined ||
    input.hostBio !== undefined
  ) {
    const host = input.host || {};
    payload.host = {
      name: String(host.name ?? input.hostName ?? '').trim(),
      title: String(host.title ?? input.hostTitle ?? '').trim(),
      avatarUrl: String(host.avatarUrl ?? input.hostAvatarUrl ?? '').trim(),
      bio: String(host.bio ?? input.hostBio ?? '').trim(),
    };
  }

  if (
    input.price !== undefined ||
    input.priceLabel !== undefined ||
    input.priceAmount !== undefined ||
    input.priceCurrency !== undefined ||
    input.isFree !== undefined
  ) {
    const price = input.price || {};
    const label = input.priceLabel ?? price.label;
    const amount = numberFromInput(input.priceAmount ?? price.amount);
    const currency = input.priceCurrency ?? price.currency;
    const isFree = boolFromInput(input.isFree ?? price.isFree, null);

    payload.price = {};
    if (label !== undefined) {
      payload.price.label = String(label || '').trim();
    }
    if (amount !== null) {
      payload.price.amount = amount;
    }
    if (currency !== undefined) {
      payload.price.currency = String(currency || 'INR').trim().toUpperCase();
    }
    if (isFree !== null) {
      payload.price.isFree = isFree;
      if (isFree && !payload.price.label) {
        payload.price.label = 'Free';
      }
    }
  }

  if (
    input.cta !== undefined ||
    input.ctaLabel !== undefined ||
    input.ctaUrl !== undefined ||
    input.ctaExternal !== undefined
  ) {
    const cta = input.cta || {};
    const label = input.ctaLabel ?? cta.label;
    const url = input.ctaUrl ?? cta.url;
    const external = boolFromInput(input.ctaExternal ?? cta.external, null);
    payload.cta = {};
    if (label !== undefined) {
      payload.cta.label = String(label || 'Join us live').trim();
    }
    if (url !== undefined) {
      payload.cta.url = String(url || '').trim();
    }
    if (external !== null) {
      payload.cta.external = external;
    }
  }

  if (input.mode !== undefined) {
    const mode = String(input.mode || '').trim().toLowerCase();
    if (mode && !allowedModes.has(mode)) {
      throw new Error('Mode must be one of: online, in-person, hybrid');
    }
    payload.mode = mode || 'online';
  }

  if (input.location !== undefined) {
    payload.location = String(input.location || '').trim();
  }

  if (input.seatLimit !== undefined) {
    const seats = numberFromInput(input.seatLimit);
    payload.seatLimit = seats === null ? undefined : seats;
  }

  if (input.durationMinutes !== undefined) {
    const duration = numberFromInput(input.durationMinutes);
    payload.durationMinutes = duration === null ? undefined : duration;
  }

  if (input.recordingAvailable !== undefined) {
    const recording = boolFromInput(input.recordingAvailable, null);
    if (recording !== null) {
      payload.recordingAvailable = recording;
    }
  }

  if (input.isFeatured !== undefined) {
    const featured = boolFromInput(input.isFeatured, null);
    if (featured !== null) {
      payload.isFeatured = featured;
    }
  }

  if (input.sortOrder !== undefined) {
    const order = numberFromInput(input.sortOrder);
    payload.sortOrder = order === null ? 0 : order;
  }

  const startInput =
    input.startDate ??
    input.start ??
    input.schedule?.start ??
    input.scheduleStart;
  if (startInput !== undefined) {
    const parsed = parseDateInput(startInput);
    if (!parsed) {
      throw new Error('startDate must be a valid ISO date');
    }
    payload.schedule = payload.schedule || {};
    payload.schedule.start = parsed;
  } else if (isCreate) {
    throw new Error('startDate is required');
  }

  const endInput =
    input.endDate ??
    input.end ??
    input.schedule?.end ??
    input.scheduleEnd;
  if (endInput !== undefined) {
    const parsed = parseDateInput(endInput);
    payload.schedule = payload.schedule || {};
    payload.schedule.end = parsed;
  }

  const timezoneInput =
    input.timezone ??
    input.schedule?.timezone ??
    input.scheduleTimezone;
  if (timezoneInput !== undefined) {
    payload.schedule = payload.schedule || {};
    payload.schedule.timezone = String(timezoneInput || 'Asia/Kolkata').trim() || 'Asia/Kolkata';
  }

  if (input.status !== undefined) {
    const status = String(input.status || '').trim().toLowerCase();
    if (status && !allowedStatuses.has(status)) {
      throw new Error('Status must be draft, published, or archived');
    }
    payload.status = status || 'draft';
  }

  const highlightsInput =
    input.highlights !== undefined ? input.highlights : input.meta?.highlights;
  if (highlightsInput !== undefined) {
    payload.meta = payload.meta || {};
    payload.meta.highlights = normalizeStringList(highlightsInput);
  }

  const agendaInput =
    input.agenda !== undefined ? input.agenda : input.meta?.agenda;
  if (agendaInput !== undefined) {
    payload.meta = payload.meta || {};
    payload.meta.agenda = normalizeAgendaList(agendaInput);
  }

  return payload;
};

const applyPayloadToEvent = (event, payload) => {
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }

    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      ['heroImage', 'host', 'price', 'cta', 'schedule', 'meta'].includes(key)
    ) {
      const currentValue = event[key];
      const base =
        currentValue && typeof currentValue.toObject === 'function'
          ? currentValue.toObject()
          : currentValue || {};
      event[key] = { ...base, ...value };
    } else {
      event[key] = value;
    }
  });
};

const listPublicEvents = asyncHandler(async (req, res) => {
  const {
    category,
    eventType,
    tag,
    search,
    limit = 12,
    page = 1,
    timeframe = 'upcoming',
    featured,
  } = req.query;

  const pageSize = Math.min(Math.max(parseInt(limit, 10) || 12, 1), 50);
  const currentPage = Math.max(parseInt(page, 10) || 1, 1);

  const filter = { status: 'published' };
  const now = new Date();

  if (featured !== undefined) {
    const isFeatured = boolFromInput(featured, null);
    if (isFeatured !== null) {
      filter.isFeatured = isFeatured;
    }
  }

  if (category) {
    filter.category = new RegExp(`^${escapeRegex(category.trim())}$`, 'i');
  }

  if (eventType) {
    filter.eventType = new RegExp(`^${escapeRegex(eventType.trim())}$`, 'i');
  }

  if (tag) {
    filter.tags = { $regex: new RegExp(escapeRegex(tag.trim()), 'i') };
  }

  if (search) {
    const searchRegex = new RegExp(escapeRegex(search.trim()), 'i');
    filter.$or = [
      { title: searchRegex },
      { summary: searchRegex },
      { description: searchRegex },
      { category: searchRegex },
    ];
  }

  if (timeframe === 'past') {
    filter['schedule.start'] = { $lt: now };
  } else if (timeframe === 'all') {
    // No-op, show everything
  } else {
    filter['schedule.start'] = { $gte: now };
  }

  const sort =
    timeframe === 'past'
      ? { 'schedule.start': -1, sortOrder: 1 }
      : { sortOrder: 1, 'schedule.start': 1 };

  const skip = (currentPage - 1) * pageSize;

  const [items, total, categories, eventTypes] = await Promise.all([
    Event.find(filter).sort(sort).skip(skip).limit(pageSize).lean(),
    Event.countDocuments(filter),
    Event.distinct('category', { status: 'published' }),
    Event.distinct('eventType', { status: 'published' }),
  ]);

  res.json({
    items: items.map(serializeEvent),
    page: currentPage,
    pageSize,
    total,
    hasMore: skip + items.length < total,
    filters: {
      categories: categories.filter(Boolean).sort(),
      eventTypes: eventTypes.filter(Boolean).sort(),
    },
  });
});

const getPublicEvent = asyncHandler(async (req, res) => {
  const { slugOrId } = req.params;
  const event = await findEventByIdentifier(slugOrId, { includeDrafts: false });

  if (!event) {
    res.status(404);
    throw new Error('Event not found');
  }

  res.json(serializeEvent(event));
});

const listAdminEvents = asyncHandler(async (req, res) => {
  const { status, search } = req.query;
  const filter = {};

  if (status && allowedStatuses.has(status)) {
    filter.status = status;
  }

  if (search) {
    const regex = new RegExp(escapeRegex(search.trim()), 'i');
    filter.$or = [{ title: regex }, { summary: regex }, { category: regex }];
  }

  const events = await Event.find(filter)
    .sort({ createdAt: -1 })
    .lean();

  res.json({
    items: events.map((event) => ({
      ...serializeEvent(event),
      visibility: event.status === 'published' ? 'public' : 'private',
    })),
  });
});

const getAdminEvent = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const event = await findEventByIdentifier(eventId, { includeDrafts: true });

  if (!event) {
    res.status(404);
    throw new Error('Event not found');
  }

  res.json(serializeEvent(event));
});

const createEvent = asyncHandler(async (req, res) => {
  const payload = buildEventPayload(req.body, { isCreate: true });

  const slugSource = req.body.slug || payload.title;
  payload.slug = await buildUniqueSlug(slugSource);

  if (req.admin?._id) {
    payload.createdBy = req.admin._id;
  }

  const event = await Event.create(payload);
  if (event) {
    const eventPayload = event.toObject ? event.toObject() : event;
    ensureEventSpreadsheet(eventPayload).catch((error) => {
      console.warn('[events] Failed to ensure spreadsheet during create', {
        id: event._id,
        title: event.title,
        error: error?.message,
      });
    });
  }

  res.status(201).json(serializeEvent(event));
});

const updateEvent = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const event = await findEventByIdentifier(eventId, { includeDrafts: true });

  if (!event) {
    res.status(404);
    throw new Error('Event not found');
  }

  const payload = buildEventPayload(req.body, { isCreate: false });

  if (req.body.slug) {
    event.slug = await buildUniqueSlug(req.body.slug, event._id);
  } else if (payload.title && !req.body.slug) {
    // Ensure slug tracks title changes when not manually overridden
    event.slug = await buildUniqueSlug(payload.title, event._id);
  }

  applyPayloadToEvent(event, payload);
  await event.save();
  if (event) {
    const eventPayload = event.toObject ? event.toObject() : event;
    ensureEventSpreadsheet(eventPayload).catch((error) => {
      console.warn('[events] Failed to ensure spreadsheet during update', {
        id: event._id,
        title: event.title,
        error: error?.message,
      });
    });
  }

  res.json(serializeEvent(event));
});

const deleteEvent = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const event = await findEventByIdentifier(eventId, { includeDrafts: true });

  if (!event) {
    res.status(404);
    throw new Error('Event not found');
  }

  await Event.deleteOne({ _id: event._id });
  res.json({ success: true });
});

module.exports = {
  listPublicEvents,
  getPublicEvent,
  listAdminEvents,
  getAdminEvent,
  createEvent,
  updateEvent,
  deleteEvent,
};
