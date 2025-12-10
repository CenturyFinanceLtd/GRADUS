/*
  Service layer for live classes
  - Encapsulates validation and derives sanitized responses for controllers
*/
const { LiveSessionError } = require('./errors');
const liveEvents = require('./liveEvents');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { LiveChatMessage } = require('../models/LiveChatMessage');
const {
  LIVE_SESSION_STATUSES,
  createSessionRecord,
  listSessionSnapshots,
  toSessionSnapshot,
  toParticipantSnapshot,
  updateSessionRecord,
  addParticipantRecord,
  getSessionRecord,
  getParticipantsForSession,
  removeParticipantRecord,
  getParticipantRecord,
  clearScreenShareOwnerIfMatches,
  setParticipantWaitingState,
  createRoomRecord,
  listRoomsForSession,
  setParticipantRoom,
  logLiveEvent,
  listLiveEvents,
} = require('./liveStore');
const { LiveRecording } = require('../models/LiveRecording');
const { cloudinary, liveRecordingsFolder } = require('../config/cloudinary');
const { Readable } = require('stream');
const { sendCourseNotification } = require('../utils/notifications');

const normalizeKey = (value) => {
  if (value === undefined || value === null) {
    return '';
  }
  return String(value).trim().toLowerCase();
};

const buildCourseKeyVariants = (rawKey) => {
  const normalized = normalizeKey(rawKey);
  if (!normalized) {
    return [];
  }

  const variants = new Set([normalized]);
  const parts = normalized.split(/[\\/]+/).filter(Boolean);
  if (parts.length > 1) {
    variants.add(parts[parts.length - 1]);
  }

  return Array.from(variants);
};

const normalizeIsoDate = (value) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new LiveSessionError('Invalid date supplied for scheduled time.', 400);
  }

  return date.toISOString();
};

const requireSession = async (sessionId) => {
  const session = await getSessionRecord(sessionId);
  if (!session) {
    throw new LiveSessionError('Live session not found.', 404);
  }
  return session;
};

const assertSessionJoinable = (session) => {
  if (session.status === 'ended') {
    throw new LiveSessionError('This live class has already ended.', 410);
  }
};

const deriveStudentName = (user, fallback) => {
  if (fallback && fallback.trim()) {
    return fallback.trim();
  }

  const userNameParts = [user?.firstName, user?.lastName]
    .map((part) => (part ? String(part).trim() : ''))
    .filter((part) => part.length > 0);

  if (userNameParts.length > 0) {
    return userNameParts.join(' ');
  }

  if (user?.personalDetails?.studentName) {
    return user.personalDetails.studentName.trim();
  }

  return user?.email || 'Student';
};

const hashPasscode = (value) => {
  if (!value || typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  return crypto.createHash('sha256').update(trimmed).digest('hex');
};

const createSession = async ({
  admin,
  title,
  scheduledFor,
  courseId,
  courseName,
  courseSlug,
  passcode,
  waitingRoomEnabled,
  locked,
}) => {
  if (!admin) {
    throw new LiveSessionError('Admin authentication is required.', 401);
  }

  if (!courseId) {
    throw new LiveSessionError('Selecting a course is required to start a live class.', 422);
  }

  const normalizedCourseName = (courseName && courseName.trim()) || 'Live Course';
  const normalizedCourseSlug = courseSlug ? String(courseSlug).trim() : null;

  const session = await createSessionRecord({
    title: (title && title.trim()) || `${normalizedCourseName} - Live Class`,
    scheduledFor: scheduledFor ? normalizeIsoDate(scheduledFor) : null,
    hostAdminId: admin._id ? String(admin._id) : null,
    hostDisplayName: admin.fullName || admin.email || 'Instructor',
    courseId: String(courseId),
    courseName: normalizedCourseName,
    courseSlug: normalizedCourseSlug,
    passcodeHash: hashPasscode(passcode),
    waitingRoomEnabled: Boolean(waitingRoomEnabled),
    locked: Boolean(locked),
  });

  // Send Push Notification
  // Fire and forget - do not block response
  sendCourseNotification(String(courseId), {
    title: 'Live Class Started! 🔴',
    body: `${session.title} is now live. Tap to join!`,
    data: { liveId: String(session._id), url: `/live/${String(session._id)}` },
  }).catch(err => console.error('Failed to send live notification:', err));

  return {
    session: await toSessionSnapshot(session, { includeParticipants: true, includeHostSecret: true }),
    hostSecret: session.hostSecret,
    meetingToken: session.meetingToken,
  };
};

const listSessions = async () => listSessionSnapshots({ includeParticipants: true, includeHostSecret: true, includeRooms: true });

const getSessionForAdmin = async (sessionId) => {
  const session = await requireSession(sessionId);
  return toSessionSnapshot(session, { includeParticipants: true, includeRooms: true, includeHostSecret: true });
};

const getSessionForParticipant = async (sessionId) => {
  const session = await requireSession(sessionId);
  return toSessionSnapshot(session, { includeParticipants: true, includeRooms: true });
};

const updateSession = async (sessionId, payload = {}) => {
  const existingSession = await requireSession(sessionId);
  const updates = {};

  if (typeof payload.title === 'string' && payload.title.trim()) {
    updates.title = payload.title.trim();
  }

  if (payload.scheduledFor !== undefined) {
    updates.scheduledFor = payload.scheduledFor ? normalizeIsoDate(payload.scheduledFor) : null;
  }

  if (payload.status !== undefined) {
    const normalizedStatus = String(payload.status).toLowerCase();
    if (!LIVE_SESSION_STATUSES.includes(normalizedStatus)) {
      throw new LiveSessionError('Invalid session status supplied.', 400);
    }
    updates.status = normalizedStatus;
    if (normalizedStatus === 'live' && existingSession.status !== 'live' && !existingSession.startedAt) {
      updates.startedAt = existingSession.startedAt || new Date();
    }
    if (normalizedStatus === 'ended' && existingSession.status !== 'ended') {
      updates.endedAt = new Date();
    }
  }

  if (payload.courseId !== undefined) {
    updates.courseId = payload.courseId ? String(payload.courseId) : null;
  }

  if (payload.courseName !== undefined) {
    updates.courseName = payload.courseName ? payload.courseName.trim() : null;
  }

  if (payload.courseSlug !== undefined) {
    updates.courseSlug = payload.courseSlug ? payload.courseSlug.trim() : null;
  }

  if (payload.allowStudentAudio !== undefined) {
    updates.allowStudentAudio = Boolean(payload.allowStudentAudio);
  }

  if (payload.allowStudentVideo !== undefined) {
    updates.allowStudentVideo = Boolean(payload.allowStudentVideo);
  }

  if (payload.allowStudentScreenShare !== undefined) {
    updates.allowStudentScreenShare = Boolean(payload.allowStudentScreenShare);
  }

  if (payload.waitingRoomEnabled !== undefined) {
    updates.waitingRoomEnabled = Boolean(payload.waitingRoomEnabled);
  }

  if (payload.locked !== undefined) {
    updates.locked = Boolean(payload.locked);
  }

  if (payload.passcode !== undefined) {
    updates.passcodeHash = hashPasscode(payload.passcode);
  }

  if (payload.rotateMeetingToken) {
    updates.meetingToken = crypto.randomUUID ? crypto.randomUUID() : uuidv4();
  }

  const session = await updateSessionRecord(sessionId, updates);
  if (!session) {
    throw new LiveSessionError('Live session not found.', 404);
  }

  liveEvents.emit('session-updated', sessionId);

  return toSessionSnapshot(session, { includeParticipants: true, includeHostSecret: true });
};

const buildSessionSnapshotWithParticipants = async (session, options = {}) => {
  if (!session) {
    return null;
  }
  const participants = await getParticipantsForSession(session._id || session.id);
  return toSessionSnapshot(session, {
    includeParticipants: true,
    participants,
    includeHostSecret: options.includeHostSecret || false,
    includeRooms: options.includeRooms || false,
  });
};

const enforceAccessControls = (session, { passcode, meetingToken }) => {
  if (session.locked) {
    throw new LiveSessionError('This live class is locked by the instructor.', 403);
  }

  if (session.passcodeHash) {
    const providedHash =
      meetingToken && meetingToken === session.meetingToken ? session.passcodeHash : hashPasscode(passcode);
    if (!providedHash || providedHash !== session.passcodeHash) {
      throw new LiveSessionError('Invalid passcode for this live class.', 401);
    }
  }
};

const registerStudentParticipant = async ({ sessionId, user, displayName, passcode, meetingToken }) => {
  if (!user) {
    throw new LiveSessionError('User authentication required.', 401);
  }

  const session = await requireSession(sessionId);
  assertSessionJoinable(session);
  if (session.bannedUserIds && session.bannedUserIds.includes(String(user._id || ''))) {
    throw new LiveSessionError('You have been removed from this live class.', 403);
  }
  enforceAccessControls(session, { passcode, meetingToken });
  const resolvedName = deriveStudentName(user, displayName);
  const waiting = Boolean(session.waitingRoomEnabled);

  const { session: updatedSession, participant } = await addParticipantRecord(sessionId, {
    role: 'student',
    displayName: resolvedName,
    userId: user._id ? String(user._id) : null,
    metadata: { email: user.email },
    waiting,
  });

  liveEvents.emit('session-updated', sessionId);
  await logLiveEvent({
    sessionId,
    participantId: participant._id,
    role: 'student',
    kind: 'join',
    data: { displayName: resolvedName, waiting },
  });

  return {
    session: await buildSessionSnapshotWithParticipants(updatedSession, { includeRooms: true }),
    participant: toParticipantSnapshot(participant, { includeSignalingKey: true }),
    signalingKey: participant.signalingKey,
    waiting,
  };
};

const registerInstructorParticipant = async ({ sessionId, admin, hostSecret }) => {
  if (!admin) {
    throw new LiveSessionError('Admin authentication required.', 401);
  }

  const session = await requireSession(sessionId);
  assertSessionJoinable(session);

  if (!hostSecret || hostSecret !== session.hostSecret) {
    throw new LiveSessionError('Invalid instructor access secret.', 403);
  }

  const { session: updatedSession, participant } = await addParticipantRecord(sessionId, {
    role: 'instructor',
    displayName: admin.fullName || admin.email || 'Instructor',
    adminId: admin._id ? String(admin._id) : null,
  });

  await logLiveEvent({
    sessionId,
    participantId: participant._id,
    role: 'instructor',
    kind: 'join',
    data: { displayName: participant.displayName },
  });

  return {
    session: await buildSessionSnapshotWithParticipants(updatedSession, { includeHostSecret: true, includeRooms: true }),
    participant: toParticipantSnapshot(participant, { includeSignalingKey: true }),
    signalingKey: participant.signalingKey,
  };
};

const findActiveSessionByCourse = async ({ courseKey }) => {
  const candidates = buildCourseKeyVariants(courseKey);
  if (!candidates.length) {
    return null;
  }

  const sessions = await listSessionSnapshots({ includeParticipants: true });
  return (
    sessions.find((session) => {
      if (session.status !== 'live') {
        return false;
      }
      const courseId = normalizeKey(session.courseId);
      const courseSlug = normalizeKey(session.courseSlug);
      return candidates.some((key) => key === courseId || key === courseSlug);
    }) || null
  );
};

const commandParticipantMedia = async ({ sessionId, participantId, admin, media }) => {
  if (!admin) {
    throw new LiveSessionError('Admin authentication required.', 401);
  }
  const session = await requireSession(sessionId);
  if (!participantId) {
    throw new LiveSessionError('Participant is required.', 400);
  }
  const participant = await getParticipantRecord(sessionId, participantId);
  if (media && media.screenShare === false) {
    await clearScreenShareOwnerIfMatches(sessionId, participantId);
    liveEvents.emit('session-updated', sessionId);
  }
  await logLiveEvent({
    sessionId,
    participantId,
    role: participant?.role,
    kind: 'media',
    data: media || {},
  });
  liveEvents.emit('participant-command', {
    sessionId,
    participantId,
    payload: { type: 'media-state', data: media || {} },
  });
  return toSessionSnapshot(session, { includeParticipants: true, includeHostSecret: true });
};

const removeParticipant = async ({ sessionId, participantId, admin, ban }) => {
  if (!admin) {
    throw new LiveSessionError('Admin authentication required.', 401);
  }
  if (!participantId) {
    throw new LiveSessionError('Participant is required.', 400);
  }
  const session = await requireSession(sessionId);
  const participant = await getParticipantRecord(sessionId, participantId);
  const removed = await removeParticipantRecord(sessionId, participantId);
  if (ban && removed && participant?.userId) {
    await updateSessionRecord(sessionId, {
      $addToSet: { bannedUserIds: String(participant.userId) },
    });
  }
  liveEvents.emit('participant-command', {
    sessionId,
    participantId,
    payload: { type: 'kick', data: { reason: ban ? 'banned' : 'removed' } },
  });
  await logLiveEvent({
    sessionId,
    participantId,
    role: participant?.role,
    kind: 'kick',
    data: { ban: Boolean(ban) },
  });
  return toSessionSnapshot(session, { includeParticipants: true, includeHostSecret: true });
};

const admitParticipant = async ({ sessionId, participantId, admin }) => {
  if (!admin) {
    throw new LiveSessionError('Admin authentication required.', 401);
  }
  const session = await requireSession(sessionId);
  const participant = await getParticipantRecord(sessionId, participantId);
  if (!participant) {
    throw new LiveSessionError('Participant not found.', 404);
  }
  await setParticipantWaitingState(sessionId, participantId, false);
  liveEvents.emit('session-updated', sessionId);
  await logLiveEvent({
    sessionId,
    participantId,
    role: participant.role,
    kind: 'admit',
  });
  return toSessionSnapshot(session, { includeParticipants: true, includeHostSecret: true });
};

const denyParticipant = async ({ sessionId, participantId, admin }) => {
  if (!admin) {
    throw new LiveSessionError('Admin authentication required.', 401);
  }
  const session = await requireSession(sessionId);
  const removed = await removeParticipantRecord(sessionId, participantId);
  if (!removed) {
    throw new LiveSessionError('Participant not found.', 404);
  }
  liveEvents.emit('session-updated', sessionId);
  await logLiveEvent({
    sessionId,
    participantId,
    role: 'student',
    kind: 'deny',
  });
  return toSessionSnapshot(session, { includeParticipants: true, includeHostSecret: true });
};

const createRoom = async ({ sessionId, admin, name }) => {
  if (!admin) {
    throw new LiveSessionError('Admin authentication required.', 401);
  }
  const session = await requireSession(sessionId);
  const slug = name.trim().toLowerCase().replace(/\s+/g, '-').slice(0, 48);
  const room = await createRoomRecord(sessionId, { name: name.trim(), slug });
  liveEvents.emit('session-updated', sessionId);
  return {
    room: { id: String(room._id), name: room.name, slug: room.slug },
    session: await toSessionSnapshot(session, { includeParticipants: true, includeRooms: true, includeHostSecret: true }),
  };
};

const listRooms = async ({ sessionId, admin }) => {
  if (!admin) {
    throw new LiveSessionError('Admin authentication required.', 401);
  }
  const session = await requireSession(sessionId);
  const rooms = await listRoomsForSession(sessionId);
  return {
    rooms,
    session: await toSessionSnapshot(session, { includeParticipants: true, includeRooms: true, includeHostSecret: true }),
  };
};

const moveParticipantRoom = async ({ sessionId, participantId, admin, roomId }) => {
  if (!admin) {
    throw new LiveSessionError('Admin authentication required.', 401);
  }
  const session = await requireSession(sessionId);
  const participant = await getParticipantRecord(sessionId, participantId);
  if (!participant) {
    throw new LiveSessionError('Participant not found.', 404);
  }
  if (roomId) {
    const room = await listRoomsForSession(sessionId);
    const exists = room.find((r) => r.id === roomId);
    if (!exists) {
      throw new LiveSessionError('Room not found.', 404);
    }
  }
  await setParticipantRoom(sessionId, participantId, roomId || null);
  liveEvents.emit('participant-room-changed', { sessionId, participantId, roomId: roomId || null });
  liveEvents.emit('session-updated', sessionId);
  return toSessionSnapshot(session, { includeParticipants: true, includeRooms: true, includeHostSecret: true });
};

const saveRecording = async ({ sessionId, admin, participantId, fileBuffer, mimeType, durationMs }) => {
  if (!admin) {
    throw new LiveSessionError('Admin authentication required.', 401);
  }
  const session = await requireSession(sessionId);
  if (session.hostAdminId && String(session.hostAdminId) !== String(admin._id || '')) {
    throw new LiveSessionError('Only the host can save recordings.', 403);
  }
  if (!fileBuffer || !mimeType) {
    throw new LiveSessionError('Recording file is required.', 400);
  }

  let uploadResult;
  try {
    uploadResult = await new Promise((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        {
          resource_type: 'video',
          folder: liveRecordingsFolder || 'gradus/live-recordings',
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      Readable.from(fileBuffer).pipe(upload);
    });
  } catch (error) {
    throw new LiveSessionError(error?.message || 'Failed to upload recording.', 500);
  }

  const recording = await LiveRecording.create({
    session: sessionId,
    adminId: admin._id,
    participantId: participantId ? String(participantId) : null,
    url: uploadResult.secure_url || uploadResult.url,
    publicId: uploadResult.public_id,
    bytes: uploadResult.bytes || null,
    durationMs: durationMs ? Number(durationMs) : null,
    format: uploadResult.format || null,
  });

  return {
    recording: {
      id: String(recording._id),
      url: recording.url,
      durationMs: recording.durationMs,
      bytes: recording.bytes,
      format: recording.format,
      createdAt: recording.createdAt,
      publicId: recording.publicId,
    },
  };
};

const getChatMessages = async (sessionId, { limit = 200 } = {}) => {
  const session = await requireSession(sessionId);
  if (!session) {
    throw new LiveSessionError('Live session not found.', 404);
  }
  const messages = await LiveChatMessage.find({ session: sessionId })
    .sort({ createdAt: 1 })
    .limit(Math.min(limit, 500))
    .lean();
  return messages.map((m) => ({
    id: String(m._id),
    participantId: m.participant ? String(m.participant) : null,
    senderRole: m.senderRole || 'student',
    displayName: m.senderDisplayName || 'Participant',
    text: m.message,
    timestamp: m.createdAt,
  }));
};

const listAttendance = async ({ sessionId, admin }) => {
  if (!admin) throw new LiveSessionError('Admin authentication required.', 401);
  await requireSession(sessionId);
  const participants = await getParticipantsForSession(sessionId);
  return participants.map((p) => ({
    id: String(p._id),
    displayName: p.displayName,
    role: p.role,
    joinedAt: p.joinedAt,
    lastSeenAt: p.lastSeenAt,
    connected: p.connected,
    waiting: p.waiting,
    roomId: p.roomId || null,
  }));
};

const listSessionEvents = async ({ sessionId, admin, limit = 500 }) => {
  if (!admin) throw new LiveSessionError('Admin authentication required.', 401);
  await requireSession(sessionId);
  return listLiveEvents(sessionId, { limit });
};

module.exports = {
  createSession,
  listSessions,
  getSessionForAdmin,
  getSessionForParticipant,
  updateSession,
  registerStudentParticipant,
  registerInstructorParticipant,
  findActiveSessionByCourse,
  commandParticipantMedia,
  removeParticipant,
  getChatMessages,
  admitParticipant,
  denyParticipant,
  saveRecording,
  createRoom,
  listRooms,
  moveParticipantRoom,
  listAttendance,
  listSessionEvents,
};
