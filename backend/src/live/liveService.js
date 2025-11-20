/*
  Service layer for live classes
  - Encapsulates validation and derives sanitized responses for controllers
*/
const { LiveSessionError } = require('./errors');
const {
  LIVE_SESSION_STATUSES,
  createSessionRecord,
  listSessionSnapshots,
  toSessionSnapshot,
  toParticipantSnapshot,
  updateSessionRecord,
  addParticipantRecord,
  getSessionRecord,
} = require('./liveStore');

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

const requireSession = (sessionId) => {
  const session = getSessionRecord(sessionId);
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

  const userNameParts = [
    user?.firstName,
    user?.lastName,
  ]
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

const createSession = ({ admin, title, scheduledFor, courseId, courseName, courseSlug }) => {
  if (!admin) {
    throw new LiveSessionError('Admin authentication is required.', 401);
  }

  if (!courseId) {
    throw new LiveSessionError('Selecting a course is required to start a live class.', 422);
  }

  const normalizedCourseName = (courseName && courseName.trim()) || 'Live Course';
  const normalizedCourseSlug = courseSlug ? String(courseSlug).trim() : null;

  const session = createSessionRecord({
    title: (title && title.trim()) || `${normalizedCourseName} - Live Class`,
    scheduledFor: scheduledFor ? normalizeIsoDate(scheduledFor) : null,
    hostAdminId: admin._id ? String(admin._id) : null,
    hostDisplayName: admin.fullName || admin.email || 'Instructor',
    courseId: String(courseId),
    courseName: normalizedCourseName,
    courseSlug: normalizedCourseSlug,
  });

  return {
    session: toSessionSnapshot(session, { includeParticipants: true }),
    hostSecret: session.hostSecret,
  };
};

const listSessions = () => listSessionSnapshots({ includeParticipants: true });

const getSessionForAdmin = (sessionId) => {
  const session = requireSession(sessionId);
  return toSessionSnapshot(session, { includeParticipants: true, includeHostSecret: true });
};

const getSessionForParticipant = (sessionId) => {
  const session = requireSession(sessionId);
  return toSessionSnapshot(session, { includeParticipants: true });
};

const updateSession = (sessionId, payload = {}) => {
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

  const session = updateSessionRecord(sessionId, updates);
  if (!session) {
    throw new LiveSessionError('Live session not found.', 404);
  }

  return toSessionSnapshot(session, { includeParticipants: true });
};

const registerStudentParticipant = ({ sessionId, user, displayName }) => {
  if (!user) {
    throw new LiveSessionError('User authentication required.', 401);
  }

  const session = requireSession(sessionId);
  assertSessionJoinable(session);
  const resolvedName = deriveStudentName(user, displayName);

  const { session: updatedSession, participant } = addParticipantRecord(session.id, {
    role: 'student',
    displayName: resolvedName,
    userId: user._id ? String(user._id) : null,
    metadata: { email: user.email },
  });

  return {
    session: toSessionSnapshot(updatedSession, { includeParticipants: true }),
    participant: toParticipantSnapshot(participant),
    signalingKey: participant.signalingKey,
  };
};

const registerInstructorParticipant = ({ sessionId, admin, hostSecret }) => {
  if (!admin) {
    throw new LiveSessionError('Admin authentication required.', 401);
  }

  const session = requireSession(sessionId);
  assertSessionJoinable(session);

  if (!hostSecret || hostSecret !== session.hostSecret) {
    throw new LiveSessionError('Invalid instructor access secret.', 403);
  }

  const { session: updatedSession, participant } = addParticipantRecord(session.id, {
    role: 'instructor',
    displayName: admin.fullName || admin.email || 'Instructor',
    adminId: admin._id ? String(admin._id) : null,
  });

  return {
    session: toSessionSnapshot(updatedSession, { includeParticipants: true }),
    participant: toParticipantSnapshot(participant),
    signalingKey: participant.signalingKey,
  };
};

const findActiveSessionByCourse = ({ courseKey }) => {
  if (!courseKey) {
    return null;
  }

  const normalized = String(courseKey).trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  const sessions = listSessionSnapshots();
  return (
    sessions.find((session) => {
      if (session.status !== 'live') {
        return false;
      }
      const courseIdMatch =
        session.courseId && String(session.courseId).trim().toLowerCase() === normalized;
      const courseSlugMatch =
        session.courseSlug && String(session.courseSlug).trim().toLowerCase() === normalized;
      return courseIdMatch || courseSlugMatch;
    }) || null
  );
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
};
