/*
  In-memory store for live session metadata
  - Persists live classes and participant state until the process restarts
  - Shared between REST controllers and the WebSocket signaling gateway
*/
const { v4: uuidv4 } = require('uuid');

const LIVE_SESSION_STATUSES = ['scheduled', 'live', 'ended'];

const sessions = new Map();

const nowIso = () => new Date().toISOString();

const requireSession = (sessionId) => {
  if (!sessionId) {
    return null;
  }

  return sessions.get(sessionId) || null;
};

const createSessionRecord = ({
  title,
  scheduledFor,
  hostAdminId,
  hostDisplayName,
  courseId,
  courseName,
  courseSlug,
}) => {
  const timestamp = nowIso();
  const session = {
    id: uuidv4(),
    title: title?.trim() || 'Untitled live class',
    status: 'scheduled',
    createdAt: timestamp,
    updatedAt: timestamp,
    startedAt: null,
    endedAt: null,
    scheduledFor: scheduledFor || null,
    hostAdminId,
    hostDisplayName,
    hostSecret: uuidv4(),
    courseId: courseId || null,
    courseName: courseName || null,
    courseSlug: courseSlug || null,
    participants: new Map(),
  };

  sessions.set(session.id, session);
  return session;
};

const updateSessionRecord = (sessionId, updates = {}) => {
  const session = requireSession(sessionId);
  if (!session) {
    return null;
  }

  if (typeof updates.title === 'string') {
    session.title = updates.title;
  }

  if (updates.scheduledFor !== undefined) {
    session.scheduledFor = updates.scheduledFor;
  }

  if (updates.courseId !== undefined) {
    session.courseId = updates.courseId;
  }

  if (updates.courseName !== undefined) {
    session.courseName = updates.courseName;
  }

  if (updates.courseSlug !== undefined) {
    session.courseSlug = updates.courseSlug;
  }

  if (updates.status && LIVE_SESSION_STATUSES.includes(updates.status)) {
    if (session.status !== updates.status) {
      session.status = updates.status;
      if (updates.status === 'live') {
        session.startedAt = session.startedAt || nowIso();
        session.endedAt = null;
      } else if (updates.status === 'ended') {
        session.endedAt = nowIso();
      }
    }
  }

  session.updatedAt = nowIso();
  return session;
};

const toParticipantSnapshot = (participant, { includeSignalingKey = false } = {}) => {
  if (!participant) {
    return null;
  }

  const snapshot = {
    id: participant.id,
    sessionId: participant.sessionId,
    displayName: participant.displayName,
    role: participant.role,
    userId: participant.userId,
    adminId: participant.adminId,
    joinedAt: participant.joinedAt,
    lastSeenAt: participant.lastSeenAt,
    connected: Boolean(participant.connected),
  };

  if (includeSignalingKey) {
    snapshot.signalingKey = participant.signalingKey;
  }

  return snapshot;
};

const toSessionSnapshot = (session, options = {}) => {
  if (!session) {
    return null;
  }

  const { includeParticipants = false, includeHostSecret = false } = options;
  const participants = Array.from(session.participants.values());
  const snapshot = {
    id: session.id,
    title: session.title,
    status: session.status,
    scheduledFor: session.scheduledFor,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    hostAdminId: session.hostAdminId,
    hostDisplayName: session.hostDisplayName,
    courseId: session.courseId,
    courseName: session.courseName,
    courseSlug: session.courseSlug,
    totalParticipantCount: participants.length,
    activeParticipantCount: participants.filter((participant) => participant.connected).length,
    isLive: session.status === 'live',
    isJoinable: session.status !== 'ended',
  };

  if (includeParticipants) {
    snapshot.participants = participants.map((participant) => toParticipantSnapshot(participant));
  }

  if (includeHostSecret) {
    snapshot.hostSecret = session.hostSecret;
  }

  return snapshot;
};

const listSessionSnapshots = (options = {}) => {
  return Array.from(sessions.values())
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((session) => toSessionSnapshot(session, options));
};

const addParticipantRecord = (sessionId, payload) => {
  const session = requireSession(sessionId);
  if (!session) {
    return null;
  }

  const timestamp = nowIso();
  const participant = {
    id: uuidv4(),
    sessionId,
    role: payload.role,
    displayName: payload.displayName || 'Participant',
    userId: payload.userId || null,
    adminId: payload.adminId || null,
    joinedAt: timestamp,
    lastSeenAt: timestamp,
    signalingKey: uuidv4(),
    connected: false,
    metadata: payload.metadata || {},
  };

  session.participants.set(participant.id, participant);
  session.updatedAt = timestamp;
  return { session, participant };
};

const getParticipantRecord = (sessionId, participantId) => {
  const session = requireSession(sessionId);
  if (!session) {
    return null;
  }

  return session.participants.get(participantId) || null;
};

const removeParticipantRecord = (sessionId, participantId) => {
  const session = requireSession(sessionId);
  if (!session) {
    return null;
  }

  const existed = session.participants.delete(participantId);
  if (existed) {
    session.updatedAt = nowIso();
  }

  return existed;
};

const setParticipantConnectionState = (sessionId, participantId, connected) => {
  const participant = getParticipantRecord(sessionId, participantId);
  if (!participant) {
    return null;
  }

  participant.connected = connected;
  participant.lastSeenAt = nowIso();
  return participant;
};

const touchParticipant = (sessionId, participantId) => {
  const participant = getParticipantRecord(sessionId, participantId);
  if (!participant) {
    return null;
  }

  participant.lastSeenAt = nowIso();
  return participant;
};

const verifyParticipantKey = (sessionId, participantId, key) => {
  const session = requireSession(sessionId);
  if (!session) {
    return { valid: false };
  }

  const participant = session.participants.get(participantId);
  if (!participant) {
    return { valid: false };
  }

  return {
    valid: participant.signalingKey === key,
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
  getSessionRecord: requireSession,
};
