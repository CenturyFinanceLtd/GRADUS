const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getJobs, getJobById, applyToJob, getMyApplications } = require('../controllers/jobController');

router.route('/').get(getJobs);
router.route('/applications/me').get(protect, getMyApplications);
router.route('/:id').get(getJobById);
router.route('/:id/apply').post(protect, applyToJob);

module.exports = router;
