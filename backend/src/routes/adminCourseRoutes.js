const express = require('express');
const {
  getAdminCoursePage,
  updateHero,
  createCourse,
  updateCourse,
  deleteCourse,
  listEnrollments,
} = require('../controllers/courseController');
const { protectAdmin } = require('../middleware/adminAuthMiddleware');

const router = express.Router();

router.get('/page', protectAdmin, getAdminCoursePage);
router.put('/page/hero', protectAdmin, updateHero);
router.post('/', protectAdmin, createCourse);
router.put('/:courseId', protectAdmin, updateCourse);
router.delete('/:courseId', protectAdmin, deleteCourse);
router.get('/enrollments', protectAdmin, listEnrollments);

module.exports = router;
