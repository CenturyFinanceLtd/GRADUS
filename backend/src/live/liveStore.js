/*
  Mongo-backed store for live session metadata and participants
  - Replaces the previous in-memory Maps so live classes survive restarts
*/
const { v4: uuidv4 } = require('uuid');
const { LiveSession, LIVE_SESSION_STATUSES } = require('../models/LiveSession');
const { LiveParticipant } = require('../models/LiveParticipant');
const { LiveRoom } = require('../models/LiveRoom');
const { LiveEvent } = require('../models/LiveEvent');

const toPlain = (doc) => {
  if (!doc) {
    return null;
  }
  return doc.toObject ? doc.toObject() : doc;
};

const toParticipantSnapshot = (participant, { includeSignalingKey = false } = {}) => {
  if (!participant) {
    return null;
  }

  const snapshot = {
    id: String(participant._id || participant.id),
    sessionId: String(participant.session),
    displayName: participant.displayName,
    role: participant.role,
    userId: participant.userId ? String(participant.userId) : null,
    adminId: participant.adminId ? String(participant.adminId) : null,
    joinedAt: participant.joinedAt,
    lastSeenAt: participant.lastSeenAt,
    connected: Boolean(participant.connected),
    waiting: Boolean(participant.waiting),
    roomId: participant.roomId ? String(participant.roomId) : null,
  };

  if (includeSignalingKey) {
    snapshot.signalingKey = participant.signalingKey;
  }

  return snapshot;
};

const toSessionSnapshot = async (session, options = {}) => {
  if (!session) {
    return null;
  }

  const { includeParticipants = false, includeHostSecret = false, participants = null } = options;
  const sessionObj = toPlain(session);
  const participantList =
    includeParticipants && !participants
      ? await LiveParticipant.find({ session: sessionObj._id }).lean()
      : participants || [];

  const snapshot = {
    id: String(sessionObj._id || sessionObj.id),
    title: sessionObj.title,
    status: sessionObj.status,
    scheduledFor: sessionObj.scheduledFor,
    createdAt: sessionObj.createdAt,
    updatedAt: sessionObj.updatedAt,
    startedAt: sessionObj.startedAt,
    endedAt: sessionObj.endedAt,
    hostAdminId: sessionObj.hostAdminId ? String(sessionObj.hostAdminId) : null,
    hostDisplayName: sessionObj.hostDisplayName,
    courseId: sessionObj.courseId,
    courseName: sessionObj.courseName,
    courseSlug: sessionObj.courseSlug,
    totalParticipantCount: participantList.length,
    activeParticipantCount: participantList.filter((participant) => participant.connected).length,
    isLive: sessionObj.status === 'live',
    isJoinable: sessionObj.status !== 'ended',
    allowStudentAudio: sessionObj.allowStudentAudio,
    allowStudentVideo: sessionObj.allowStudentVideo,
    allowStudentScreenShare: sessionObj.allowStudentScreenShare,
    screenShareOwner: sessionObj.screenShareOwner ? String(sessionObj.screenShareOwner) : null,
    waitingRoomEnabled: sessionObj.waitingRoomEnabled || false,
    locked: sessionObj.locked || false,
    requiresPasscode: Boolean(sessionObj.passcodeHash),
  };

  if (includeParticipants) {
    snapshot.participants = participantList.map((participant) => toParticipantSnapshot(participant));
  }

  if (options.includeRooms) {
    const rooms = await LiveRoom.find({ session: sessionObj._id }).lean();
    snapshot.rooms = rooms.map((room) => ({
      id: String(room._id),
      name: room.name,
      slug: room.slug,
    }));
  }

  if (includeHostSecret) {
    snapshot.hostSecret = sessionObj.hostSecret;
    snapshot.meetingToken = sessionObj.meetingToken;
  }

  return snapshot;
};

const listSessionSnapshots = async (options = {}) => {
  const sessions = await LiveSession.find({}).sort({ createdAt: -1 }).lean();
  if (!options.includeParticipants) {
    return Promise.all(sessions.map((session) => toSessionSnapshot(session, options)));
  }

  const sessionIds = sessions.map((session) => session._id);
  const participants = await LiveParticipant.find({ session: { $in: sessionIds } }).lean();
  const rooms = options.includeRooms ? await LiveRoom.find({ session: { $in: sessionIds } }).lean() : [];
  const participantsBySession = new Map();
  participants.forEach((participant) => {
    const key = String(participant.session);
    if (!participantsBySession.has(key)) {
      participantsBySession.set(key, []);
    }
    participantsBySession.get(key).push(participant);
  });

  return Promise.all(
    sessions.map((session) =>
      toSessionSnapshot(session, {
        ...options,
        participants: participantsBySession.get(String(session._id)) || [],
        rooms: rooms.filter((room) => String(room.session) === String(session._id)),
      })
    )
  );
};

const createSessionRecord = async ({
  title,
  scheduledFor,
  hostAdminId,
  hostDisplayName,
  courseId,
  courseName,
  courseSlug,
  passcodeHash = null,
  waitingRoomEnabled = false,
  locked = false,
}) => {
  const session = await LiveSession.create({
    title: title?.trim() || 'Untitled live class',
    status: 'scheduled',
    scheduledFor: scheduledFor || null,
    hostAdminId,
    hostDisplayName,
    hostSecret: uuidv4(),
    meetingToken: uuidv4(),
    courseId: courseId || null,
    courseName: courseName || null,
    courseSlug: courseSlug || null,
    allowStudentAudio: true,
    allowStudentVideo: true,
    allowStudentScreenShare: true,
    waitingRoomEnabled,
    locked,
    passcodeHash,
    lastActivityAt: new Date(),
  });

  return toPlain(session);
};

const updateSessionRecord = async (sessionId, updates = {}) => {
  if (!sessionId) {
    return null;
  }

  const normalizedUpdates = { ...updates, lastActivityAt: new Date() };
  const session = await LiveSession.findByIdAndUpdate(sessionId, normalizedUpdates, { new: true }).lean();
  return session || null;
};

const setScreenShareOwner = async (sessionId, participantId) => {
  if (!sessionId) {
    return null;
  }

  const normalized = participantId ? String(participantId) : null;
  return LiveSession.findByIdAndUpdate(
    sessionId,
    { $set: { screenShareOwner: normalized, lastActivityAt: new Date() } },
    { new: true }
  ).lean();
};

const clearScreenShareOwnerIfMatches = async (sessionId, participantId) => {
  if (!sessionId || !participantId) {
    return null;
  }
  return LiveSession.findOneAndUpdate(
    { _id: sessionId, screenShareOwner: String(participantId) },
    { $set: { screenShareOwner: null, lastActivityAt: new Date() } },
    { new: true }
  ).lean();
};

const getSessionRecord = async (sessionId) => {
  if (!sessionId) {
    return null;
  }
  return LiveSession.findById(sessionId).lean();
};

const getSessionSnapshot = async (sessionId, options = {}) => {
  const session = await getSessionRecord(sessionId);
  return toSessionSnapshot(session, options);
};

const getParticipantsForSession = async (sessionId) => {
  if (!sessionId) {
    return [];
  }
  return LiveParticipant.find({ session: sessionId }).lean();
};

const addParticipantRecord = async (sessionId, payload) => {
  if (!sessionId) {
    return null;
  }

  const session = await LiveSession.findById(sessionId);
  if (!session) {
    return null;
  }

  const timestamp = new Date();
  const participant = await LiveParticipant.create({
    session: session._id,
    role: payload.role,
    displayName: payload.displayName || 'Participant',
    userId: payload.userId || null,
    adminId: payload.adminId || null,
    joinedAt: timestamp,
    lastSeenAt: timestamp,
    signalingKey: uuidv4(),
    connected: false,
    waiting: Boolean(payload.waiting),
    roomId: payload.roomId || null,
    metadata: payload.metadata || {},
  });

  await LiveSession.updateOne({ _id: sessionId }, { $set: { updatedAt: timestamp, lastActivityAt: timestamp } });

  const freshSession = await LiveSession.findById(sessionId).lean();
  return { session: freshSession || toPlain(session), participant: toPlain(participant) };
};

const getParticipantRecord = async (sessionId, participantId) => {
  if (!sessionId || !participantId) {
    return null;
  }

  return LiveParticipant.findOne({ _id: participantId, session: sessionId }).lean();
};

const removeParticipantRecord = async (sessionId, participantId) => {
  if (!sessionId || !participantId) {
    return false;
  }

  const result = await LiveParticipant.deleteOne({ _id: participantId, session: sessionId });
  if (result.deletedCount > 0) {
    await clearScreenShareOwnerIfMatches(sessionId, participantId);
  }
  return result.deletedCount > 0;
};

const setParticipantConnectionState = async (sessionId, participantId, connected) => {
  if (!sessionId || !participantId) {
    return null;
  }
  const timestamp = new Date();
  const participant = await LiveParticipant.findOneAndUpdate(
    { _id: participantId, session: sessionId },
    { $set: { connected: Boolean(connected), lastSeenAt: timestamp } },
    { new: true }
  ).lean();

  if (participant) {
    await LiveSession.updateOne({ _id: sessionId }, { $set: { updatedAt: timestamp, lastActivityAt: timestamp } });
    if (!connected) {
      await clearScreenShareOwnerIfMatches(sessionId, participantId);
    }
  }

  return participant;
};

const setParticipantWaitingState = async (sessionId, participantId, waiting) => {
  if (!sessionId || !participantId) {
    return null;
  }
  const timestamp = new Date();
  const participant = await LiveParticipant.findOneAndUpdate(
    { _id: participantId, session: sessionId },
    { $set: { waiting: Boolean(waiting), updatedAt: timestamp, lastSeenAt: timestamp } },
    { new: true }
  ).lean();

  if (participant) {
    await LiveSession.updateOne({ _id: sessionId }, { $set: { lastActivityAt: timestamp } });
    if (!waiting) {
      await clearScreenShareOwnerIfMatches(sessionId, participantId);
    }
  }

  return participant;
};

const createRoomRecord = async (sessionId, { name, slug }) => {
  if (!sessionId || !name || !slug) return null;
  const room = await LiveRoom.create({
    session: sessionId,
    name,
    slug,
  });
  return room.toObject ? room.toObject() : room;
};

const listRoomsForSession = async (sessionId) => {
  if (!sessionId) return [];
  const rooms = await LiveRoom.find({ session: sessionId }).lean();
  return rooms.map((room) => ({
    id: String(room._id),
    name: room.name,
    slug: room.slug,
  }));
};

const setParticipantRoom = async (sessionId, participantId, roomId) => {
  if (!sessionId || !participantId) return null;
  const timestamp = new Date();
  const participant = await LiveParticipant.findOneAndUpdate(
    { _id: participantId, session: sessionId },
    { $set: { roomId: roomId || null, updatedAt: timestamp, lastSeenAt: timestamp } },
    { new: true }
  ).lean();
  if (participant) {
    await LiveSession.updateOne({ _id: sessionId }, { $set: { lastActivityAt: timestamp } });
  }
  return participant;
};

const logLiveEvent = async ({ sessionId, participantId, role, kind, data }) => {
  if (!sessionId || !kind) return null;
  return LiveEvent.create({
    session: sessionId,
    participantId: participantId ? String(participantId) : null,
    role: role || null,
    kind,
    data: data || {},
    createdAt: new Date(),
  });
};

const listLiveEvents = async (sessionId, { limit = 500 } = {}) => {
  if (!sessionId) return [];
  const events = await LiveEvent.find({ session: sessionId }).sort({ createdAt: -1 }).limit(limit).lean();
  return events.map((e) => ({
    id: String(e._id),
    participantId: e.participantId || null,
    role: e.role || null,
    kind: e.kind,
    data: e.data || {},
    createdAt: e.createdAt,
  }));
};

const touchParticipant = async (sessionId, participantId) => {
  if (!sessionId || !participantId) {
    return null;
  }
  const timestamp = new Date();
  const participant = await LiveParticipant.findOneAndUpdate(
    { _id: participantId, session: sessionId },
    { $set: { lastSeenAt: timestamp } },
    { new: true }
  ).lean();

  if (participant) {
    await LiveSession.updateOne({ _id: sessionId }, { $set: { lastActivityAt: timestamp } });
  }

  return participant;
};

const verifyParticipantKey = async (sessionId, participantId, key) => {
  if (!sessionId || !participantId || !key) {
    return { valid: false };
  }

  const participant = await LiveParticipant.findOne({
    _id: participantId,
    session: sessionId,
    signalingKey: key,
  }).lean();

  if (!participant) {
    return { valid: false };
  }

  const session = await LiveSession.findById(sessionId).lean();
  return {
    valid: Boolean(session),
    session,
    participant,
  };
};

module.exports = {
  LIVE_SESSION_STATUSES,
  createSessionRecord,
  updateSessionRecord,
  toSessionSnapshot,
  toParticipantSnapshot,
  listSessionSnapshots,
  addParticipantRecord,
  getParticipantRecord,
  removeParticipantRecord,
  setParticipantConnectionState,
  touchParticipant,
  verifyParticipantKey,
  getSessionRecord,
  getSessionSnapshot,
  getParticipantsForSession,
  setScreenShareOwner,
  clearScreenShareOwnerIfMatches,
  setParticipantWaitingState,
  createRoomRecord,
  listRoomsForSession,
  setParticipantRoom,
  logLiveEvent,
  listLiveEvents,
};
