const asyncHandler = require('express-async-handler');
const dayjs = require('dayjs');
const mongoose = require('mongoose');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const LiveSession = require('../models/LiveSession');
const { sendEmail } = require('../utils/email');
const { createLiveMeeting } = require('../services/liveMeetingService');
const config = require('../config/env');
const { emitCourseEvent } = require('../realtime/socket');

const buildSessionResponse = (session) => {
  if (!session) {
    return null;
  }

  const sessionObj = session.toObject ? session.toObject() : session;

  return {
    id: sessionObj._id?.toString(),
    courseId: sessionObj.course?._id?.toString?.() || sessionObj.course?.toString?.() || '',
    teacherId: sessionObj.teacher?._id?.toString?.() || sessionObj.teacher?.toString?.() || '',
    title: sessionObj.title,
    description: sessionObj.description,
    provider: sessionObj.provider,
    status: sessionObj.status,
    scheduledStart: sessionObj.scheduledStart,
    durationMinutes: sessionObj.durationMinutes,
    actualStart: sessionObj.actualStart,
    actualEnd: sessionObj.actualEnd,
    expectedWatchTimeMs: sessionObj.expectedWatchTimeMs,
    meeting: {
      meetingId: sessionObj.meeting?.meetingId || '',
      joinUrl: sessionObj.meeting?.joinUrl || '',
      startUrl: sessionObj.meeting?.startUrl || '',
      password: sessionObj.meeting?.password || '',
      organizerEmail: sessionObj.meeting?.organizerEmail || '',
    },
    notifications: sessionObj.notifications || {},
    recordingUrl: sessionObj.recordingUrl || '',
    participants: Array.isArray(sessionObj.participants)
      ? sessionObj.participants.map((participant) => ({
          studentId: participant.student?._id?.toString?.() || participant.student?.toString?.() || '',
          student: participant.student
            ? {
                id: participant.student._id?.toString?.() || '',
                firstName: participant.student.firstName || '',
                lastName: participant.student.lastName || '',
                email: participant.student.email || '',
                mobile: participant.student.mobile || '',
              }
            : null,
          status: participant.status,
          accumulatedWatchTimeMs: participant.accumulatedWatchTimeMs,
          attendancePercentage: participant.attendancePercentage,
          lastJoinedAt: participant.lastJoinedAt,
          joinEvents: participant.joinEvents || [],
        }))
      : [],
    createdAt: sessionObj.createdAt,
    updatedAt: sessionObj.updatedAt,
  };
};

const canViewAllSessions = (admin) => {
  const role = (admin?.role || '').toLowerCase();
  return role && role !== 'teacher';
};

const ensureCourseExists = async (courseId) => {
  if (!mongoose.Types.ObjectId.isValid(courseId)) {
    const error = new Error('A valid course identifier is required.');
    error.status = 400;
    throw error;
  }

  const course = await Course.findById(courseId);

  if (!course) {
    const error = new Error('Course not found.');
    error.status = 404;
    throw error;
  }

  return course;
};

const listCourses = asyncHandler(async (req, res) => {
  const courses = await Course.find().sort({ order: 1, name: 1 }).lean();

  res.json({
    items: courses.map((course) => ({
      id: course._id.toString(),
      name: course.name,
      slug: course.slug,
      subtitle: course.subtitle || '',
    })),
  });
});

const getCourseRoster = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const course = await ensureCourseExists(courseId);

  const enrollments = await Enrollment.find({ course: course._id, status: 'ACTIVE' })
    .populate('user', 'firstName lastName email mobile')
    .sort({ createdAt: -1 })
    .lean();

  res.json({
    course: {
      id: course._id.toString(),
      name: course.name,
      slug: course.slug,
    },
    students: enrollments
      .filter((enrollment) => enrollment.user)
      .map((enrollment) => ({
        enrollmentId: enrollment._id.toString(),
        studentId: enrollment.user._id.toString(),
        firstName: enrollment.user.firstName,
        lastName: enrollment.user.lastName,
        email: enrollment.user.email,
        mobile: enrollment.user.mobile,
        enrolledAt: enrollment.createdAt,
      })),
  });
});

const listSessions = asyncHandler(async (req, res) => {
  const { courseId, status } = req.query;

  const filters = {};

  if (courseId && mongoose.Types.ObjectId.isValid(courseId)) {
    filters.course = courseId;
  }

  if (status) {
    filters.status = status.toUpperCase();
  }

  if (!canViewAllSessions(req.admin)) {
    filters.teacher = req.admin._id;
  }

  const sessions = await LiveSession.find(filters)
    .populate('course', 'name slug')
    .populate('teacher', 'fullName email role')
    .sort({ scheduledStart: -1 });

  res.json({
    items: sessions.map((session) => ({
      ...buildSessionResponse(session),
      course: session.course
        ? {
            id: session.course._id.toString(),
            name: session.course.name,
            slug: session.course.slug,
          }
        : null,
      teacher: session.teacher
        ? {
            id: session.teacher._id.toString(),
            name: session.teacher.fullName,
            email: session.teacher.email,
            role: session.teacher.role,
          }
        : null,
    })),
  });
});

const createSession = asyncHandler(async (req, res) => {
  const { courseId, scheduledStart, durationMinutes, provider, title, description, joinUrl } = req.body || {};

  if (!scheduledStart) {
    res.status(400);
    throw new Error('Scheduled start time is required.');
  }

  const course = await ensureCourseExists(courseId);
  const startTime = new Date(scheduledStart);

  if (Number.isNaN(startTime.getTime())) {
    res.status(400);
    throw new Error('A valid scheduled start date is required.');
  }

  const normalizedDuration = Number(durationMinutes) > 0 ? Number(durationMinutes) : 60;
  const normalizedProvider = (provider || config.liveClass.defaultProvider || 'teams').toLowerCase();

  const session = await LiveSession.create({
    course: course._id,
    teacher: req.admin._id,
    title: title || `Live Class - ${course.name}`,
    description: description || '',
    provider: normalizedProvider,
    status: 'SCHEDULED',
    scheduledStart: startTime,
    durationMinutes: normalizedDuration,
    expectedWatchTimeMs: normalizedDuration * 60 * 1000,
    meeting: joinUrl
      ? {
          joinUrl,
          startUrl: joinUrl,
        }
      : {},
  });

  res.status(201).json({ session: buildSessionResponse(session) });
});

const loadEnrollmentsForSession = async (session) => {
  const enrollments = await Enrollment.find({ course: session.course, status: 'ACTIVE' })
    .populate('user', 'firstName lastName email mobile')
    .lean();

  return enrollments.filter((enrollment) => enrollment.user);
};

const ensureParticipants = (session, enrollments) => {
  const participantMap = new Map();
  session.participants = Array.isArray(session.participants) ? session.participants : [];

  session.participants.forEach((participant) => {
    const participantId = participant.student?.toString?.() || '';
    if (participantId) {
      participantMap.set(participantId, participant);
    }
  });

  enrollments.forEach((enrollment) => {
    const studentId = enrollment.user._id.toString();
    if (!participantMap.has(studentId)) {
      session.participants.push({
        student: enrollment.user._id,
        status: 'INVITED',
        accumulatedWatchTimeMs: 0,
        attendancePercentage: 0,
        joinEvents: [],
        lastJoinedAt: null,
      });
    }
  });
};

const sendLiveClassEmails = async ({ session, enrollments, course }) => {
  const joinUrl = session.meeting?.joinUrl;

  if (!joinUrl) {
    return;
  }

  const subject = `${session.title || 'Your live class'} is starting now`;
  const promises = enrollments.map((enrollment) =>
    sendEmail({
      to: enrollment.user.email,
      subject,
      text: `Hello ${enrollment.user.firstName},\n\nYour live class "${session.title}" for ${
        course?.name || 'your course'
      } has just started. Join now: ${joinUrl}\n\nBest regards,\nGradus Team`,
      html: `
        <p>Hello ${enrollment.user.firstName || 'there'},</p>
        <p>Your live class <strong>${session.title}</strong> for <em>${
          course?.name || 'your course'
        }</em> has just started.</p>
        <p><a href="${joinUrl}" style="display:inline-block;padding:10px 16px;background:#0B5394;color:#fff;border-radius:4px;text-decoration:none;">Join the live class</a></p>
        <p>If the button does not work, copy this link into your browser:<br/><a href="${joinUrl}">${joinUrl}</a></p>
        <p>Regards,<br/>Gradus Team</p>
      `,
    }).catch((error) => {
      console.error('[live-session] Failed to send email', enrollment.user.email, error);
    })
  );

  await Promise.all(promises);
};

const startSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const { joinUrl } = req.body || {};

  const session = await LiveSession.findById(sessionId)
    .populate('course', 'name slug')
    .populate('teacher', 'fullName email role');
  const course = session?.course;

  if (!session) {
    res.status(404);
    throw new Error('Session not found.');
  }

  const teacherId = session.teacher?._id ? session.teacher._id.toString() : session.teacher?.toString?.();

  if (!canViewAllSessions(req.admin) && teacherId !== req.admin._id.toString()) {
    res.status(403);
    throw new Error('You do not have permission to start this session.');
  }

  if (session.status === 'LIVE') {
    res.status(409);
    throw new Error('This session is already live.');
  }

  if (session.status === 'ENDED' || session.status === 'CANCELLED') {
    res.status(400);
    throw new Error('Cannot start a session that has already ended or was cancelled.');
  }

  const enrollments = await loadEnrollmentsForSession(session);

  const organizerOverride = config.liveClass.teams.organizerUserId || null;
  const preferredOrganizerEmail = req.admin?.email || session.teacher?.email || null;
  const organizerUserIdForMeeting = preferredOrganizerEmail || organizerOverride;
  let meetingCreationError = null;

  console.log('[live-session] startSession', {
    sessionId: session._id.toString(),
    adminEmail: req.admin?.email,
    teacherEmail: session.teacher?.email,
    organizerUserIdForMeeting,
  });

  if (!session.meeting?.joinUrl && !joinUrl) {
    try {
      const meeting = await createLiveMeeting({
        provider: session.provider,
        title: session.title,
        startTime: new Date(),
        durationMinutes: session.durationMinutes,
        organizerUserId: organizerUserIdForMeeting,
      });

      if (meeting) {
        session.meeting = {
          meetingId: meeting.meetingId,
          joinUrl: meeting.joinUrl,
          startUrl: meeting.startUrl,
          password: meeting.password,
          organizerEmail: meeting.organizerEmail || organizerUserIdForMeeting || '',
        };
      }
    } catch (error) {
      meetingCreationError = error;
      console.error('[live-session] Meeting creation failed:', error?.message || error);
    }
  }

  if (joinUrl) {
    session.meeting = session.meeting || {};
    session.meeting.joinUrl = joinUrl;
    session.meeting.startUrl = joinUrl;
    if (!session.meeting.organizerEmail && organizerUserIdForMeeting) {
      session.meeting.organizerEmail = organizerUserIdForMeeting;
    }
  }

  if (!session.meeting?.joinUrl) {
    const baseMessage = 'A meeting join link could not be generated. Please provide a meeting URL.';
    const reason = meetingCreationError?.message ? ` Reason: ${meetingCreationError.message}` : '';
    res.status(400);
    throw new Error(`${baseMessage}${reason}`);
  }

  session.status = 'LIVE';
  session.actualStart = new Date();
  session.expectedWatchTimeMs = session.durationMinutes * 60 * 1000;

  ensureParticipants(session, enrollments);

  await session.save();

  await sendLiveClassEmails({ session, enrollments, course });
  session.notifications = session.notifications || {};
  session.notifications.emailSentAt = new Date();
  session.notifications.realtimeSentAt = new Date();
  await session.save();

  const courseId = course?._id?.toString?.() || session.course?.toString?.() || '';
  emitCourseEvent(courseId, 'live-session-started', {
    session: buildSessionResponse(session),
  });

  res.json({ session: buildSessionResponse(session) });
});

const endSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  const session = await LiveSession.findById(sessionId);

  if (!session) {
    res.status(404);
    throw new Error('Session not found.');
  }

  if (!canViewAllSessions(req.admin) && session.teacher.toString() !== req.admin._id.toString()) {
    res.status(403);
    throw new Error('You do not have permission to end this session.');
  }

  if (session.status === 'ENDED') {
    res.status(409);
    throw new Error('This session has already been ended.');
  }

  session.status = 'ENDED';
  session.actualEnd = new Date();

  const effectiveDurationMs = session.expectedWatchTimeMs || session.durationMinutes * 60 * 1000;

  session.participants = Array.isArray(session.participants) ? session.participants : [];

  session.participants.forEach((participant) => {
    if (participant.lastJoinedAt) {
      const now = new Date();
      const watchTime = Math.max(0, now.getTime() - new Date(participant.lastJoinedAt).getTime());
      participant.joinEvents = participant.joinEvents || [];
      participant.joinEvents.push({
        joinedAt: participant.lastJoinedAt,
        leftAt: now,
        watchTimeMs: watchTime,
      });
      participant.accumulatedWatchTimeMs += watchTime;
      participant.lastJoinedAt = null;
      participant.status = 'LEFT';
    }

    if (effectiveDurationMs > 0) {
      participant.attendancePercentage = Math.min(
        100,
        Math.round((participant.accumulatedWatchTimeMs / effectiveDurationMs) * 100)
      );
    }
  });

  await session.save();

  const courseId = session.course?._id?.toString?.() || session.course?.toString?.() || '';
  emitCourseEvent(courseId, 'live-session-ended', {
    session: buildSessionResponse(session),
  });

  res.json({ session: buildSessionResponse(session) });
});

const getSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const session = await LiveSession.findById(sessionId)
    .populate('course', 'name slug')
    .populate('participants.student', 'firstName lastName email mobile');

  if (!session) {
    res.status(404);
    throw new Error('Session not found.');
  }

  if (!canViewAllSessions(req.admin) && session.teacher.toString() !== req.admin._id.toString()) {
    res.status(403);
    throw new Error('You do not have permission to view this session.');
  }

  res.json({ session: buildSessionResponse(session) });
});

module.exports = {
  listCourses,
  getCourseRoster,
  listSessions,
  createSession,
  startSession,
  endSession,
  getSession,
};
