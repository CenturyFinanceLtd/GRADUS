const asyncHandler = require('express-async-handler');
const Course = require('../models/Course');
const CoursePage = require('../models/CoursePage');

const normalizeString = (value) => {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
};

const normalizeStringArray = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => normalizeString(item))
    .filter((item) => item.length > 0);
};

const normalizeWeekInput = (weeks) => {
  if (!Array.isArray(weeks)) {
    return [];
  }

  return weeks
    .map((week) => ({
      title: normalizeString(week?.title),
      points: normalizeStringArray(week?.points),
    }))
    .filter((week) => week.title || week.points.length);
};

const normalizeCertificationInput = (certifications) => {
  if (!Array.isArray(certifications)) {
    return [];
  }

  return certifications
    .map((cert) => ({
      level: normalizeString(cert?.level),
      certificateName: normalizeString(cert?.certificateName),
      coverage: normalizeStringArray(cert?.coverage),
      outcome: normalizeString(cert?.outcome),
    }))
    .filter((cert) => cert.level || cert.certificateName || cert.coverage.length || cert.outcome);
};

const generateSlug = (value) => {
  if (!value) {
    return '';
  }

  return value
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
};

const buildCoursePayload = (body, existingCourse) => {
  const name = normalizeString(body?.name || existingCourse?.name);

  if (!name) {
    const error = new Error('Course name is required');
    error.status = 400;
    throw error;
  }

  let slug = normalizeString(body?.slug);

  if (!slug && body?.name) {
    slug = generateSlug(body.name);
  }

  if (!slug && existingCourse?.slug) {
    slug = existingCourse.slug;
  }

  if (!slug) {
    slug = generateSlug(name) || `course-${Date.now()}`;
  }

  const orderValue = Number(body?.order);
  const order = Number.isFinite(orderValue) ? orderValue : existingCourse?.order ?? Date.now();

  return {
    name,
    slug,
    subtitle: normalizeString(body?.subtitle),
    focus: normalizeString(body?.focus),
    approvals: normalizeStringArray(body?.approvals),
    placementRange: normalizeString(body?.placementRange),
    outcomeSummary: normalizeString(body?.outcomeSummary),
    deliverables: normalizeStringArray(body?.deliverables),
    outcomes: normalizeStringArray(body?.outcomes),
    finalAward: normalizeString(body?.finalAward),
    partners: normalizeStringArray(body?.partners),
    weeks: normalizeWeekInput(body?.weeks),
    certifications: normalizeCertificationInput(body?.certifications),
    order,
  };
};

const ensureArray = (value) => (Array.isArray(value) ? value : []);

const mapCourseForPublic = (course) => ({
  id: course.slug,
  slug: course.slug,
  name: course.name,
  subtitle: course.subtitle,
  focus: course.focus,
  approvals: ensureArray(course.approvals),
  placementRange: course.placementRange,
  outcomeSummary: course.outcomeSummary,
  deliverables: ensureArray(course.deliverables),
  outcomes: ensureArray(course.outcomes),
  finalAward: course.finalAward,
  partners: ensureArray(course.partners),
  weeks: ensureArray(course.weeks).map((week) => ({
    title: week.title,
    points: ensureArray(week.points),
  })),
  certifications: ensureArray(course.certifications).map((cert) => ({
    level: cert.level,
    certificateName: cert.certificateName,
    coverage: ensureArray(cert.coverage),
    outcome: cert.outcome,
  })),
});

const mapCourseForAdmin = (course) => ({
  id: course._id.toString(),
  slug: course.slug,
  name: course.name,
  subtitle: course.subtitle,
  focus: course.focus,
  approvals: ensureArray(course.approvals),
  placementRange: course.placementRange,
  outcomeSummary: course.outcomeSummary,
  deliverables: ensureArray(course.deliverables),
  outcomes: ensureArray(course.outcomes),
  finalAward: course.finalAward,
  partners: ensureArray(course.partners),
  weeks: ensureArray(course.weeks).map((week) => ({
    title: week.title,
    points: ensureArray(week.points),
  })),
  certifications: ensureArray(course.certifications).map((cert) => ({
    level: cert.level,
    certificateName: cert.certificateName,
    coverage: ensureArray(cert.coverage),
    outcome: cert.outcome,
  })),
  order: course.order,
  createdAt: course.createdAt,
  updatedAt: course.updatedAt,
});

const getCoursePage = asyncHandler(async (req, res) => {
  const [page, courses] = await Promise.all([
    CoursePage.findOne().lean(),
    Course.find().sort({ order: 1, createdAt: 1 }).lean(),
  ]);

  res.json({
    hero: page?.hero || null,
    courses: ensureArray(courses).map(mapCourseForPublic),
  });
});

const listCourses = asyncHandler(async (req, res) => {
  const courses = await Course.find()
    .sort({ order: 1, createdAt: 1 })
    .select(['name', 'slug'])
    .lean();

  res.json({
    items: ensureArray(courses).map((course) => ({
      id: course.slug,
      name: course.name,
    })),
  });
});

const getAdminCoursePage = asyncHandler(async (req, res) => {
  const [page, courses] = await Promise.all([
    CoursePage.findOne().lean(),
    Course.find().sort({ order: 1, createdAt: 1 }).lean(),
  ]);

  res.json({
    hero: page?.hero || {
      tagIcon: '',
      tagText: '',
      title: '',
      description: '',
    },
    courses: ensureArray(courses).map(mapCourseForAdmin),
  });
});

const updateHero = asyncHandler(async (req, res) => {
  const hero = {
    tagIcon: normalizeString(req.body?.tagIcon),
    tagText: normalizeString(req.body?.tagText),
    title: normalizeString(req.body?.title),
    description: normalizeString(req.body?.description),
  };

  const page = await CoursePage.findOneAndUpdate(
    {},
    { hero },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  ).lean();

  res.json({ hero: page.hero });
});

const createCourse = asyncHandler(async (req, res) => {
  const payload = buildCoursePayload(req.body);

  const existingWithSlug = await Course.findOne({ slug: payload.slug }).lean();
  if (existingWithSlug) {
    res.status(409);
    throw new Error('A course with this identifier already exists');
  }

  const course = await Course.create(payload);
  res.status(201).json({ course: mapCourseForAdmin(course) });
});

const updateCourse = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const course = await Course.findById(courseId);

  if (!course) {
    res.status(404);
    throw new Error('Course not found');
  }

  const payload = buildCoursePayload(req.body, course);

  if (payload.slug !== course.slug) {
    const existingWithSlug = await Course.findOne({ slug: payload.slug, _id: { $ne: courseId } }).lean();
    if (existingWithSlug) {
      res.status(409);
      throw new Error('Another course already uses this identifier');
    }
  }

  course.set(payload);
  await course.save();

  res.json({ course: mapCourseForAdmin(course) });
});

const deleteCourse = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const course = await Course.findById(courseId);

  if (!course) {
    res.status(404);
    throw new Error('Course not found');
  }

  await course.deleteOne();

  res.json({ message: 'Course deleted' });
});

module.exports = {
  getCoursePage,
  listCourses,
  getAdminCoursePage,
  updateHero,
  createCourse,
  updateCourse,
  deleteCourse,
};
