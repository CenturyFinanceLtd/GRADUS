/*
  Assignment controller
  - Admin CRUD + grading
  - Learner submission + listing
*/
const asyncHandler = require('express-async-handler');
const Assignment = require('../models/Assignment');
const AssignmentSubmission = require('../models/AssignmentSubmission');
const Enrollment = require('../models/Enrollment');
const Notification = require('../models/Notification');
const { sendUserNotification } = require('../utils/notifications');

const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024; // 2MB budget for inline attachment data

const assertEnrollment = async (userId, courseSlug) => {
  const enrollment = await Enrollment.findOne({
    user: userId,
    status: 'ACTIVE',
    paymentStatus: 'PAID',
  })
    .populate('course', 'slug')
    .lean();

  const slug = courseSlug?.toLowerCase?.() || '';
  if (!enrollment || (slug && enrollment.course?.slug !== slug)) {
    const err = new Error('Enrollment required for this course.');
    err.statusCode = 403;
    throw err;
  }
};

// Admin: create an assignment
const createAssignment = asyncHandler(async (req, res) => {
  const { courseSlug, lectureId, title, description, dueDate, maxPoints, tags } = req.body || {};
  if (!courseSlug || !title) {
    res.status(400);
    throw new Error('courseSlug and title are required');
  }

  const assignment = await Assignment.create({
    courseSlug: String(courseSlug).trim().toLowerCase(),
    lectureId: lectureId ? String(lectureId).trim() : undefined,
    title: String(title).trim(),
    description: description ? String(description).trim() : '',
    dueDate: dueDate ? new Date(dueDate) : undefined,
    maxPoints: Number(maxPoints) || 100,
    tags: Array.isArray(tags) ? tags.map((t) => String(t).trim()).filter(Boolean) : [],
    createdBy: req.admin?._id || null,
  });

  res.status(201).json({ assignment });
});

// Admin: list assignments for a course
const listAssignmentsAdmin = asyncHandler(async (req, res) => {
  const slug = typeof req.query.courseSlug === 'string' ? req.query.courseSlug.trim().toLowerCase() : '';
  const filter = slug ? { courseSlug: slug } : {};
  const items = await Assignment.find(filter).sort({ dueDate: 1, createdAt: -1 }).lean();
  res.json({ items });
});

// Admin: grade a submission
const gradeSubmission = asyncHandler(async (req, res) => {
  const { submissionId } = req.params;
  const { score, feedback } = req.body || {};
  const submission = await AssignmentSubmission.findById(submissionId).populate('user');
  if (!submission) {
    res.status(404);
    throw new Error('Submission not found');
  }
  const assignmentId = submission.assignment?.toString?.() || '';

  submission.score = Number.isFinite(Number(score)) ? Number(score) : submission.score;
  submission.maxPoints = submission.maxPoints || submission.score || null;
  submission.feedback = typeof feedback === 'string' ? feedback.trim() : submission.feedback;
  submission.status = 'graded';
  submission.gradedAt = new Date();
  await submission.save();

  // Notify learner
  sendUserNotification(submission.user?._id, {
    title: 'Assignment graded',
    body: 'Your submission has been graded.',
    data: { submissionId: submission._id.toString(), assignmentId },
  });

  res.json({ submission });
});

// Learner: list assignments for a course with my submission state
const listAssignmentsForCourse = asyncHandler(async (req, res) => {
  const courseSlug = typeof req.params.courseSlug === 'string' ? req.params.courseSlug.trim().toLowerCase() : '';
  if (!courseSlug) {
    res.status(400);
    throw new Error('courseSlug is required');
  }
  await assertEnrollment(req.user._id, courseSlug);
  const [assignments, submissions] = await Promise.all([
    Assignment.find({ courseSlug }).sort({ dueDate: 1, createdAt: -1 }).lean(),
    AssignmentSubmission.find({ user: req.user._id }).lean(),
  ]);

  const submissionMap = new Map();
  submissions.forEach((sub) => {
    submissionMap.set(sub.assignment?.toString?.() || '', sub);
  });

  const items = assignments.map((assignment) => ({
    ...assignment,
    id: assignment._id.toString(),
    submission: submissionMap.get(assignment._id.toString()) || null,
  }));

  // Fire a one-time "due soon" notification (within 24h, not submitted)
  const now = Date.now();
  const in24h = now + 24 * 60 * 60 * 1000;
  for (const assignment of assignments) {
    const due = assignment?.dueDate ? new Date(assignment.dueDate).getTime() : null;
    const hasSubmission = submissionMap.has(assignment._id.toString());
    if (due && due > now && due <= in24h && !hasSubmission) {
      await Notification.updateOne(
        {
          user: req.user._id,
          'data.assignmentId': assignment._id.toString(),
          title: 'Assignment due soon',
        },
        {
          $setOnInsert: {
            user: req.user._id,
            title: 'Assignment due soon',
            body: `${assignment.title} is due soon.`,
            data: { assignmentId: assignment._id.toString(), courseSlug },
            read: false,
            createdAt: new Date(),
          },
        },
        { upsert: true }
      );
    }
  }

  res.json({ items });
});

// Learner: submit assignment
const submitAssignment = asyncHandler(async (req, res) => {
  const { assignmentId } = req.params;
  const { content, attachmentUrl } = req.body || {};
  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) {
    res.status(404);
    throw new Error('Assignment not found');
  }
  await assertEnrollment(req.user._id, assignment.courseSlug);

  const cleanContent = typeof content === 'string' ? content.trim() : '';
  const attachment = {
    attachmentUrl: typeof attachmentUrl === 'string' ? attachmentUrl.trim() : '',
    attachmentName: typeof req.body?.attachmentName === 'string' ? req.body.attachmentName.trim() : '',
    attachmentType: typeof req.body?.attachmentType === 'string' ? req.body.attachmentType.trim() : '',
    attachmentSize: Number.isFinite(Number(req.body?.attachmentSize)) ? Number(req.body.attachmentSize) : null,
  };

  const rawData = typeof req.body?.attachmentData === 'string' ? req.body.attachmentData.trim() : '';
  if (rawData) {
    const approxBytes = Math.floor((rawData.length * 3) / 4);
    if (approxBytes > MAX_ATTACHMENT_BYTES) {
      res.status(413);
      throw new Error('Attachment too large (max 2MB).');
    }
    attachment.attachmentData = rawData;
    attachment.attachmentSize = attachment.attachmentSize || approxBytes;
  }

  const payload = {
    assignment: assignment._id,
    user: req.user._id,
    content: cleanContent,
    ...attachment,
    submittedAt: new Date(),
    maxPoints: assignment.maxPoints,
    status: 'submitted',
  };

  const submission = await AssignmentSubmission.findOneAndUpdate(
    { assignment: assignment._id, user: req.user._id },
    { $set: payload },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  sendUserNotification(req.user._id, {
    title: 'Assignment submitted',
    body: `You submitted "${assignment.title}".`,
    data: { assignmentId: assignment._id.toString() },
  });

  res.status(201).json({ submission });
});

// Admin: list submissions for an assignment
const listSubmissionsAdmin = asyncHandler(async (req, res) => {
  const { assignmentId } = req.params;
  const submissions = await AssignmentSubmission.find({ assignment: assignmentId })
    .populate('user', 'firstName lastName email')
    .lean();
  res.json({ items: submissions });
});

// Learner: list my submissions
const listMySubmissions = asyncHandler(async (req, res) => {
  const submissions = await AssignmentSubmission.find({ user: req.user._id }).sort({ updatedAt: -1 }).lean();
  res.json({ items: submissions });
});

module.exports = {
  createAssignment,
  listAssignmentsAdmin,
  gradeSubmission,
  listAssignmentsForCourse,
  submitAssignment,
  listSubmissionsAdmin,
  listMySubmissions,
};
