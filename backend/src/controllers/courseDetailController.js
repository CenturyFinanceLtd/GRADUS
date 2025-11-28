/*
  Course detail controller
  - Manages deep-dive content for each course (modules, weeks, lectures, media)
*/
const asyncHandler = require('express-async-handler');
const CourseDetail = require('../models/CourseDetail');
const Course = require('../models/Course');
const { cloudinary, lectureVideosFolder, lectureNotesFolder } = require('../config/cloudinary');
const {
  safeString,
  safeArray,
  normalizeModulesPayload,
  buildFallbackModules,
} = require('../utils/courseDetail');

const getCourseDetail = asyncHandler(async (req, res) => {
  const slugRaw = decodeURIComponent(safeString(req.query.slug)).toLowerCase();
  if (!slugRaw) {
    res.status(400);
    throw new Error('slug query parameter is required');
  }

  const course = await Course.findOne({ slug: slugRaw }).lean();
  if (!course) {
    res.status(404);
    throw new Error('Course not found');
  }

  const detailDoc = await CourseDetail.findOne({ courseSlug: slugRaw }).lean();
  const modules =
    detailDoc && Array.isArray(detailDoc.modules) && detailDoc.modules.length
      ? detailDoc.modules
      : buildFallbackModules(course);

  res.json({
    course: {
      slug: slugRaw,
      name: course.name,
      programme: course.programme || 'Gradus X',
      programmeSlug: course.programmeSlug || '',
      courseSlug: course.courseSlug || '',
    },
    detail: {
      courseSlug: slugRaw,
      modules,
      updatedAt: detailDoc?.updatedAt || course.updatedAt,
    },
  });
});

const upsertCourseDetail = asyncHandler(async (req, res) => {
  const slugRaw = safeString(req.query.slug).toLowerCase();
  if (!slugRaw) {
    res.status(400);
    throw new Error('slug query parameter is required');
  }
  const course = await Course.findOne({ slug: slugRaw }).lean();
  if (!course) {
    res.status(404);
    throw new Error('Course not found');
  }

  const modules = normalizeModulesPayload(req.body?.modules || []);

  const saved = await CourseDetail.findOneAndUpdate(
    { courseSlug: slugRaw },
    {
      $set: {
        courseSlug: slugRaw,
        courseName: course.name,
        programme: course.programme || 'Gradus X',
        programmeSlug: course.programmeSlug || '',
        modules,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();

  res.json({ message: 'Detailed course data saved', detail: saved });
});

const uploadVideoBuffer = (buffer, { folder }) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: 'video', folder, overwrite: false },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(buffer);
  });

const uploadLectureVideo = asyncHandler(async (req, res) => {
  const slugRaw = safeString(req.query.slug).toLowerCase();
  if (!slugRaw) {
    res.status(400);
    throw new Error('slug query parameter is required');
  }
  if (!req.file || !req.file.buffer) {
    res.status(400);
    throw new Error('Video file is required');
  }

  const programme = safeString(req.query.programme) || 'Gradus';
  const programmeFolder = programme.toLowerCase().replace(/\s+/g, '-');
  const folder = `${lectureVideosFolder}/${programmeFolder}/${slugRaw}`;

  const result = await uploadVideoBuffer(req.file.buffer, { folder });

  res.status(201).json({
    ok: true,
    asset: {
      url: result.secure_url,
      publicId: result.public_id,
      folder: result.folder,
      format: result.format,
      duration: result.duration,
      bytes: result.bytes,
      width: result.width,
      height: result.height,
      resourceType: result.resource_type,
    },
  });
});

const uploadNotesBuffer = (buffer, { folder, publicId }) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'auto',
        folder,
        overwrite: true,
        allowed_formats: ['pdf'],
        format: 'pdf',
        public_id: publicId,
        type: 'upload',
        access_mode: 'public',
        content_type: 'application/pdf',
        use_filename: true,
        unique_filename: false,
        filename_override: `${publicId}.pdf`,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(buffer);
  });

const sanitizeSegment = (value, fallback) => {
  const cleaned = safeString(value) || fallback || '';
  return cleaned
    .toLowerCase()
    .replace(/[^a-z0-9\-\s]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/(^-|-$)/g, '');
};

const uploadLectureNotes = asyncHandler(async (req, res) => {
  const slugRaw = safeString(req.query.slug).toLowerCase();
  if (!slugRaw) {
    res.status(400);
    throw new Error('slug query parameter is required');
  }
  if (!req.file || !req.file.buffer) {
    res.status(400);
    throw new Error('Notes PDF file is required');
  }
  const mimeLower = (req.file.mimetype || '').toLowerCase();
  const isPdfMime = mimeLower.includes('pdf');
  const startsWithPdfSignature = req.file.buffer.slice(0, 5).toString('utf8') === '%PDF-';
  if (!isPdfMime || !startsWithPdfSignature) {
    res.status(400);
    throw new Error('Only PDF uploads are allowed');
  }
  const slugParts = slugRaw.split('/');
  const courseSlugPart = slugParts[slugParts.length - 1];
  const programmeSlugPart = slugParts.length > 1 ? slugParts[0] : '';
  const programme = safeString(req.query.programme) || programmeSlugPart || 'Gradus';
  const programmeFolder = sanitizeSegment(programme, 'gradus');
  const slugSegment = sanitizeSegment(courseSlugPart, 'course');
  const moduleName = sanitizeSegment(req.query.module, 'module');
  const sectionName = sanitizeSegment(req.query.section, 'week');
  const lectureName = sanitizeSegment(req.query.lecture, 'lecture');
  const originalBase = sanitizeSegment(
    (req.file.originalname || '').replace(/\.[^.]+$/, ''),
    lectureName || 'lecture-notes'
  );
  const folder = `${lectureNotesFolder}/${programmeFolder}/${slugSegment}/${moduleName}/${sectionName}/${lectureName}`;
  const publicId = originalBase || 'lecture-notes';
  const result = await uploadNotesBuffer(req.file.buffer, { folder, publicId });
  const safeFormat = 'pdf';
  const safeFileName =
    (req.file.originalname && req.file.originalname.toLowerCase().endsWith('.pdf')
      ? req.file.originalname
      : `${originalBase || 'lecture-notes'}.pdf`) || 'lecture-notes.pdf';
  const secureUrl =
    result.secure_url ||
    cloudinary.url(result.public_id || `${folder}/${publicId}`, {
      resource_type: 'auto',
      secure: true,
      format: 'pdf',
      type: 'upload',
    });
  res.status(201).json({
    ok: true,
    asset: {
      publicId: result.public_id,
      folder: result.folder,
      format: safeFormat,
      bytes: result.bytes,
      pages: Number.isFinite(result.pages) ? result.pages : 0,
      fileName: safeFileName,
      accessMode: result.access_mode || 'public',
      secureUrl,
      createdAt: result.created_at,
    },
  });
});

module.exports = {
  getCourseDetail,
  upsertCourseDetail,
  uploadLectureVideo,
  uploadLectureNotes,
};
