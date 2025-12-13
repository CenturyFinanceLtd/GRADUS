const asyncHandler = require('express-async-handler');
const Job = require('../models/Job');
const JobApplication = require('../models/JobApplication');

// --- PUBLIC ROUTES ---

// @desc    Get all jobs (public)
// @route   GET /api/jobs
// @access  Public
const getJobs = asyncHandler(async (req, res) => {
  const jobs = await Job.find().sort({ postedAt: -1 });
  res.json(jobs);
});

// @desc    Get single job (public)
// @route   GET /api/jobs/:id
// @access  Public
const getJobById = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (job) {
    res.json(job);
  } else {
    res.status(404);
    throw new Error('Job not found');
  }
});

// --- ADMIN ROUTES (Consumed by adminJobRoutes) ---

// @desc    Upsert Job (Create or Update)
// @route   POST /api/admin/jobs
// @access  Admin
const upsertJob = asyncHandler(async (req, res) => {
  const { _id, title, company, location, salary, type, description, isFeatured } = req.body;

  let job;

  if (_id) {
    // Update existing
    job = await Job.findById(_id);
    if (!job) {
      res.status(404);
      throw new Error('Job not found');
    }
    job.title = title || job.title;
    job.company = company || job.company;
    job.location = location || job.location;
    job.salary = salary || job.salary;
    job.type = type || job.type;
    job.description = description || job.description;
    job.isFeatured = isFeatured !== undefined ? isFeatured : job.isFeatured;
  } else {
    // Create new
    job = new Job({
      title,
      company,
      location,
      salary,
      type,
      description,
      isFeatured: isFeatured || false,
    });
  }

  const savedJob = await job.save();
  res.status(201).json(savedJob);
});

// @desc    List Jobs for Admin Panel
// @route   GET /api/admin/jobs
// @access  Admin
const listJobsAdmin = asyncHandler(async (req, res) => {
  const jobs = await Job.find().sort({ updatedAt: -1 });
  res.json({ items: jobs }); // Admin table usually expects { items: [] }
});

// @desc    List Applications for a Job
// @route   GET /api/admin/jobs/:jobId/applications
// @access  Admin
const listJobApplications = asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  const filter = jobId ? { job: jobId } : {};

  const applications = await JobApplication.find(filter)
    .populate('user', 'firstName lastName email personalDetails')
    .populate('job', 'title company')
    .sort({ appliedAt: -1 });

  res.json({ items: applications });
});

// @desc    Update Application Status
// @route   PUT /api/admin/jobs/applications/:applicationId/status
// @access  Admin
const updateApplicationStatus = asyncHandler(async (req, res) => {
  const { applicationId } = req.params;
  const { status } = req.body;

  if (!status || !['submitted', 'review', 'accepted', 'rejected'].includes(status)) {
    res.status(400);
    throw new Error('Invalid status.');
  }

  const application = await JobApplication.findById(applicationId);
  if (!application) {
    res.status(404);
    throw new Error('Application not found.');
  }

  application.status = status;
  const updated = await application.save();
  res.json(updated);
});

// @desc    Apply to a job
// @route   POST /api/jobs/:id/apply
// @access  Private
const applyToJob = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) {
    res.status(404);
    throw new Error('Job not found');
  }

  // Check if already applied
  const existingApp = await JobApplication.findOne({ job: req.params.id, user: req.user._id });
  if (existingApp) {
    res.status(400);
    throw new Error('You have already applied to this job');
  }

  const { resumeData, coverLetter } = req.body;

  const application = await JobApplication.create({
    job: req.params.id,
    user: req.user._id,
    resumeSnapshot: resumeData,
    coverLetter
  });

  res.status(201).json(application);
});

// @desc    Get my applications
// @route   GET /api/jobs/applications/me
// @access  Private
const getMyApplications = asyncHandler(async (req, res) => {
  const applications = await JobApplication.find({ user: req.user._id })
    .populate('job', 'title company')
    .sort({ appliedAt: -1 });
  res.json(applications);
});

// Exposed for public route usage (if needed in future)
const createJob = upsertJob;

module.exports = {
  getJobs,
  getJobById,
  createJob,
  upsertJob,
  listJobsAdmin,
  listJobApplications,
  updateApplicationStatus,
  applyToJob,
  getMyApplications,
};
