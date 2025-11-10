/*
  Course detail controller
  - Manages deep-dive content for each course (modules, weeks, lectures, media)
*/
const asyncHandler = require('express-async-handler');
const CourseDetail = require('../models/CourseDetail');
const Course = require('../models/Course');
const { cloudinary, lectureVideosFolder } = require('../config/cloudinary');
const {
  safeString,
  safeArray,
  normalizeModulesPayload,
  buildFallbackModules,
} = require('../utils/courseDetail');

const getCourseDetail = asyncHandler(async (req, res) => {
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

module.exports = {
  getCourseDetail,
  upsertCourseDetail,
  uploadLectureVideo,
};
