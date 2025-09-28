const express = require('express');
const {
  getCoursePage,
  listCourses,
  enrollInCourse,
} = require('../controllers/courseController');
const { attachUserIfPresent, protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/page', attachUserIfPresent, getCoursePage);
router.get('/', listCourses);
router.post('/:courseSlug/enroll', protect, enrollInCourse);

module.exports = router;
