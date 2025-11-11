/*
  Admin > Course routes
  - CRUD endpoints for managing courses
  - Mounted at /api/admin/courses
*/
const express = require('express');
const { protectAdmin } = require('../middleware/adminAuthMiddleware');
const {
  createCourse,
  updateCourse,
  deleteCourse,
  upsertRawCourse,
  listRawCourses,
  getRawCourseBySlug,
  deleteCourseBySlug,
  getCourseProgressAdmin,
} = require('../controllers/courseController');

const Course = require('../models/Course');

const router = express.Router();

// List courses (admin view)
router.get('/', protectAdmin, async (req, res, next) => {
  try {
    const courses = await Course.find().sort({ order: 1, createdAt: 1 }).lean();
    res.json({ items: courses.map((c) => ({
      id: c._id.toString(),
      slug: c.slug,
      name: c.name,
      programme: c.programme || 'Gradus X',
      price: c.price || '',
      imageUrl: (c?.image && c.image.url) || '',
      updatedAt: c.updatedAt,
    })) });
  } catch (err) {
    next(err);
  }
});

// Create
router.post('/', protectAdmin, createCourse);
// Update
router.patch('/:courseId', protectAdmin, updateCourse);
// Delete
router.delete('/:courseId', protectAdmin, deleteCourse);

router.get('/progress/:courseSlug', protectAdmin, getCourseProgressAdmin);

// RAW JSON admin endpoints (full shape)
router.get('/raw', protectAdmin, listRawCourses);
router.get('/raw/:slug', protectAdmin, getRawCourseBySlug);
router.post('/raw', protectAdmin, upsertRawCourse);
router.delete('/slug/:slug', protectAdmin, deleteCourseBySlug);

module.exports = router;
