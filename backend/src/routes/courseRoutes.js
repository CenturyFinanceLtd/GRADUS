const express = require('express');
const { getCoursePage, listCourses } = require('../controllers/courseController');

const router = express.Router();

router.get('/page', getCoursePage);
router.get('/', listCourses);

module.exports = router;
