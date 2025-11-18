/*
  Live session controller
  - Powers instructor-led live classes hosted inside the admin portal
  - Creates/updates lifecycle state and exposes metadata for the custom host
*/
const asyncHandler = require('express-async-handler');
const crypto = require('crypto');
const mongoose = require('mongoose');
const LiveSession = require('../models/LiveSession');
const Course = require('../models/Course');
const config = require('../config/env');

const allowedStatuses = new Set(['ready', 'live', 'ended']);

const normalizeString = (value) => {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
};

const normalizeDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const buildHostName = (admin) => {
  if (!admin) return 'Live host';
  const combined = [admin.firstName, admin.lastName].filter(Boolean).join(' ').trim();
  return normalizeString(combined || admin.name || admin.email || admin.role) || 'Live host';
};

const generateViewerCode = async () => {
  let attempts = 0;
  while (attempts < 5) {
    const code = crypto.randomBytes(4).toString('hex');
    // eslint-disable-next-line no-await-in-loop
    const existing = await LiveSession.findOne({ viewerCode: code }).lean();
    if (!existing) {
      return code;
    }
    attempts += 1;
  }
  return crypto.randomBytes(6).toString('hex');
};

const serializeLiveSession = (session) => {
  const courseId =
    session.course && typeof session.course === 'object' && session.course._id
      ? session.course._id.toString()
      : session.course
      ? session.course.toString()
      : null;

  return {
    id: session._id.toString(),
    courseId,
    courseTitle: session.courseTitle,
    courseSlug: session.courseSlug,
    courseProgramme: session.courseProgramme,
    title: session.title,
    description: session.description,
    status: session.status,
    scheduledAt: session.scheduledAt,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    hostName: session.hostName,
    viewerCode: session.viewerCode,
    playbackUrl: session.playbackUrl,
    ingestEndpoint: session.ingestEndpoint,
    streamKey: session.streamKey,
    publishMode: session.publishMode || 'browser_webrtc',
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  };
};

const serializeViewerSession = (session) => ({
  id: session._id.toString(),
  courseSlug: session.courseSlug,
  courseProgramme: session.courseProgramme,
  courseTitle: session.courseTitle,
  title: session.title,
  description: session.description,
  status: session.status,
  scheduledAt: session.scheduledAt,
  startedAt: session.startedAt,
  endedAt: session.endedAt,
  viewerCode: session.viewerCode,
  playbackUrl: session.playbackUrl,
  publishMode: session.publishMode || 'browser_webrtc',
});

const escapeRegex = (value = '') =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildViewerBaseUrl = () => {
  const explicit = process.env.LIVE_VIEWER_BASE_URL || process.env.PUBLIC_SITE_BASE_URL;
  if (explicit) {
    return explicit.replace(/\/+$/, '');
  }
  if (Array.isArray(config.clientOrigins) && config.clientOrigins.length > 0) {
    return config.clientOrigins[0].replace(/\/+$/, '');
  }
  if (config.clientUrl) {
    return config.clientUrl.replace(/\/+$/, '');
  }
  return 'http://localhost:5173';
};

const buildPlaybackUrl = (viewerCode, courseSlug, courseProgramme) => {
  if (!viewerCode) return null;
  const base = buildViewerBaseUrl();
  const slugSegment = courseSlug ? String(courseSlug).replace(/^\/+/, '') : '';
  const programmeSegment = courseProgramme ? String(courseProgramme).replace(/^\/+/, '') : '';
  if (slugSegment && programmeSegment) {
    return `${base}/${programmeSegment}/${slugSegment}/home/live/${encodeURIComponent(viewerCode)}`;
  }
  if (slugSegment) {
    return `${base}/${slugSegment}/home/live/${encodeURIComponent(viewerCode)}`;
  }
  return `${base}/live/embed/${encodeURIComponent(viewerCode)}`;
};

const findCourse = async ({ courseId, courseSlug }) => {
  if (courseId && mongoose.isValidObjectId(courseId)) {
    const course = await Course.findById(courseId).lean();
    if (course) return course;
  }
  if (courseSlug) {
    const course = await Course.findOne({ slug: courseSlug }).lean();
    if (course) return course;
  }
  return null;
};

const listAdminLiveSessions = asyncHandler(async (req, res) => {
  const { status, courseId } = req.query;
  const filter = {};

  if (status && allowedStatuses.has(status)) {
    filter.status = status;
  }

  if (courseId && mongoose.isValidObjectId(courseId)) {
    filter.course = courseId;
  }

  const sessions = await LiveSession.find(filter).sort({ createdAt: -1 }).lean();

  res.json({
    items: sessions.map(serializeLiveSession),
  });
});

const getAdminLiveSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const session = await LiveSession.findById(sessionId).lean();

  if (!session) {
    res.status(404);
    throw new Error('Live session not found');
  }

  res.json({ session: serializeLiveSession(session) });
});

const createLiveSession = asyncHandler(async (req, res) => {
  const { courseId, courseSlug, description, startNow = true } = req.body;
  const course = await findCourse({ courseId, courseSlug });

  if (!course) {
    res.status(404);
    throw new Error('Course not found for live session');
  }

  const schedule = normalizeDate(req.body.scheduledAt);
  const hostName = buildHostName(req.admin);
  const title =
    normalizeString(req.body.title) ||
    `${course.name || course.title || 'Course'} - Live session`;

  const payload = {
    course: course._id,
    courseTitle: course.name || course.title || 'Course',
    courseSlug: course.slug,
    courseProgramme: course.programme,
    title,
    description: normalizeString(description),
    status: startNow === false ? 'ready' : 'live',
    scheduledAt: schedule,
    startedAt: startNow === false ? null : new Date(),
    host: req.admin?._id,
    hostName,
    playbackUrl: null,
    ingestEndpoint: 'browser-webrtc',
    streamKey: crypto.randomBytes(12).toString('hex'),
    viewerCode: await generateViewerCode(),
    playbackUrl: null,
    publishMode: 'browser_webrtc',
  };

  payload.playbackUrl = buildPlaybackUrl(payload.viewerCode, payload.courseSlug, payload.courseProgramme);

  const session = await LiveSession.create(payload);

  res.status(201).json({ session: serializeLiveSession(session) });
});

const updateLiveSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const session = await LiveSession.findById(sessionId);

  if (!session) {
    res.status(404);
    throw new Error('Live session not found');
  }

  if (req.body.title !== undefined) {
    session.title = normalizeString(req.body.title) || session.title;
  }
  if (req.body.description !== undefined) {
    session.description = normalizeString(req.body.description);
  }
  if (req.body.scheduledAt !== undefined) {
    session.scheduledAt = normalizeDate(req.body.scheduledAt);
  }
  if (req.body.status && allowedStatuses.has(req.body.status)) {
    session.status = req.body.status;
    if (req.body.status === 'live' && !session.startedAt) {
      session.startedAt = new Date();
    }
    if (req.body.status === 'ended' && !session.endedAt) {
      session.endedAt = new Date();
    }
  }

  await session.save();
  res.json({ session: serializeLiveSession(session) });
});

const startLiveSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const session = await LiveSession.findById(sessionId);

  if (!session) {
    res.status(404);
    throw new Error('Live session not found');
  }

  if (session.status === 'ended') {
    res.status(400);
    throw new Error('This live session has already ended');
  }

  if (!session.playbackUrl) {
    session.playbackUrl = buildPlaybackUrl(session.viewerCode, session.courseSlug, session.courseProgramme);
  }

  session.status = 'live';
  if (!session.startedAt) {
    session.startedAt = new Date();
  }

  await session.save();
  res.json({ session: serializeLiveSession(session) });
});

const endLiveSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const session = await LiveSession.findById(sessionId);

  if (!session) {
    res.status(404);
    throw new Error('Live session not found');
  }

  session.status = 'ended';
  session.endedAt = new Date();

  await session.save();
  res.json({ session: serializeLiveSession(session) });
});

const getActiveLiveSession = asyncHandler(async (req, res) => {
  const { courseId, courseSlug, programme } = req.query;
  const filter = { status: 'live' };

  if (courseId && mongoose.isValidObjectId(courseId)) {
    filter.course = courseId;
  } else if (courseSlug) {
    const slugQuery = { slug: courseSlug };
    if (programme) {
      // Try a case-insensitive match on programme when provided
      slugQuery.programme = new RegExp(`^${escapeRegex(programme)}$`, 'i');
    }
    let course = await Course.findOne(slugQuery).select('_id').lean();
    if (!course) {
      // Fallback: ignore programme filter and try slug-only lookup
      course = await Course.findOne({ slug: courseSlug }).select('_id').lean();
    }
    if (!course?._id) {
      res.json({ session: null });
      return;
    }
    filter.course = course._id;
  }

  const session = await LiveSession.findOne(filter).sort({ updatedAt: -1 }).lean();
  if (session && !session.playbackUrl) {
    const playbackUrl = buildPlaybackUrl(session.viewerCode, session.courseSlug, session.courseProgramme);
    session.playbackUrl = playbackUrl;
    await LiveSession.updateOne({ _id: session._id }, { playbackUrl });
  }
  res.json({ session: session ? serializeViewerSession(session) : null });
});

const getLiveSessionByCode = asyncHandler(async (req, res) => {
  const { viewerCode } = req.params;
  if (!viewerCode) {
    res.status(400);
    throw new Error('Viewer code is required');
  }
  const session = await LiveSession.findOne({ viewerCode }).lean();
  if (!session) {
    res.status(404);
    throw new Error('Live session not found');
  }
  if (session.status === 'ended') {
    res.status(410);
    throw new Error('This live session has ended');
  }
  if (!session.playbackUrl) {
    session.playbackUrl = buildPlaybackUrl(session.viewerCode);
    await LiveSession.updateOne({ _id: session._id }, { playbackUrl: session.playbackUrl });
  }
  res.json({ session: serializeViewerSession(session) });
});

module.exports = {
  listAdminLiveSessions,
  getAdminLiveSession,
  createLiveSession,
  updateLiveSession,
  startLiveSession,
  endLiveSession,
  getActiveLiveSession,
  getLiveSessionByCode,
};
