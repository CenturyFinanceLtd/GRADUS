const asyncHandler = require('express-async-handler');
const dayjs = require('dayjs');
const Course = require('../models/Course');
const LiveSession = require('../models/LiveSession');
const Enrollment = require('../models/Enrollment');

const findCourseBySlug = async (slug) => {
  if (!slug) {
    return null;
  }

  return Course.findOne({ slug: slug.toString().trim().toLowerCase() });
};

const buildStudentSessionResponse = (session) => {
  if (!session) {
    return null;
  }

  const sessionObj = session.toObject ? session.toObject() : session;

  return {
    id: sessionObj._id?.toString?.(),
    provider: sessionObj.provider,
    title: sessionObj.title,
    description: sessionObj.description,
    status: sessionObj.status,
    scheduledStart: sessionObj.scheduledStart,
    actualStart: sessionObj.actualStart,
    actualEnd: sessionObj.actualEnd,
    durationMinutes: sessionObj.durationMinutes,
    meeting: {
      joinUrl: sessionObj.meeting?.joinUrl || '',
      password: sessionObj.meeting?.password || '',
    },
  };
};

const requireEnrollment = async ({ userId, courseId }) => {
  const enrollment = await Enrollment.findOne({
    user: userId,
    course: courseId,
    status: 'ACTIVE',
  });

  if (!enrollment) {
    const error = new Error('You are not enrolled in this course.');
    error.status = 403;
    throw error;
  }

  return enrollment;
};

const getActiveSessionForCourse = asyncHandler(async (req, res) => {
  const { courseSlug } = req.params;

  const course = await findCourseBySlug(courseSlug);

  if (!course) {
    res.status(404);
    throw new Error('Course not found.');
  }

  const session = await LiveSession.findOne({
    course: course._id,
    status: 'LIVE',
  }).sort({ actualStart: -1 });

  if (!session) {
    res.json({ session: null });
    return;
  }

  res.json({ session: buildStudentSessionResponse(session) });
});

const joinSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  const session = await LiveSession.findById(sessionId);

  if (!session || session.status !== 'LIVE') {
    res.status(404);
    throw new Error('Live session not found.');
  }

  await requireEnrollment({ userId: req.user._id, courseId: session.course });

  const participantId = req.user._id.toString();
  session.participants = Array.isArray(session.participants) ? session.participants : [];
  let participant = session.participants.find((item) => item.student?.toString?.() === participantId);

  if (!participant) {
    participant = {
      student: req.user._id,
      status: 'INVITED',
      accumulatedWatchTimeMs: 0,
      attendancePercentage: 0,
      joinEvents: [],
    };
    session.participants.push(participant);
  }

  const now = new Date();
  participant.status = 'JOINED';
  participant.lastJoinedAt = now;
  participant.joinEvents = Array.isArray(participant.joinEvents) ? participant.joinEvents : [];
  participant.joinEvents.push({
    joinedAt: now,
    leftAt: null,
    watchTimeMs: 0,
  });

  await session.save();

  res.json({ session: buildStudentSessionResponse(session) });
});

const pingSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const { elapsedMs } = req.body || {};

  const increment = Number(elapsedMs) > 0 ? Number(elapsedMs) : 0;

  const session = await LiveSession.findById(sessionId);

  if (!session || session.status !== 'LIVE') {
    res.status(404);
    throw new Error('Live session not found.');
  }

  await requireEnrollment({ userId: req.user._id, courseId: session.course });

  const participantId = req.user._id.toString();
  const participant = Array.isArray(session.participants)
    ? session.participants.find((item) => item.student?.toString?.() === participantId)
    : null;

  if (!participant) {
    res.status(404);
    throw new Error('Participant record not found.');
  }

  if (participant.status !== 'JOINED') {
    res.status(409);
    throw new Error('You are not currently joined to this session.');
  }

  if (increment > 0) {
    participant.accumulatedWatchTimeMs += increment;
    const activeEvent = participant.joinEvents?.[participant.joinEvents.length - 1];
    if (activeEvent && !activeEvent.leftAt) {
      activeEvent.watchTimeMs = (activeEvent.watchTimeMs || 0) + increment;
    }
    participant.lastJoinedAt = new Date();
  } else if (participant.lastJoinedAt) {
    const now = dayjs();
    const delta = Math.max(0, now.diff(dayjs(participant.lastJoinedAt)));
    participant.accumulatedWatchTimeMs += delta;
    const activeEvent = participant.joinEvents?.[participant.joinEvents.length - 1];
    if (activeEvent && !activeEvent.leftAt) {
      activeEvent.watchTimeMs = (activeEvent.watchTimeMs || 0) + delta;
    }
    participant.lastJoinedAt = now.toDate();
  }

  const totalTarget = session.expectedWatchTimeMs || session.durationMinutes * 60 * 1000;
  if (totalTarget > 0) {
    participant.attendancePercentage = Math.min(
      100,
      Math.round((participant.accumulatedWatchTimeMs / totalTarget) * 100)
    );
  }

  await session.save();

  res.json({
    stats: {
      accumulatedWatchTimeMs: participant.accumulatedWatchTimeMs,
      attendancePercentage: participant.attendancePercentage,
    },
  });
});

const leaveSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  const session = await LiveSession.findById(sessionId);

  if (!session || session.status !== 'LIVE') {
    res.status(404);
    throw new Error('Live session not found.');
  }

  await requireEnrollment({ userId: req.user._id, courseId: session.course });

  const participantId = req.user._id.toString();
  const participant = Array.isArray(session.participants)
    ? session.participants.find((item) => item.student?.toString?.() === participantId)
    : null;

  if (!participant) {
    res.status(404);
    throw new Error('Participant record not found.');
  }

  if (participant.status !== 'JOINED') {
    res.status(409);
    throw new Error('You are not currently joined to this session.');
  }

  const now = new Date();
  if (participant.lastJoinedAt) {
    const delta = Math.max(0, now.getTime() - new Date(participant.lastJoinedAt).getTime());
    participant.accumulatedWatchTimeMs += delta;
    participant.lastJoinedAt = null;

    const activeEvent = participant.joinEvents?.[participant.joinEvents.length - 1];
    if (activeEvent && !activeEvent.leftAt) {
      activeEvent.leftAt = now;
      activeEvent.watchTimeMs = (activeEvent.watchTimeMs || 0) + delta;
    }
  }

  participant.status = 'LEFT';

  const totalTarget = session.expectedWatchTimeMs || session.durationMinutes * 60 * 1000;
  if (totalTarget > 0) {
    participant.attendancePercentage = Math.min(
      100,
      Math.round((participant.accumulatedWatchTimeMs / totalTarget) * 100)
    );
  }

  await session.save();

  res.json({
    stats: {
      accumulatedWatchTimeMs: participant.accumulatedWatchTimeMs,
      attendancePercentage: participant.attendancePercentage,
    },
  });
});

module.exports = {
  getActiveSessionForCourse,
  joinSession,
  pingSession,
  leaveSession,
};
