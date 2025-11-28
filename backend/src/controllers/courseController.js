/*
  Course controller
  - Admin CRUD for courses/pages and public read endpoints
*/
const asyncHandler = require('express-async-handler');
const crypto = require('crypto');
const Course = require('../models/Course');
const CoursePage = require('../models/CoursePage');
const Enrollment = require('../models/Enrollment');
const CourseDetail = require('../models/CourseDetail');
const CourseProgress = require('../models/CourseProgress');
const { buildFallbackModules } = require('../utils/courseDetail');
const fetch = require('node-fetch');
const stream = require('stream');
const { promisify } = require('util');
const { cloudinary } = require('../config/cloudinary');

const pipeline = promisify(stream.pipeline);

const PROGRESS_COMPLETION_THRESHOLD = 0.9;
const resolveUserDisplayName = (user) => {
  if (!user || typeof user !== 'object') {
    return 'Unknown learner';
  }
  const combinedName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return (
    normalizeString(user.personalDetails?.studentName) ||
    normalizeString(user.name) ||
    normalizeString(combinedName) ||
    normalizeString(user.email) ||
    'Unknown learner'
  );
};

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

const resolveCourseSlugFromParams = ({ programmeSlug, courseSlug }) => {
  if (programmeSlug && courseSlug) {
    return `${String(programmeSlug).trim().toLowerCase()}/${String(courseSlug).trim().toLowerCase()}`;
  }
  const fallback = courseSlug || programmeSlug || '';
  return String(fallback).trim().toLowerCase();
};

const findLectureById = (modules = [], lectureId) => {
  const target = normalizeString(lectureId);
  if (!target) {
    return null;
  }
  for (const module of modules) {
    if (!module?.sections?.length) continue;
    for (const section of module.sections) {
      if (!section?.lectures?.length) continue;
      for (const lecture of section.lectures) {
        if (normalizeString(lecture?.lectureId) === target) {
          return lecture;
        }
      }
    }
  }
  return null;
};

const sanitizeFileName = (value, fallback = 'lecture-notes.pdf') => {
  const trimmed = normalizeString(value) || fallback;
  return trimmed.replace(/[^a-z0-9_\-.]+/gi, '_');
};

const sanitizeLectureNotes = (notes) => {
  if (!notes) {
    return undefined;
  }
  const hasPrivateAsset = normalizeString(notes.publicId);
  return {
    hasFile: Boolean(hasPrivateAsset),
    fileName: notes.fileName || '',
    bytes: Number.isFinite(notes.bytes) ? notes.bytes : 0,
    format: normalizeString(notes.format) || 'pdf',
    pages: Number.isFinite(notes.pages) ? notes.pages : 0,
    uploadedAt: notes.uploadedAt || '',
  };
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

  const maxAttemptsInput = Number(body?.assessmentMaxAttempts);
  const assessmentMaxAttempts = Number.isFinite(maxAttemptsInput)
    ? Math.max(1, Math.floor(maxAttemptsInput))
    : Number.isFinite(existingCourse?.assessmentMaxAttempts)
    ? existingCourse.assessmentMaxAttempts
    : 3;

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
    assessmentMaxAttempts,
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
    .select(['name', 'slug', 'programme', 'updatedAt', 'createdAt', 'hero', 'stats', 'mode', 'level', 'duration', 'weeks', 'modules', 'price', 'image', 'aboutProgram'])
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
      const enrolledCount = (() => {
        const raw = course?.hero?.enrolledText;
        if (!raw) return null;
        const match = String(raw).match(/([0-9][0-9,]*)/);
        if (!match) return null;
        const num = Number(match[1].replace(/,/g, ""));
        return Number.isFinite(num) ? num : null;
      })();
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
        aboutProgram: ensureArray(course.aboutProgram),
        enrolledCount,
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

const getCourseModulesDetail = asyncHandler(async (req, res) => {
  const { programmeSlug, courseSlug } = req.params;
  const normalizedSlug = buildCombinedSlug({
    programmeSlug: programmeSlug ? programmeSlug.trim().toLowerCase() : '',
    courseSlug: courseSlug ? courseSlug.trim().toLowerCase() : '',
  });

  if (!normalizedSlug) {
    res.status(400);
    throw new Error('A valid course identifier is required.');
  }

  const course = await Course.findOne({ slug: normalizedSlug }).lean();
  if (!course) {
    res.status(404);
    throw new Error('Course not found.');
  }

  const detail = await CourseDetail.findOne({ courseSlug: normalizedSlug }).lean();
  const modules =
    detail && Array.isArray(detail.modules) && detail.modules.length
      ? detail.modules
      : buildFallbackModules(course);
  const sanitizedModules = modules.map((module) => ({
    ...module,
    sections: Array.isArray(module.sections)
      ? module.sections.map((section) => ({
          ...section,
          lectures: Array.isArray(section.lectures)
            ? section.lectures.map((lecture) => ({
                ...lecture,
                notes: sanitizeLectureNotes(lecture.notes),
              }))
            : [],
        }))
      : [],
  }));

  res.json({
    course: {
      slug: normalizedSlug,
      name: course.name,
      programme: course.programme,
      programmeSlug: course.programmeSlug,
      courseSlug: course.courseSlug,
    },
    modules: sanitizedModules,
  });
});

const mapProgressDoc = (doc) => ({
  lectureId: doc.lectureId,
  moduleId: doc.moduleId,
  sectionId: doc.sectionId,
  lectureTitle: doc.lectureTitle,
  videoUrl: doc.videoUrl,
  durationSeconds: doc.durationSeconds,
  lastPositionSeconds: doc.lastPositionSeconds,
  watchedSeconds: doc.watchedSeconds,
  completionRatio: doc.completionRatio,
  completedAt: doc.completedAt,
  updatedAt: doc.updatedAt,
});

const getCourseProgress = asyncHandler(async (req, res) => {
  const courseSlug = resolveCourseSlugFromParams(req.params);
  if (!courseSlug) {
    res.status(400);
    throw new Error('A valid course identifier is required.');
  }
  const docs = await CourseProgress.find({
    user: req.user._id,
    courseSlug,
  })
    .sort({ updatedAt: -1 })
    .lean();
  const progress = docs.reduce((acc, doc) => {
    acc[doc.lectureId] = mapProgressDoc(doc);
    return acc;
  }, {});
  res.json({ progress });
});

const recordCourseProgress = asyncHandler(async (req, res) => {
  const courseSlug = resolveCourseSlugFromParams(req.params);
  if (!courseSlug) {
    res.status(400);
    throw new Error('A valid course identifier is required.');
  }
  const { lectureId, moduleId, sectionId, lectureTitle, videoUrl, currentTime, duration } = req.body || {};
  if (!lectureId) {
    res.status(400);
    throw new Error('lectureId is required.');
  }
  const parsedDuration = Math.max(0, Number(duration) || 0);
  const parsedPosition = Math.max(0, Number(currentTime) || 0);
  const ratioFromPayload = parsedDuration > 0 ? Math.min(parsedPosition / parsedDuration, 1) : 0;

  const existing = await CourseProgress.findOne({
    user: req.user._id,
    courseSlug,
    lectureId,
  });

  const nextRatio = Math.max(existing?.completionRatio || 0, ratioFromPayload);
  const update = {
    user: req.user._id,
    courseSlug,
    lectureId,
    moduleId: moduleId || existing?.moduleId || '',
    sectionId: sectionId || existing?.sectionId || '',
    lectureTitle: lectureTitle || existing?.lectureTitle || '',
    videoUrl: videoUrl || existing?.videoUrl || '',
    durationSeconds: Math.max(parsedDuration, existing?.durationSeconds || 0),
    lastPositionSeconds: parsedPosition,
    watchedSeconds: Math.max(existing?.watchedSeconds || 0, parsedPosition),
    completionRatio: nextRatio,
  };
  if (existing?.completedAt) {
    update.completedAt = existing.completedAt;
  }
  if (!existing?.completedAt && nextRatio >= PROGRESS_COMPLETION_THRESHOLD) {
    update.completedAt = new Date();
  }

  const saved = await CourseProgress.findOneAndUpdate(
    { user: req.user._id, courseSlug, lectureId },
    { $set: update },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  res.json({ progress: mapProgressDoc(saved) });
});

const streamLectureNotes = asyncHandler(async (req, res) => {
  const courseSlug = resolveCourseSlugFromParams(req.params);
  if (!courseSlug) {
    res.status(400);
    throw new Error('A valid course identifier is required.');
  }
  const lectureId = normalizeString(req.params.lectureId);
  if (!lectureId) {
    res.status(400);
    throw new Error('lectureId is required.');
  }
  const detail = await CourseDetail.findOne({ courseSlug }).select('modules').lean();
  if (!detail?.modules?.length) {
    res.status(404);
    throw new Error('Lecture notes not found.');
  }
  const lecture = findLectureById(detail.modules, lectureId);
  if (!lecture?.notes?.publicId) {
    res.status(404);
    throw new Error('Lecture notes not available for this lecture.');
  }

  const rawFormat = normalizeString(lecture.notes.format) || 'pdf';
  const normalizedFormat = rawFormat.toLowerCase().includes('pdf') ? 'pdf' : rawFormat;
  const baseName = lecture.notes.fileName || lecture.title || lecture.lectureId || 'lecture-notes';
  const safeBase = sanitizeFileName(baseName, 'lecture-notes');
  const fileName = safeBase.toLowerCase().endsWith(`.${normalizedFormat}`)
    ? safeBase
    : `${safeBase}.${normalizedFormat || 'pdf'}`;

  const cleanPublicId = normalizeString(lecture.notes.publicId).replace(/^\/+|\/+$/g, '');
  if (!cleanPublicId) {
    res.status(404);
    throw new Error('Lecture notes not available for this lecture.');
  }

  const downloadUrl = cloudinary.url(cleanPublicId, {
    resource_type: 'auto',
    secure: true,
    format: normalizedFormat,
    type: 'upload',
  });

  if (String(req.query.mode).toLowerCase() === 'url') {
    return res.json({ url: downloadUrl, fileName, format: normalizedFormat || 'pdf' });
  }

  res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.redirect(downloadUrl);
});

const getCourseProgressAdmin = asyncHandler(async (req, res) => {
  const courseSlug = resolveCourseSlugFromParams({ courseSlug: req.params.courseSlug });
  if (!courseSlug) {
    res.status(400);
    throw new Error('A valid course identifier is required.');
  }

  const [courseDoc, courseDetailDoc] = await Promise.all([
    Course.findOne({ slug: courseSlug }).select('modules').lean(),
    CourseDetail.findOne({ courseSlug }).select('modules.moduleId modules.moduleLabel modules.title').lean(),
  ]);

  const moduleLabelLookup = {};
  const registerModuleMeta = (rawId, label, fallback) => {
    const id = rawId ? String(rawId).trim() : '';
    if (!id) {
      return;
    }
    const display = label || fallback || id;
    moduleLabelLookup[id] = display;
    moduleLabelLookup[id.toLowerCase()] = display;
  };

  const sectionLabelLookup = {};
  const registerSectionMeta = (rawId, label, fallback) => {
    const id = rawId ? String(rawId).trim() : '';
    if (!id) {
      return;
    }
    const display = label || fallback || id;
    sectionLabelLookup[id] = display;
    sectionLabelLookup[id.toLowerCase()] = display;
  };

  if (Array.isArray(courseDetailDoc?.modules)) {
    courseDetailDoc.modules.forEach((module, index) => {
      registerModuleMeta(
        module?.moduleId,
        module?.moduleLabel || module?.title,
        `Module ${index + 1}`
      );
      if (Array.isArray(module?.sections)) {
        module.sections.forEach((section, sectionIndex) => {
          registerSectionMeta(
            section?.sectionId,
            section?.title || section?.subtitle,
            `Week ${sectionIndex + 1}`
          );
        });
      }
    });
  }

  if (Array.isArray(courseDoc?.modules)) {
    courseDoc.modules.forEach((module, index) => {
      registerModuleMeta(module?._id, module?.title, `Module ${index + 1}`);
    });
  }

  const resolveModuleLabel = (value) => {
    if (!value) {
      return '';
    }
    const raw = String(value).trim();
    return moduleLabelLookup[raw] || moduleLabelLookup[raw.toLowerCase()] || '';
  };

  const resolveSectionLabel = (value) => {
    if (!value) {
      return '';
    }
    const raw = String(value).trim();
    return sectionLabelLookup[raw] || sectionLabelLookup[raw.toLowerCase()] || '';
  };

  const filter = { courseSlug };
  if (req.query.userId) {
    filter.user = req.query.userId;
  }
  const docs = await CourseProgress.find(filter)
    .populate({ path: 'user', select: 'name firstName lastName email avatar role personalDetails' })
    .sort({ updatedAt: -1 })
    .lean();

  const grouped = {};
  docs.forEach((doc) => {
    const key = doc.user?._id?.toString() || 'unknown';
    const userDisplayName = resolveUserDisplayName(doc.user);
    if (!grouped[key]) {
      grouped[key] = {
        userId: key,
        userName: userDisplayName,
        userEmail: doc.user?.email || '',
        avatar: doc.user?.avatar || '',
        role: doc.user?.role || '',
        totalLectures: 0,
        completedLectures: 0,
        lectures: [],
      };
    }
    const ratio = doc.completionRatio || 0;
    const isCompleted = Boolean(doc.completedAt) || ratio >= PROGRESS_COMPLETION_THRESHOLD;
    grouped[key].totalLectures += 1;
    if (isCompleted) {
      grouped[key].completedLectures += 1;
    }
    const resolvedModuleLabel = resolveModuleLabel(doc.moduleId);
    const resolvedSectionLabel = resolveSectionLabel(doc.sectionId);
    grouped[key].lectures.push({
      lectureId: doc.lectureId,
      lectureTitle: doc.lectureTitle,
      moduleId: doc.moduleId,
      moduleTitle: resolvedModuleLabel,
      moduleLabel: resolvedModuleLabel,
      sectionId: doc.sectionId,
      sectionLabel: resolvedSectionLabel,
      completionRatio: ratio,
      completedAt: doc.completedAt,
      lastPositionSeconds: doc.lastPositionSeconds,
      durationSeconds: doc.durationSeconds,
      updatedAt: doc.updatedAt,
    });
  });

  const progressByUser = Object.values(grouped).sort((a, b) =>
    (a.userName || '').localeCompare(b.userName || '')
  );

  const lectureTotals = {};
  docs.forEach((doc) => {
    const resolvedModuleLabel = resolveModuleLabel(doc.moduleId);
    const resolvedSectionLabel = resolveSectionLabel(doc.sectionId);
    const lectureId = doc.lectureId;
    if (!lectureId) {
      return;
    }
    if (!lectureTotals[lectureId]) {
      lectureTotals[lectureId] = {
        lectureId,
        lectureTitle: doc.lectureTitle,
        moduleId: doc.moduleId,
        moduleTitle: resolvedModuleLabel,
        moduleLabel: resolvedModuleLabel,
        sectionId: doc.sectionId,
        sectionLabel: resolvedSectionLabel,
        learners: 0,
        completed: 0,
        avgCompletion: 0,
      };
    }
    const entry = lectureTotals[lectureId];
    entry.learners += 1;
    const ratio = doc.completionRatio || 0;
    entry.avgCompletion += ratio;
    if (doc.completedAt || ratio >= PROGRESS_COMPLETION_THRESHOLD) {
      entry.completed += 1;
    }
  });

  const lectureSummary = Object.values(lectureTotals).map((entry) => ({
    ...entry,
    avgCompletion: entry.learners ? entry.avgCompletion / entry.learners : 0,
  }));

  res.json({
    courseSlug,
    progress: progressByUser,
    lectureSummary,
  });
});

const getCourseEnrollmentsAdmin = asyncHandler(async (req, res) => {
  const slugParam = req.params.courseSlug || req.query.slug;
  const slugFilter = slugParam ? String(slugParam).trim().toLowerCase() : '';

  const courseQuery = slugFilter ? { slug: slugFilter } : {};
  const courses = await Course.find(courseQuery)
    .select('name slug programme price stats image')
    .sort({ name: 1 })
    .lean();

  if (!courses.length) {
    res.json({ items: [] });
    return;
  }

  const courseIdLookup = courses.reduce((acc, course) => {
    acc[course._id.toString()] = course;
    return acc;
  }, {});

  const enrollmentFilter = { course: { $in: Object.keys(courseIdLookup) } };
  if (req.query.status) {
    enrollmentFilter.status = req.query.status;
  }
  if (req.query.paymentStatus) {
    enrollmentFilter.paymentStatus = req.query.paymentStatus;
  }
  if (req.query.userId) {
    enrollmentFilter.user = req.query.userId;
  }

  const enrollments = await Enrollment.find(enrollmentFilter)
    .populate({
      path: 'user',
      select: 'firstName lastName email mobile personalDetails educationDetails',
    })
    .sort({ createdAt: -1 })
    .lean();

  const grouped = {};
  enrollments.forEach((enrollment) => {
    const courseId = enrollment.course?.toString();
    const course = courseIdLookup[courseId];
    if (!course) {
      return;
    }
    if (!grouped[course.slug]) {
      grouped[course.slug] = {
        slug: course.slug,
        name: course.name,
        programme: course.programme,
        totalEnrollments: 0,
        paidEnrollments: 0,
        learners: [],
      };
    }
    const entry = grouped[course.slug];
    entry.totalEnrollments += 1;
    if (enrollment.paymentStatus === 'PAID') {
      entry.paidEnrollments += 1;
    }
    const learner = enrollment.user || {};
    const learnerName =
      learner.personalDetails?.studentName ||
      [learner.firstName, learner.lastName].filter(Boolean).join(' ').trim() ||
      learner.email ||
      'Unknown learner';
    entry.learners.push({
      enrollmentId: enrollment._id.toString(),
      userId: learner._id?.toString() || '',
      name: learnerName,
      email: learner.email || '',
      phone: learner.mobile || learner.personalDetails?.phone || '',
      city: learner.personalDetails?.city || '',
      state: learner.personalDetails?.state || '',
      institution: learner.educationDetails?.institutionName || '',
      status: enrollment.status,
      paymentStatus: enrollment.paymentStatus,
      paymentReference: enrollment.paymentReference || '',
      paidAt: enrollment.paidAt,
      createdAt: enrollment.createdAt,
    });
  });

  const items = courses.map((course) => {
    const entry = grouped[course.slug] || {
      slug: course.slug,
      name: course.name,
      programme: course.programme,
      totalEnrollments: 0,
      paidEnrollments: 0,
      learners: [],
    };
    entry.learners = entry.learners.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    return entry;
  });

  res.json({ items });
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
  getCourseModulesDetail,
  getCourseProgress,
  recordCourseProgress,
  streamLectureNotes,
  getCourseProgressAdmin,
  getCourseEnrollmentsAdmin,
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
    'image','media'
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
  const optionalNumber = (value) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    const num = Number(value);
    return Number.isFinite(num) ? num : undefined;
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

  if (typeof input.media !== 'undefined') {
    const mediaAllowed = new Set(['banner']);
    const media = obj(input.media || {}, 'media');
    requireKeysOnly(media, mediaAllowed, 'media');
    const mediaOut = {};
    if (typeof media.banner !== 'undefined') {
      const bannerAllowed = new Set(['url','publicId','width','height','format']);
      const banner = obj(media.banner || {}, 'media.banner');
      requireKeysOnly(banner, bannerAllowed, 'media.banner');
      const bannerOut = {
        url: str(banner.url),
        publicId: str(banner.publicId),
        format: str(banner.format),
      };
      const width = optionalNumber(banner.width);
      const height = optionalNumber(banner.height);
      if (width !== undefined) bannerOut.width = width;
      if (height !== undefined) bannerOut.height = height;
      mediaOut.banner = bannerOut;
    }
    if (Object.keys(mediaOut).length) {
      out.media = mediaOut;
    }
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
    'careerOutcomes','toolsFrameworks','modules','instructors','offeredBy','image','media'
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
