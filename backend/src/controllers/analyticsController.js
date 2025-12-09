/*
  Analytics controller
  - Records site visits/events and exposes reporting endpoints
*/
const asyncHandler = require('express-async-handler');
const crypto = require('crypto');
const Blog = require('../models/Blog');
const SiteVisit = require('../models/SiteVisit');

const geoip = require('geoip-lite');

const ANALYTICS_SALT = process.env.ANALYTICS_SALT || 'gradus_analytics_salt';

const normalizePath = (input) => {
  if (typeof input !== 'string') {
    return '/';
  }

  const trimmed = input.trim();

  if (!trimmed) {
    return '/';
  }

  const withoutHash = trimmed.split('#')[0];
  const candidate = withoutHash || '/';
  if (!candidate.startsWith('/')) {
    return '/' + candidate;
  }

  return candidate.length > 300 ? candidate.slice(0, 300) : candidate;
};

const sanitizeString = (value, maxLength) => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;
};

const hashIpAddress = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  const ipAddress = forwarded ? forwarded.split(',')[0].trim() : req.ip;

  if (!ipAddress) {
    return null;
  }

  return crypto.createHash('sha256').update(ipAddress + ANALYTICS_SALT).digest('hex');
};

// Helper to get raw IP for geo lookup (not hashed)
const getRawIpAddress = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  return forwarded ? forwarded.split(',')[0].trim() : req.ip;
};

const ensureVisitTracker = (req) => {
  if (!req.session) {
    return null;
  }

  if (!req.session.siteVisitTracker) {
    req.session.siteVisitTracker = {};
  }

  return req.session.siteVisitTracker;
};

const recordSiteVisit = asyncHandler(async (req, res) => {
  const path = normalizePath(req.body?.path);
  const pageTitle = sanitizeString(req.body?.pageTitle, 300);
  const referrer = sanitizeString(req.body?.referrer || req.get('Referer') || req.get('Referrer'), 500);
  const userAgent = sanitizeString(req.get('User-Agent'), 500);
  const tracker = ensureVisitTracker(req);
  const now = new Date();

  if (tracker) {
    const previous = tracker[path];
    if (previous) {
      const lastVisit = new Date(previous);
      const secondsSinceLast = (now.getTime() - lastVisit.getTime()) / 1000;
      if (secondsSinceLast < 30) {
        res.status(200).json({ recorded: false, throttled: true });
        return;
      }
    }
    tracker[path] = now.toISOString();
  }

  const ip = getRawIpAddress(req);
  const geo = geoip.lookup(ip);

  const siteVisit = new SiteVisit({
    path,
    pageTitle,
    referrer,
    userAgent,
    ipHash: hashIpAddress(req),
    sessionId: req.sessionID || null,
    visitedAt: now,
    country: geo ? geo.country : null,
    region: geo ? geo.region : null,
    city: geo ? geo.city : null,
  });

  await siteVisit.save();

  res.status(201).json({ recorded: true });
});

const fetchBlogEngagementStats = asyncHandler(async (req, res) => {
  const limit = req.query.limit ? Math.max(1, Math.min(parseInt(req.query.limit, 10) || 10, 50)) : 10;

  const blogs = await Blog.find()
    .sort({ publishedAt: -1, createdAt: -1 })
    .limit(limit)
    .select('title slug category author meta publishedAt updatedAt createdAt')
    .lean();

  res.json({
    items: blogs.map((blog) => ({
      id: blog._id.toString(),
      title: blog.title || 'Untitled blog',
      slug: blog.slug,
      category: blog.category,
      author: blog.author,
      views: blog.meta?.views || 0,
      comments: blog.meta?.comments || 0,
      publishedAt: blog.publishedAt,
      updatedAt: blog.updatedAt || blog.createdAt,
    })),
  });
});

const resolveRangeInDays = (value) => {
  if (!value) {
    return 30;
  }

  const normalized = String(value).toLowerCase();
  if (normalized.endsWith('d')) {
    const days = parseInt(normalized.slice(0, -1), 10);
    if (!Number.isNaN(days) && days >= 1 && days <= 365) {
      return days;
    }
  }

  return 30;
};

const buildRangeMatch = (days) => {
  const now = new Date();
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  return { visitedAt: { $gte: start, $lte: now } };
};

const fetchPageViewStats = asyncHandler(async (req, res) => {
  const limit = req.query.limit ? Math.max(1, Math.min(parseInt(req.query.limit, 10) || 8, 30)) : 8;
  const days = resolveRangeInDays(req.query.range);
  const match = buildRangeMatch(days);

  const pipeline = [
    { $match: match },
    { $sort: { visitedAt: -1 } },
    {
      $group: {
        _id: '$path',
        totalVisits: { $sum: 1 },
        uniqueVisitors: { $addToSet: '$ipHash' },
        lastVisit: { $first: '$visitedAt' },
        pageTitle: { $first: '$pageTitle' },
      },
    },
    {
      $project: {
        _id: 0,
        path: '$_id',
        pageTitle: 1,
        totalVisits: 1,
        uniqueVisitors: {
          $size: {
            $filter: {
              input: '$uniqueVisitors',
              as: 'visitor',
              cond: { $and: [{ $ne: ['$$visitor', null] }, { $ne: ['$$visitor', ''] }] },
            },
          },
        },
        lastVisit: 1,
      },
    },
    { $sort: { totalVisits: -1 } },
    { $limit: limit },
  ];

  const pages = await SiteVisit.aggregate(pipeline);

  const [summary] = await SiteVisit.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalVisits: { $sum: 1 },
        uniqueVisitors: {
          $addToSet: '$ipHash',
        },
      },
    },
    {
      $project: {
        _id: 0,
        totalVisits: 1,
        uniqueVisitors: {
          $size: {
            $filter: {
              input: '$uniqueVisitors',
              as: 'visitor',
              cond: { $and: [{ $ne: ['$$visitor', null] }, { $ne: ['$$visitor', ''] }] },
            },
          },
        },
      },
    },
  ]);

  res.json({
    range: days,
    summary: summary || { totalVisits: 0, uniqueVisitors: 0 },
    pages,
  });
});

const startOfDayUtc = (date) => {
  const result = new Date(date);
  result.setUTCHours(0, 0, 0, 0);
  return result;
};

const fetchVisitorSummary = asyncHandler(async (req, res) => {
  const now = new Date();
  const startToday = startOfDayUtc(now);
  const startWeek = new Date(startToday);
  startWeek.setDate(startWeek.getDate() - 6);
  const startMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const [totalVisits, uniqueVisitorsAll, todayVisits, weekVisits, monthVisits] = await Promise.all([
    SiteVisit.countDocuments(),
    SiteVisit.distinct('ipHash'),
    SiteVisit.countDocuments({ visitedAt: { $gte: startToday } }),
    SiteVisit.countDocuments({ visitedAt: { $gte: startWeek } }),
    SiteVisit.countDocuments({ visitedAt: { $gte: startMonth } }),
  ]);

  const uniqueVisitors = uniqueVisitorsAll.filter((value) => value && value.trim()).length;

  res.json({
    totalVisits,
    uniqueVisitors,
    todayVisits,
    weekVisits,
    monthVisits,
  });
});

const resolveMonths = (value) => {
  if (!value) {
    return 12;
  }

  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return 12;
  }

  return Math.max(1, Math.min(parsed, 24));
};

const fetchMonthlyVisitors = asyncHandler(async (req, res) => {
  const months = resolveMonths(req.query.months);
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1));

  const pipeline = [
    { $match: { visitedAt: { $gte: start, $lte: now } } },
    {
      $group: {
        _id: { year: { $year: '$visitedAt' }, month: { $month: '$visitedAt' } },
        totalVisits: { $sum: 1 },
        uniqueVisitors: { $addToSet: '$ipHash' },
      },
    },
    {
      $project: {
        _id: 0,
        year: '$_id.year',
        month: '$_id.month',
        totalVisits: 1,
        uniqueVisitors: {
          $size: {
            $filter: {
              input: '$uniqueVisitors',
              as: 'visitor',
              cond: { $and: [{ $ne: ['$$visitor', null] }, { $ne: ['$$visitor', ''] }] },
            },
          },
        },
      },
    },
    { $sort: { year: 1, month: 1 } },
  ];

  const aggregates = await SiteVisit.aggregate(pipeline);

  const buckets = [];
  for (let i = months - 1; i >= 0; i -= 1) {
    const cursor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const year = cursor.getUTCFullYear();
    const month = cursor.getUTCMonth() + 1;
    const match = aggregates.find((item) => item.year === year && item.month === month);
    buckets.push({
      year,
      month,
      totalVisits: match ? match.totalVisits : 0,
      uniqueVisitors: match ? match.uniqueVisitors : 0,
    });
  }
  res.json({
    start,
    end: now,
    months: buckets,
  });
});

const fetchVisitorLocationStats = asyncHandler(async (req, res) => {
  // Default to current month/year if no range provided
  // This aggregates visits by Region (State) filtering for India if possible, or generally globally
  // For now, let's aggregate all available data or a specific range
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - 30); // Last 30 days default

  const pipeline = [
    { $match: { visitedAt: { $gte: start } } },
    {
      $group: {
        _id: '$region', // Group by Region (State)
        count: { $sum: 1 },
        country: { $first: '$country' }
      }
    },
    { $sort: { count: -1 } },
    { $limit: 20 } // Top 20 regions
  ];

  const results = await SiteVisit.aggregate(pipeline);

  // Filter for India (IN) only if we want to be strict, but for now sending all top regions
  // Optionally client can filter.
  // Ideally we should group by { country, region } but simplifying for the specific "Indian States" request

  // Format for frontend
  const locations = results
    .filter(r => r._id) // Remove null regions
    .map(r => ({
      state: r._id,
      value: r.count,
      country: r.country
    }));

  res.json({ locations });
});

module.exports = {
  recordSiteVisit,
  fetchBlogEngagementStats,
  fetchPageViewStats,
  fetchVisitorSummary,
  fetchMonthlyVisitors,
  fetchVisitorLocationStats,
};
