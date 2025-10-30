/*
  Course controller
  - Admin CRUD for courses/pages and public read endpoints
*/
const asyncHandler = require('express-async-handler');
const crypto = require('crypto');
const Course = require('../models/Course');
const CoursePage = require('../models/CoursePage');
const Enrollment = require('../models/Enrollment');

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

const normalizePartnerInput = (partners) => {
  if (!Array.isArray(partners)) {
    return [];
  }

  return partners
    .map((partner) => {
      if (!partner) {
        return null;
      }

      if (typeof partner === 'string') {
        const name = normalizeString(partner);
        return name ? { name, logo: '', website: '' } : null;
      }

      if (typeof partner === 'object') {
        const name = normalizeString(partner?.name || partner?.title || partner?.label);
        const logo = normalizeString(partner?.logo || partner?.logoUrl || partner?.image);
        const website = normalizeString(partner?.website || partner?.url || partner?.link);

        if (!name && !logo && !website) {
          return null;
        }

        return { name, logo, website };
      }

      return null;
    })
    .filter(Boolean);
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

  const partnersInput = Array.isArray(body?.partners) ? body.partners : existingCourse?.partners;

  return {
    name,
    slug,
    subtitle: normalizeString(body?.subtitle),
    focus: normalizeString(body?.focus),
    approvals: normalizeStringArray(body?.approvals),
    placementRange: normalizeString(body?.placementRange),
    price: normalizeString(body?.price),
    outcomeSummary: normalizeString(body?.outcomeSummary),
    deliverables: normalizeStringArray(body?.deliverables),
    outcomes: normalizeStringArray(body?.outcomes),
    finalAward: normalizeString(body?.finalAward),
    partners: normalizePartnerInput(partnersInput),
    weeks: normalizeWeekInput(body?.weeks),
    certifications: normalizeCertificationInput(body?.certifications),
    order,
  };
};

const ensureArray = (value) => (Array.isArray(value) ? value : []);

const createLockedPoint = (point) => ({
  text: null,
  isLocked: true,
  fingerprint:
    typeof point === 'string'
      ? crypto.createHash('sha256').update(point).digest('hex')
      : crypto.randomBytes(12).toString('hex'),
});

const mapCourseForPublic = (course, enrollment) => {
  const isEnrolled = Boolean(enrollment);

  const partners = normalizePartnerInput(course.partners);

  return {
    id: course.slug,
    slug: course.slug,
    name: course.name,
    subtitle: course.subtitle,
    focus: course.focus,
    approvals: ensureArray(course.approvals),
    placementRange: course.placementRange,
    price: course.price,
    outcomeSummary: course.outcomeSummary,
    deliverables: ensureArray(course.deliverables),
    outcomes: ensureArray(course.outcomes),
    finalAward: course.finalAward,
    partners,
    weeks: ensureArray(course.weeks).map((week) => {
      const points = ensureArray(week.points).map((point) =>
        isEnrolled
          ? { text: point, isLocked: false }
          : createLockedPoint(point)
      );

      return {
        title: week.title,
        points,
        isLocked: !isEnrolled,
      };
    }),
    certifications: ensureArray(course.certifications).map((cert) => ({
      level: cert.level,
      certificateName: cert.certificateName,
      coverage: ensureArray(cert.coverage),
      outcome: cert.outcome,
    })),
    isEnrolled,
    enrollment: enrollment
      ? {
          id: enrollment._id.toString(),
          status: enrollment.status,
          paymentStatus: enrollment.paymentStatus,
          enrolledAt: enrollment.createdAt,
        }
      : null,
  };
};

const mapCourseForAdmin = (course) => ({
  id: course._id.toString(),
  slug: course.slug,
  name: course.name,
  subtitle: course.subtitle,
  focus: course.focus,
  approvals: ensureArray(course.approvals),
  placementRange: course.placementRange,
  price: course.price,
  outcomeSummary: course.outcomeSummary,
  deliverables: ensureArray(course.deliverables),
  outcomes: ensureArray(course.outcomes),
  finalAward: course.finalAward,
  partners: normalizePartnerInput(course.partners),
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
  const [page, courses, enrollments] = await Promise.all([
    CoursePage.findOne().lean(),
    Course.find().sort({ order: 1, createdAt: 1 }).lean(),
    req.user
      ? Enrollment.find({ user: req.user._id, status: 'ACTIVE' }).lean()
      : [],
  ]);

  const enrollmentMap = new Map();
  ensureArray(enrollments).forEach((enrollment) => {
    if (enrollment?.course) {
      enrollmentMap.set(enrollment.course.toString(), enrollment);
    }
  });

  res.json({
    hero: page?.hero || null,
    courses: ensureArray(courses).map((course) =>
      mapCourseForPublic(course, enrollmentMap.get(course._id.toString()))
    ),
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

const enrollInCourse = asyncHandler(async (req, res) => {
  const { courseSlug } = req.params;
  const normalizedSlug = typeof courseSlug === 'string' ? courseSlug.trim().toLowerCase() : '';

  if (!normalizedSlug) {
    res.status(400);
    throw new Error('A valid course identifier is required.');
  }

  const course = await Course.findOne({ slug: normalizedSlug });

  if (!course) {
    res.status(404);
    throw new Error('Course not found.');
  }

  const existingEnrollment = await Enrollment.findOne({
    user: req.user._id,
    course: course._id,
  });

  if (existingEnrollment) {
    if (existingEnrollment.status === 'ACTIVE' && existingEnrollment.paymentStatus === 'PAID') {
      res.status(409);
      throw new Error('You are already enrolled in this course.');
    }

    existingEnrollment.status = 'ACTIVE';
    existingEnrollment.paymentStatus = 'PAID';
    existingEnrollment.paidAt = new Date();
    existingEnrollment.paymentReference = existingEnrollment.paymentReference || `DUMMY-${Date.now()}`;
    await existingEnrollment.save();

    res.json({
      message: 'Enrollment updated successfully.',
      enrollment: {
        id: existingEnrollment._id.toString(),
        course: {
          id: course._id.toString(),
          slug: course.slug,
          name: course.name,
        },
        status: existingEnrollment.status,
        paymentStatus: existingEnrollment.paymentStatus,
        enrolledAt: existingEnrollment.createdAt,
      },
    });
    return;
  }

  const enrollment = await Enrollment.create({
    user: req.user._id,
    course: course._id,
    status: 'ACTIVE',
    paymentStatus: 'PAID',
    paymentReference: `DUMMY-${Date.now()}`,
    paidAt: new Date(),
  });

  res.status(201).json({
    message: 'Enrollment completed successfully.',
    enrollment: {
      id: enrollment._id.toString(),
      course: {
        id: course._id.toString(),
        slug: course.slug,
        name: course.name,
      },
      status: enrollment.status,
      paymentStatus: enrollment.paymentStatus,
      enrolledAt: enrollment.createdAt,
    },
  });
});

const listEnrollments = asyncHandler(async (req, res) => {
  const enrollments = await Enrollment.find()
    .sort({ createdAt: -1 })
    .populate('user', 'firstName lastName email mobile')
    .populate('course', 'name slug price')
    .lean();

  res.json({
    items: ensureArray(enrollments).map((enrollment) => ({
      id: enrollment._id.toString(),
      status: enrollment.status,
      paymentStatus: enrollment.paymentStatus,
      enrolledAt: enrollment.createdAt,
      paymentReference: enrollment.paymentReference || null,
      paidAt: enrollment.paidAt || null,
      course: enrollment.course
        ? {
            id: enrollment.course._id?.toString?.() || '',
            slug: enrollment.course.slug || '',
            name: enrollment.course.name || '',
            price: enrollment.course.price || '',
          }
        : null,
      student: enrollment.user
        ? {
            id: enrollment.user._id?.toString?.() || '',
            firstName: enrollment.user.firstName || '',
            lastName: enrollment.user.lastName || '',
            email: enrollment.user.email || '',
            mobile: enrollment.user.mobile || '',
          }
        : null,
    })),
  });
});

const getCourseBySlug = asyncHandler(async (req, res) => {
  const { courseSlug } = req.params;
  const normalizedSlug = typeof courseSlug === 'string' ? courseSlug.trim().toLowerCase() : '';

  if (!normalizedSlug) {
    res.status(400);
    throw new Error('A valid course identifier is required.');
  }

  const course = await Course.findOne({ slug: normalizedSlug }).lean();

  if (!course) {
    res.status(404);
    throw new Error('Course not found.');
  }

  let isEnrolled = false;

  if (req.user?._id) {
    const enrollment = await Enrollment.findOne({
      user: req.user._id,
      course: course._id,
      status: 'ACTIVE',
    });

    isEnrolled = Boolean(enrollment);
  }

  res.json({
    course: {
      ...course,
      id: course._id?.toString?.() || course._id,
      isEnrolled,
    },
  });
});

module.exports = {
  getCoursePage,
  listCourses,
  getAdminCoursePage,
  updateHero,
  createCourse,
  updateCourse,
  deleteCourse,
  enrollInCourse,
  listEnrollments,
  getCourseBySlug,
};
