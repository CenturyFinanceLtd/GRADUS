/*
  Public course routes
  - Read/list courses and course pages for the public site
  - Mounted at /api/courses
*/
const express = require('express');
const { getCoursePage, listCourses, enrollInCourse, getCourseBySlug } = require('../controllers/courseController');
const { attachUserIfPresent, protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/page', attachUserIfPresent, getCoursePage);
router.get('/', listCourses);
// support programme/course slugs (e.g., gradus-x/full-stack-development)
router.get('/:programmeSlug/:courseSlug', attachUserIfPresent, getCourseBySlug);
// legacy: single-part slug
router.get('/:courseSlug', attachUserIfPresent, getCourseBySlug);
router.post('/:courseSlug/enroll', protect, enrollInCourse);

module.exports = router;
