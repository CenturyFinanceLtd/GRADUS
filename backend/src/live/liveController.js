const asyncHandler = require("express-async-handler");
const multer = require("multer");
const config = require("../config/env");
const liveService = require("./liveService");
const recordingUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 250 * 1024 * 1024 },
});

const mapServiceError = (res, error) => {
  if (typeof error.statusCode === "number") {
    res.status(error.statusCode);
  }
  throw error;
};

const createSession = asyncHandler(async (req, res) => {
  try {
    const payload = await liveService.createSession({
      admin: req.admin,
      title: req.body?.title,
      scheduledFor: req.body?.scheduledFor,
      courseId: req.body?.courseId,
      courseName: req.body?.courseName,
      courseSlug: req.body?.courseSlug,
      passcode: req.body?.passcode,
      waitingRoomEnabled: req.body?.waitingRoomEnabled,
      locked: req.body?.locked,
    });

    res.status(201).json({
      session: payload.session,
      instructor: {
        hostSecret: payload.hostSecret,
        signalingPath: config.live.signalingPath,
        iceServers: config.live.iceServers,
        meetingToken: payload.meetingToken,
      },
    });
  } catch (error) {
    mapServiceError(res, error);
  }
});

const listSessions = asyncHandler(async (req, res) => {
  try {
    const sessions = await liveService.listSessions();
    res.json({ sessions });
  } catch (error) {
    mapServiceError(res, error);
  }
});

const getSessionForAdmin = asyncHandler(async (req, res) => {
  try {
    const session = await liveService.getSessionForAdmin(req.params.sessionId);
    res.json({ session });
  } catch (error) {
    mapServiceError(res, error);
  }
});

const getSessionForParticipant = asyncHandler(async (req, res) => {
  try {
    const session = await liveService.getSessionForParticipant(
      req.params.sessionId
    );
    res.json({ session });
  } catch (error) {
    mapServiceError(res, error);
  }
});

const updateSession = asyncHandler(async (req, res) => {
  try {
    const session = await liveService.updateSession(
      req.params.sessionId,
      req.body || {}
    );
    res.json({ session });
  } catch (error) {
    mapServiceError(res, error);
  }
});

const joinStudentSession = asyncHandler(async (req, res) => {
  try {
    const result = await liveService.registerStudentParticipant({
      sessionId: req.params.sessionId,
      user: req.user,
      displayName: req.body?.displayName,
      passcode: req.body?.passcode,
      meetingToken: req.body?.meetingToken,
    });

    res.json({
      session: result.session,
      participant: result.participant,
      signaling: {
        key: result.signalingKey,
        path: config.live.signalingPath,
        iceServers: config.live.iceServers,
        liveKitToken: result.liveKitToken,
        liveKitUrl: result.liveKitUrl,
      },
    });
  } catch (error) {
    mapServiceError(res, error);
  }
});

const joinInstructorSession = asyncHandler(async (req, res) => {
  try {
    const result = await liveService.registerInstructorParticipant({
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
        liveKitToken: result.liveKitToken,
        liveKitUrl: result.liveKitUrl,
      },
    });
  } catch (error) {
    mapServiceError(res, error);
  }
});

const getActiveLiveSessionForCourse = asyncHandler(async (req, res) => {
  const courseKey =
    req.params.courseKey || req.params.courseSlug || req.params.courseId;
  const session = await liveService.findActiveSessionByCourse({ courseKey });
  if (!session) {
    // Return a 200 with a null payload to avoid noisy 404s when polling for availability.
    res.json({ session: null });
    return;
  }
  res.json({ session });
});

const commandParticipantMedia = asyncHandler(async (req, res) => {
  try {
    const session = await liveService.commandParticipantMedia({
      sessionId: req.params.sessionId,
      participantId: req.params.participantId,
      admin: req.admin,
      media: req.body || {},
    });
    res.json({ session });
  } catch (error) {
    mapServiceError(res, error);
  }
});

const removeParticipant = asyncHandler(async (req, res) => {
  try {
    const session = await liveService.removeParticipant({
      sessionId: req.params.sessionId,
      participantId: req.params.participantId,
      admin: req.admin,
      ban: Boolean(req.body?.ban),
    });
    res.json({ session });
  } catch (error) {
    mapServiceError(res, error);
  }
});

const admitWaitingParticipant = asyncHandler(async (req, res) => {
  try {
    const session = await liveService.admitParticipant({
      sessionId: req.params.sessionId,
      participantId: req.params.participantId,
      admin: req.admin,
    });
    res.json({ session });
  } catch (error) {
    mapServiceError(res, error);
  }
});

const denyWaitingParticipant = asyncHandler(async (req, res) => {
  try {
    const session = await liveService.denyParticipant({
      sessionId: req.params.sessionId,
      participantId: req.params.participantId,
      admin: req.admin,
    });
    res.json({ session });
  } catch (error) {
    mapServiceError(res, error);
  }
});

const getChatMessages = asyncHandler(async (req, res) => {
  try {
    const messages = await liveService.getChatMessages(req.params.sessionId, {
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    });
    res.json({ messages });
  } catch (error) {
    mapServiceError(res, error);
  }
});

const uploadRecording = [
  recordingUpload.single("file"),
  asyncHandler(async (req, res) => {
    try {
      if (!req.file) {
        res.status(400);
        throw new Error("Recording file is required.");
      }
      const result = await liveService.saveRecording({
        sessionId: req.params.sessionId,
        admin: req.admin,
        participantId: req.body?.participantId,
        fileBuffer: req.file.buffer,
        mimeType: req.file.mimetype,
        durationMs: req.body?.durationMs,
      });
      res.status(201).json(result);
    } catch (error) {
      mapServiceError(res, error);
    }
  }),
];

const createRoomController = asyncHandler(async (req, res) => {
  try {
    const result = await liveService.createRoom({
      sessionId: req.params.sessionId,
      admin: req.admin,
      name: req.body?.name,
    });
    res.status(201).json(result);
  } catch (error) {
    mapServiceError(res, error);
  }
});

const listRoomsController = asyncHandler(async (req, res) => {
  try {
    const result = await liveService.listRooms({
      sessionId: req.params.sessionId,
      admin: req.admin,
    });
    res.json(result);
  } catch (error) {
    mapServiceError(res, error);
  }
});

const moveParticipantRoomController = asyncHandler(async (req, res) => {
  try {
    const session = await liveService.moveParticipantRoom({
      sessionId: req.params.sessionId,
      participantId: req.params.participantId,
      admin: req.admin,
      roomId: req.body?.roomId || null,
    });
    res.json({ session });
  } catch (error) {
    mapServiceError(res, error);
  }
});

const listAttendance = asyncHandler(async (req, res) => {
  try {
    const attendance = await liveService.listAttendance({
      sessionId: req.params.sessionId,
      admin: req.admin,
    });
    res.json({ attendance });
  } catch (error) {
    mapServiceError(res, error);
  }
});

const listSessionEvents = asyncHandler(async (req, res) => {
  try {
    const events = await liveService.listSessionEvents({
      sessionId: req.params.sessionId,
      admin: req.admin,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    });
    res.json({ events });
  } catch (error) {
    mapServiceError(res, error);
  }
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
  commandParticipantMedia,
  removeParticipant,
  admitWaitingParticipant,
  denyWaitingParticipant,
  uploadRecording,
  createRoomController,
  listRoomsController,
  moveParticipantRoomController,
  listAttendance,
  listSessionEvents,
  getChatMessages,
};
