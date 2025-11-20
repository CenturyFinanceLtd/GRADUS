const asyncHandler = require('express-async-handler');
const config = require('../config/env');
const liveService = require('./liveService');

const mapServiceError = (res, error) => {
  if (typeof error.statusCode === 'number') {
    res.status(error.statusCode);
  }
  throw error;
};

const createSession = asyncHandler(async (req, res) => {
  try {
    const payload = liveService.createSession({
      admin: req.admin,
      title: req.body?.title,
      scheduledFor: req.body?.scheduledFor,
      courseId: req.body?.courseId,
      courseName: req.body?.courseName,
      courseSlug: req.body?.courseSlug,
    });

    res.status(201).json({
      session: payload.session,
      instructor: {
        hostSecret: payload.hostSecret,
        signalingPath: config.live.signalingPath,
        iceServers: config.live.iceServers,
      },
    });
  } catch (error) {
    mapServiceError(res, error);
  }
});

const listSessions = asyncHandler(async (req, res) => {
  try {
    const sessions = liveService.listSessions();
    res.json({ sessions });
  } catch (error) {
    mapServiceError(res, error);
  }
});

const getSessionForAdmin = asyncHandler(async (req, res) => {
  try {
    const session = liveService.getSessionForAdmin(req.params.sessionId);
    res.json({ session });
  } catch (error) {
    mapServiceError(res, error);
  }
});

const getSessionForParticipant = asyncHandler(async (req, res) => {
  try {
    const session = liveService.getSessionForParticipant(req.params.sessionId);
    res.json({ session });
  } catch (error) {
    mapServiceError(res, error);
  }
});

const updateSession = asyncHandler(async (req, res) => {
  try {
    const session = liveService.updateSession(req.params.sessionId, req.body || {});
    res.json({ session });
  } catch (error) {
    mapServiceError(res, error);
  }
});

const joinStudentSession = asyncHandler(async (req, res) => {
  try {
    const result = liveService.registerStudentParticipant({
      sessionId: req.params.sessionId,
      user: req.user,
      displayName: req.body?.displayName,
    });

    res.json({
      session: result.session,
      participant: result.participant,
      signaling: {
        key: result.signalingKey,
        path: config.live.signalingPath,
        iceServers: config.live.iceServers,
      },
    });
  } catch (error) {
    mapServiceError(res, error);
  }
});

const joinInstructorSession = asyncHandler(async (req, res) => {
  try {
    const result = liveService.registerInstructorParticipant({
      sessionId: req.params.sessionId,
      admin: req.admin,
      hostSecret: req.body?.hostSecret,
    });

    res.json({
      session: result.session,
      participant: result.participant,
      signaling: {
        key: result.signalingKey,
        path: config.live.signalingPath,
        iceServers: config.live.iceServers,
      },
    });
  } catch (error) {
    mapServiceError(res, error);
  }
});

const getActiveLiveSessionForCourse = asyncHandler(async (req, res) => {
  const courseKey = req.params.courseKey || req.params.courseSlug || req.params.courseId;
  const session = liveService.findActiveSessionByCourse({ courseKey });
  if (!session) {
    res.status(404);
    throw new Error('No live class is currently in progress for this course.');
  }
  res.json({ session });
});

module.exports = {
  createSession,
  listSessions,
  getSessionForAdmin,
  getSessionForParticipant,
  updateSession,
  joinStudentSession,
  joinInstructorSession,
  getActiveLiveSessionForCourse,
};
