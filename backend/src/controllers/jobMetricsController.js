const asyncHandler = require('express-async-handler');
const Job = require('../models/Job');
const JobApplication = require('../models/JobApplication');

const jobMetrics = asyncHandler(async (_req, res) => {
  const [jobCounts, applicationCounts] = await Promise.all([
    Job.aggregate([
      {
        $group: {
          _id: '$isPublished',
          count: { $sum: 1 },
        },
      },
    ]),
    JobApplication.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const formattedJobCounts = {
    published: jobCounts.find((c) => c._id === true)?.count || 0,
    draft: jobCounts.find((c) => c._id === false)?.count || 0,
  };

  const formattedAppCounts = applicationCounts.reduce((acc, curr) => {
    acc[curr._id || 'unknown'] = curr.count;
    return acc;
  }, {});

  res.json({
    jobs: formattedJobCounts,
    applications: formattedAppCounts,
  });
});

module.exports = { jobMetrics };
