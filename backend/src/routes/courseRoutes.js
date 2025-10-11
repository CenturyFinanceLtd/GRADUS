const express = require('express');
const { getCoursePage, listCourses, enrollInCourse, getCourseBySlug } = require('../controllers/courseController');
const { attachUserIfPresent, protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/page', attachUserIfPresent, getCoursePage);
router.get('/', listCourses);
router.get('/:courseSlug', attachUserIfPresent, getCourseBySlug);
router.post('/:courseSlug/enroll', protect, enrollInCourse);

module.exports = router;
