/*
  Job routes (admin)
  - Mounted at /api/admin/jobs
*/
const express = require('express');
const { protectAdmin } = require('../middleware/adminAuthMiddleware');
const { upsertJob, listJobsAdmin, listJobApplications, updateApplicationStatus } = require('../controllers/jobController');
const { jobMetrics } = require('../controllers/jobMetricsController');

const router = express.Router();

router.use(protectAdmin);

router.get('/', listJobsAdmin);
router.post('/', upsertJob);
router.put('/:jobId', upsertJob);
router.get('/:jobId/applications', listJobApplications);
router.put('/applications/:applicationId/status', updateApplicationStatus);
router.get('/metrics/summary', jobMetrics);

module.exports = router;
