/*
  Admin website user controller
  - Admin-side listing and moderation for public website users
*/
const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const User = require('../models/User');
const Enrollment = require('../models/Enrollment');
const UserAuthLog = require('../models/UserAuthLog');

const escapeRegExp = (value) => value.replace(/[\-\\^$*+?.()|[\]{}]/g, '\\$&');

const buildUserFilters = ({ search }) => {
  const filters = {};

  if (search && search.trim()) {
    const safeSearch = escapeRegExp(search.trim());
    const regex = new RegExp(safeSearch, 'i');
    filters.$or = [
      { firstName: regex },
      { lastName: regex },
      { email: regex },
      { mobile: regex },
      { 'personalDetails.studentName': regex },
    ];
  }

  return filters;
};

const formatEnrollment = (enrollment) => ({
  id: enrollment._id.toString(),
  courseId: enrollment.course?._id ? enrollment.course._id.toString() : null,
  courseName: enrollment.course?.name || 'Unnamed Course',
  courseSlug: enrollment.course?.slug || null,
  status: enrollment.status || 'ACTIVE',
  paymentStatus: enrollment.paymentStatus || 'PAID',
  enrolledAt: enrollment.createdAt,
  paidAt: enrollment.paidAt || null,
});

const normalizeDetails = (details) => {
  if (!details) {
    return null;
  }

  const normalized = { ...details };
  Object.keys(normalized).forEach((key) => {
    if (normalized[key] === undefined) {
      normalized[key] = '';
    }
  });
  return normalized;
};

const formatLoginStats = (stat) => {
  if (!stat) {
    return {
      totalLogins: 0,
      totalLogouts: 0,
      lastLoginAt: null,
      lastLogoutAt: null,
      recentEvents: [],
    };
  }

  const events = Array.isArray(stat.events)
    ? stat.events.map((event) => ({
        type: event.type,
        occurredAt: event.occurredAt,
        userAgent: event.userAgent || '',
        ipAddress: event.ipAddress || '',
      }))
    : [];

  const lastLogin = events.find((event) => event.type === 'LOGIN');
  const lastLogout = events.find((event) => event.type === 'LOGOUT');

  return {
    totalLogins: stat.totalLogins || 0,
    totalLogouts: stat.totalLogouts || 0,
    lastLoginAt: lastLogin ? lastLogin.occurredAt : null,
    lastLogoutAt: lastLogout ? lastLogout.occurredAt : null,
    recentEvents: events,
  };
};

const listWebsiteUsers = asyncHandler(async (req, res) => {
  const filters = buildUserFilters(req.query || {});

  const users = await User.find(filters).sort({ createdAt: -1 }).lean();

  if (users.length === 0) {
    res.status(200).json({ users: [] });
    return;
  }

  const userIds = users.map((user) =>
    typeof user._id === 'string' ? new mongoose.Types.ObjectId(user._id) : user._id
  );

  const [enrollments, authStats] = await Promise.all([
    Enrollment.find({ user: { $in: userIds } })
      .populate('course', 'name slug')
      .lean(),
    UserAuthLog.aggregate([
      { $match: { user: { $in: userIds } } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$user',
          totalLogins: {
            $sum: {
              $cond: [{ $eq: ['$type', 'LOGIN'] }, 1, 0],
            },
          },
          totalLogouts: {
            $sum: {
              $cond: [{ $eq: ['$type', 'LOGOUT'] }, 1, 0],
            },
          },
          events: {
            $push: {
              type: '$type',
              occurredAt: '$createdAt',
              userAgent: '$userAgent',
              ipAddress: '$ipAddress',
            },
          },
        },
      },
      {
        $project: {
          totalLogins: 1,
          totalLogouts: 1,
          events: { $slice: ['$events', 0, 20] },
        },
      },
    ]),
  ]);

  const enrollmentMap = new Map();
  enrollments.forEach((enrollment) => {
    const key = enrollment.user.toString();
    if (!enrollmentMap.has(key)) {
      enrollmentMap.set(key, []);
    }
    enrollmentMap.get(key).push(formatEnrollment(enrollment));
  });

  const authStatsMap = new Map();
  authStats.forEach((stat) => {
    authStatsMap.set(stat._id.toString(), formatLoginStats(stat));
  });

  const formattedUsers = users.map((user) => {
    const key = user._id.toString();
    return {
      id: key,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      mobile: user.mobile,
      personalDetails: normalizeDetails(user.personalDetails),
      educationDetails: normalizeDetails(user.educationDetails),
      emailVerified: Boolean(user.emailVerified),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      loginStats: authStatsMap.get(key) || formatLoginStats(null),
      enrollments: enrollmentMap.get(key) || [],
    };
  });

  res.status(200).json({ users: formattedUsers });
});

module.exports = {
  listWebsiteUsers,
};
