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
      hours: normalizeString(week?.hours),
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

// Build a canonical slug from programme + course segments
const buildCombinedSlug = ({ programmeSlug, courseSlug, slug, name, programme }) => {
  const clean = (s) => (s ? String(s).trim().toLowerCase() : '');
  if (slug) return clean(slug);
  const prog = clean(programmeSlug || (programme ? generateSlug(programme) : ''));
  const coursePart = clean(courseSlug || (name ? generateSlug(name) : ''));
  if (prog && coursePart) return `${prog}/${coursePart}`;
  return coursePart || prog || '';
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

  // Programme category normalization (Gradus X, Gradus Finlit, Gradus Lead)
  const programmeInput = normalizeString(body?.programme || existingCourse?.programme);
  const allowedProgrammes = ['Gradus X', 'Gradus Finlit', 'Gradus Lead'];
  const programme = allowedProgrammes.includes(programmeInput)
    ? programmeInput
    : existingCourse?.programme || 'Gradus X';

  const partnersInput = Array.isArray(body?.partners) ? body.partners : existingCourse?.partners;

  // Optional image fields (support both flat and nested input)
  const imageUrl = normalizeString(body?.imageUrl || body?.image?.url);
  const imageAlt = normalizeString(body?.imageAlt || body?.image?.alt);
  const imagePublicId = normalizeString(body?.imagePublicId || body?.image?.publicId);
  const nextImage = {
    url: imageUrl || (existingCourse?.image?.url || ''),
    alt: imageAlt || (existingCourse?.image?.alt || ''),
    publicId: imagePublicId || (existingCourse?.image?.publicId || ''),
  };

  return {
    name,
    slug,
    subtitle: normalizeString(body?.subtitle),
    focus: normalizeString(body?.focus),
    level: normalizeString(body?.level),
    duration: normalizeString(body?.duration),
    mode: normalizeString(body?.mode),
    approvals: normalizeStringArray(body?.approvals),
    placementRange: normalizeString(body?.placementRange),
    price: normalizeString(body?.price),
    outcomeSummary: normalizeString(body?.outcomeSummary),
    skills: normalizeStringArray(body?.skills),
    details: {
      effort: normalizeString(body?.details?.effort || body?.effort),
      language: normalizeString(body?.details?.language || body?.language),
      prerequisites: normalizeString(body?.details?.prerequisites || body?.prerequisites),
    },
    deliverables: normalizeStringArray(body?.deliverables),
    outcomes: normalizeStringArray(body?.outcomes),
    capstonePoints: normalizeStringArray(body?.capstonePoints),
    careerOutcomes: normalizeStringArray(body?.careerOutcomes),
    toolsFrameworks: normalizeStringArray(body?.toolsFrameworks),
    finalAward: normalizeString(body?.finalAward),
    programme,
    partners: normalizePartnerInput(partnersInput),
    weeks: normalizeWeekInput(body?.weeks),
    certifications: normalizeCertificationInput(body?.certifications),
    image: nextImage,
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
    imageUrl: (course?.image && course.image.url) || '',
  programme: course.programme,
  level: course.level,
  duration: course.duration,
  mode: course.mode,
    subtitle: course.subtitle,
    programme: course.programme,
    level: course.level,
    duration: course.duration,
    mode: course.mode,
    focus: course.focus,
    approvals: ensureArray(course.approvals),
    placementRange: course.placementRange,
    price: course.price,
    outcomeSummary: course.outcomeSummary,
  skills: ensureArray(course.skills),
  details: {
    effort: course.details?.effort || '',
    language: course.details?.language || '',
    prerequisites: course.details?.prerequisites || '',
  },
  capstonePoints: ensureArray(course.capstonePoints),
  careerOutcomes: ensureArray(course.careerOutcomes),
  toolsFrameworks: ensureArray(course.toolsFrameworks),
    skills: ensureArray(course.skills),
    details: {
      effort: course.details?.effort || '',
      language: course.details?.language || '',
      prerequisites: course.details?.prerequisites || '',
    },
    capstonePoints: ensureArray(course.capstonePoints),
    careerOutcomes: ensureArray(course.careerOutcomes),
    toolsFrameworks: ensureArray(course.toolsFrameworks),
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
  imageUrl: (course?.image && course.image.url) || '',
  imageAlt: (course?.image && course.image.alt) || '',
  imagePublicId: (course?.image && course.image.publicId) || '',
  programme: course.programme,
  level: course.level,
  duration: course.duration,
  mode: course.mode,
  subtitle: course.subtitle,
    programme: course.programme,
    level: course.level,
    duration: course.duration,
    mode: course.mode,
  focus: course.focus,
  approvals: ensureArray(course.approvals),
  placementRange: course.placementRange,
  price: course.price,
  outcomeSummary: course.outcomeSummary,
  skills: ensureArray(course.skills),
  details: {
    effort: course.details?.effort || '',
    language: course.details?.language || '',
    prerequisites: course.details?.prerequisites || '',
  },
  capstonePoints: ensureArray(course.capstonePoints),
  careerOutcomes: ensureArray(course.careerOutcomes),
  toolsFrameworks: ensureArray(course.toolsFrameworks),
    skills: ensureArray(course.skills),
    details: {
      effort: course.details?.effort || '',
      language: course.details?.language || '',
      prerequisites: course.details?.prerequisites || '',
    },
    capstonePoints: ensureArray(course.capstonePoints),
    careerOutcomes: ensureArray(course.careerOutcomes),
    toolsFrameworks: ensureArray(course.toolsFrameworks),
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
      ? Enrollment.find({ user: req.user._id, status: 'ACTIVE', paymentStatus: 'PAID' }).lean()
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
  const sort = typeof req.query?.sort === 'string' ? req.query.sort.trim().toLowerCase() : '';
  const sortSpec = sort === 'new' ? { updatedAt: -1 } : { order: 1, createdAt: 1 };
  const courses = await Course.find()
    .sort(sortSpec)
    .select(['name', 'slug', 'programme', 'updatedAt', 'createdAt', 'hero', 'stats', 'mode', 'level', 'duration', 'weeks', 'modules', 'price', 'image'])
    .lean();

  const parsePrice = (rawPrice) => {
    if (rawPrice == null) return 0;
    if (typeof rawPrice === 'number') return Number.isFinite(rawPrice) ? rawPrice : 0;
    const n = Number(String(rawPrice).replace(/[^0-9]/g, ''));
    return Number.isFinite(n) ? n : 0;
  };

  res.json({
    items: ensureArray(courses).map((course) => {
      const priceINR = parsePrice(course?.hero?.priceINR ?? course?.price);
      const modulesCount = (course?.stats?.modules && Number(course.stats.modules)) ||
        (Array.isArray(course?.modules) ? course.modules.length : 0) ||
        (Array.isArray(course?.weeks) ? course.weeks.length : 0) || 0;
      return {
        id: course.slug,
        slug: course.slug,
        name: course.name,
        imageUrl: (course?.image && course.image.url) || '',
        programme: course.programme || '',
        createdAt: course.createdAt,
        updatedAt: course.updatedAt,
        priceINR,
        mode: course?.stats?.mode || course?.mode || '',
        level: course?.stats?.level || course?.level || '',
        duration: course?.stats?.duration || course?.duration || '',
        modulesCount,
      };
    }),
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
  const { programmeSlug, courseSlug } = req.params;
  let normalizedSlug = '';
  if (programmeSlug && courseSlug) {
    normalizedSlug = `${String(programmeSlug).trim().toLowerCase()}/${String(courseSlug).trim().toLowerCase()}`;
  } else {
    normalizedSlug = typeof courseSlug === 'string' ? courseSlug.trim().toLowerCase() : '';
  }

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
      paymentStatus: 'PAID',
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

/**
 * RAW course CRUD for full JSON shape (admin)
 * - Upsert by slug (supports programmeSlug/courseSlug combination)
 * - List and get raw documents
 * - Delete by slug
 */

// Strictly validate the only accepted shape for raw courses
const validateRawCourse = (input) => {
  const allowRoot = new Set([
    'name','programme','programmeSlug','courseSlug','slug',
    'hero','stats','aboutProgram','learn','skills','details','capstone',
    'careerOutcomes','toolsFrameworks','modules','instructors','offeredBy',
    'image'
  ]);

  const unexpected = Object.keys(input || {}).filter((k) => !allowRoot.has(k));
  if (unexpected.length) {
    const err = new Error(`Unexpected fields at root: ${unexpected.join(', ')}`);
    err.status = 400; throw err;
  }

  const str = (v) => (typeof v === 'string' ? v.trim() : '');
  const strArr = (v, path) => {
    if (!Array.isArray(v)) { const e = new Error(`${path} must be an array of strings`); e.status=400; throw e; }
    const out = [];
    for (let i=0;i<v.length;i++) { if (typeof v[i] !== 'string') { const e = new Error(`${path}[${i}] must be a string`); e.status=400; throw e; } const s = v[i].trim(); if (s) out.push(s); }
    return out;
  };
  const obj = (v, path) => { if (v && typeof v === 'object' && !Array.isArray(v)) return v; const e = new Error(`${path} must be an object`); e.status=400; throw e; };
  const requireKeysOnly = (o, allowed, path) => { const bad = Object.keys(o).filter((k) => !allowed.has(k)); if (bad.length) { const e = new Error(`Unexpected fields in ${path}: ${bad.join(', ')}`); e.status=400; throw e; } };
  const normalizeLectureItems = (value, path) => {
    if (value === undefined) {
      return [];
    }
    if (!Array.isArray(value)) {
      const e = new Error(`${path} must be an array`);
      e.status = 400;
      throw e;
    }
    const lectureAllowed = new Set(['title', 'duration', 'type']);
    return value
      .map((item, idx) => {
        if (typeof item === 'string') {
          const title = str(item);
          return title ? { title, duration: '', type: '' } : null;
        }
        const lecture = obj(item, `${path}[${idx}]`);
        requireKeysOnly(lecture, lectureAllowed, `${path}[${idx}]`);
        const title = str(lecture.title);
        const duration = str(lecture.duration);
        const type = str(lecture.type);
        if (!title) {
          const e = new Error(`${path}[${idx}].title is required`);
          e.status = 400;
          throw e;
        }
        return { title, duration, type };
      })
      .filter(Boolean);
  };
  const normalizeWeeklyStructureInput = (value, path) => {
    if (value === undefined) {
      return [];
    }
    const blocks = Array.isArray(value) ? value : [value];
    const weekAllowed = new Set(['title', 'subtitle', 'summary', 'lectures', 'assignments', 'projects', 'quizzes', 'notes']);
    return blocks
      .map((entry, idx) => {
        if (entry == null || entry === '') {
          return null;
        }
        if (typeof entry === 'string') {
          const title = str(entry);
          return title
            ? {
                title,
                subtitle: '',
                summary: '',
                lectures: [],
                assignments: [],
                projects: [],
                quizzes: [],
                notes: [],
              }
            : null;
        }
        const block = obj(entry, `${path}[${idx}]`);
        requireKeysOnly(block, weekAllowed, `${path}[${idx}]`);
        const title = str(block.title);
        const subtitle = str(block.subtitle);
        const summary = str(block.summary);
        const lectures = normalizeLectureItems(block.lectures, `${path}[${idx}].lectures`);
        const assignments = strArr(block.assignments || [], `${path}[${idx}].assignments`);
        const projects = strArr(block.projects || [], `${path}[${idx}].projects`);
        const quizzes = strArr(block.quizzes || [], `${path}[${idx}].quizzes`);
        const notes = strArr(block.notes || [], `${path}[${idx}].notes`);
        if (!title && !subtitle && !summary && !lectures.length && !assignments.length && !projects.length && !quizzes.length && !notes.length) {
          return null;
        }
        return { title, subtitle, summary, lectures, assignments, projects, quizzes, notes };
      })
      .filter(Boolean);
  };

  const out = {};
  out.name = str(input.name); if (!out.name) { const e = new Error('name is required'); e.status=400; throw e; }
  out.programme = str(input.programme);
  out.programmeSlug = str(input.programmeSlug);
  out.courseSlug = str(input.courseSlug);
  out.slug = str(input.slug);
  if (!out.slug) {
    const built = buildCombinedSlug({ programmeSlug: out.programmeSlug, courseSlug: out.courseSlug, name: out.name, programme: out.programme });
    if (!built) { const e = new Error('slug or (programmeSlug & courseSlug) required'); e.status=400; throw e; }
    out.slug = built;
  }

  // hero
  const heroAllowed = new Set(['subtitle','priceINR','enrolledText']);
  const hero = obj(input.hero || {}, 'hero');
  requireKeysOnly(hero, heroAllowed, 'hero');
  out.hero = { subtitle: str(hero.subtitle), priceINR: hero.priceINR === undefined ? 0 : Number(hero.priceINR), enrolledText: str(hero.enrolledText) };
  if (!Number.isFinite(out.hero.priceINR)) { const e = new Error('hero.priceINR must be a number'); e.status=400; throw e; }

  // stats
  const statsAllowed = new Set(['modules','mode','level','duration']);
  const stats = obj(input.stats || {}, 'stats');
  requireKeysOnly(stats, statsAllowed, 'stats');
  out.stats = { modules: stats.modules === undefined ? 0 : Number(stats.modules), mode: str(stats.mode), level: str(stats.level), duration: str(stats.duration) };
  if (!Number.isFinite(out.stats.modules)) { const e = new Error('stats.modules must be a number'); e.status=400; throw e; }

  // text arrays
  out.aboutProgram = strArr(input.aboutProgram || [], 'aboutProgram');
  out.learn = strArr(input.learn || [], 'learn');
  out.skills = strArr(input.skills || [], 'skills');
  out.careerOutcomes = strArr(input.careerOutcomes || [], 'careerOutcomes');
  out.toolsFrameworks = strArr(input.toolsFrameworks || [], 'toolsFrameworks');

  // details
  const detailsAllowed = new Set(['effort','language','prerequisites']);
  const details = obj(input.details || {}, 'details');
  requireKeysOnly(details, detailsAllowed, 'details');
  out.details = { effort: str(details.effort), language: str(details.language), prerequisites: str(details.prerequisites) };

  // capstone
  const capAllowed = new Set(['summary','bullets']);
  const cap = obj(input.capstone || {}, 'capstone');
  requireKeysOnly(cap, capAllowed, 'capstone');
  out.capstone = { summary: str(cap.summary), bullets: strArr(cap.bullets || [], 'capstone.bullets') };

  // modules
  if (!Array.isArray(input.modules)) { const e = new Error('modules must be an array'); e.status=400; throw e; }
  out.modules = input.modules.map((m, i) => {
    const mod = obj(m, `modules[${i}]`);
    const modAllowed = new Set(['title','weeksLabel','topics','outcome','extras','weeklyStructure','structure','outcomes','resources']);
    requireKeysOnly(mod, modAllowed, `modules[${i}]`);
    const extras = mod.extras === undefined ? undefined : obj(mod.extras, `modules[${i}].extras`);
    let extrasOut;
    if (extras) {
      const exAllowed = new Set(['projectTitle','projectDescription','examples','deliverables']);
      requireKeysOnly(extras, exAllowed, `modules[${i}].extras`);
      extrasOut = {
        projectTitle: str(extras.projectTitle),
        projectDescription: str(extras.projectDescription),
        examples: strArr(extras.examples || [], `modules[${i}].extras.examples`),
        deliverables: strArr(extras.deliverables || [], `modules[${i}].extras.deliverables`),
      };
    }
    const weeklyStructureRaw = mod.weeklyStructure !== undefined ? mod.weeklyStructure : mod.structure;
    const weeklyStructure = normalizeWeeklyStructureInput(weeklyStructureRaw, `modules[${i}].weeklyStructure`);
    const outcomesArr = strArr(mod.outcomes || [], `modules[${i}].outcomes`);
    const resourcesArr = strArr(mod.resources || [], `modules[${i}].resources`);
    return {
      title: str(mod.title),
      weeksLabel: str(mod.weeksLabel),
      topics: strArr(mod.topics || [], `modules[${i}].topics`),
      outcome: str(mod.outcome),
      weeklyStructure,
      outcomes: outcomesArr,
      resources: resourcesArr,
      ...(extrasOut ? { extras: extrasOut } : {}),
    };
  });

  // instructors
  if (!Array.isArray(input.instructors)) { const e = new Error('instructors must be an array'); e.status=400; throw e; }
  out.instructors = input.instructors.map((ins, i) => {
    const o = obj(ins, `instructors[${i}]`);
    const allowed = new Set(['name','subtitle']);
    requireKeysOnly(o, allowed, `instructors[${i}]`);
    return { name: str(o.name), subtitle: str(o.subtitle) };
  });

  // offeredBy
  const obAllowed = new Set(['name','subtitle','logo']);
  const offered = obj(input.offeredBy || {}, 'offeredBy');
  requireKeysOnly(offered, obAllowed, 'offeredBy');
  out.offeredBy = { name: str(offered.name), subtitle: str(offered.subtitle), logo: str(offered.logo) };

  // optional image
  if (typeof input.image !== 'undefined') {
    const imgAllowed = new Set(['url','alt','publicId']);
    const img = obj(input.image || {}, 'image');
    requireKeysOnly(img, imgAllowed, 'image');
    out.image = { url: str(img.url), alt: str(img.alt), publicId: str(img.publicId) };
  }

  return out;
};

const upsertRawCourse = asyncHandler(async (req, res) => {
  const validated = validateRawCourse(req.body || {});
  validated.slug = String(validated.slug).trim().toLowerCase();

  const legacyToUnset = [
    'subtitle','focus','approvals','placementRange','price','level','duration','mode',
    'outcomeSummary','deliverables','outcomes','capstonePoints','finalAward','partners','weeks','certifications','order'
  ];
  const unsetObj = legacyToUnset.reduce((acc, k) => { acc[k] = ''; return acc; }, {});

  const saved = await Course.findOneAndUpdate(
    { slug: validated.slug },
    { $set: validated, $unset: unsetObj },
    { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
  ).lean();

  res.status(200).json({ message: 'Course upserted', course: saved });
});

const listRawCourses = asyncHandler(async (req, res) => {
  const courses = await Course.find().sort({ updatedAt: -1 }).lean();
  res.json({ items: courses });
});

const getRawCourseBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const s = typeof slug === 'string' ? slug.trim().toLowerCase() : '';
  if (!s) {
    res.status(400);
    throw new Error('Slug is required');
  }
  const course = await Course.findOne({ slug: s }).lean();
  if (!course) {
    res.status(404);
    throw new Error('Course not found');
  }
  // Return only the editable fields expected by the JSON editor
  const allowRoot = new Set([
    'name','programme','programmeSlug','courseSlug','slug',
    'hero','stats','aboutProgram','learn','skills','details','capstone',
    'careerOutcomes','toolsFrameworks','modules','instructors','offeredBy','image'
  ]);
  const sanitized = {};
  for (const key of allowRoot) {
    if (Object.prototype.hasOwnProperty.call(course, key)) {
      sanitized[key] = course[key];
    }
  }
  // Fallback: if new-shape props are missing, include minimal compatibility fields
  if (!sanitized.slug && course.slug) sanitized.slug = course.slug;
  if (!sanitized.name && course.name) sanitized.name = course.name;
  if (!sanitized.programme && course.programme) sanitized.programme = course.programme;

  res.json({ course: sanitized });
});

const deleteCourseBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const s = typeof slug === 'string' ? slug.trim().toLowerCase() : '';
  if (!s) {
    res.status(400);
    throw new Error('Slug is required');
  }
  const deleted = await Course.findOneAndDelete({ slug: s });
  if (!deleted) {
    res.status(404);
    throw new Error('Course not found');
  }
  res.json({ message: 'Course deleted', slug: s });
});

// Append exports for raw admin APIs
module.exports.upsertRawCourse = upsertRawCourse;
module.exports.listRawCourses = listRawCourses;
module.exports.getRawCourseBySlug = getRawCourseBySlug;
module.exports.deleteCourseBySlug = deleteCourseBySlug;
