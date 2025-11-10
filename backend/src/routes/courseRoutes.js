/*
  Public course routes
  - Read/list courses and course pages for the public site
  - Mounted at /api/courses
*/
const express = require('express');
const {
  getCoursePage,
  listCourses,
  enrollInCourse,
  getCourseBySlug,
  getCourseModulesDetail,
  getCourseProgress,
  recordCourseProgress,
} = require('../controllers/courseController');
const { attachUserIfPresent, protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/page', attachUserIfPresent, getCoursePage);
router.get('/', listCourses);
router.get('/:programmeSlug/:courseSlug/progress', protect, getCourseProgress);
router.post('/:programmeSlug/:courseSlug/progress', protect, recordCourseProgress);
// support programme/course slugs (e.g., gradus-x/full-stack-development)
router.get('/:programmeSlug/:courseSlug/modules/detail', attachUserIfPresent, getCourseModulesDetail);
router.get('/:programmeSlug/:courseSlug', attachUserIfPresent, getCourseBySlug);
// legacy: single-part slug
router.get('/:courseSlug/progress', protect, getCourseProgress);
router.post('/:courseSlug/progress', protect, recordCourseProgress);
router.get('/:courseSlug', attachUserIfPresent, getCourseBySlug);
router.post('/:courseSlug/enroll', protect, enrollInCourse);

module.exports = router;
