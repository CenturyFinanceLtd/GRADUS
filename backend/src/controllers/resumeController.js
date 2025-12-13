/*
  Resume controller
  - CRUD for learner resume data
*/
const asyncHandler = require('express-async-handler');
const Resume = require('../models/Resume');
const { sendUserNotification } = require('../utils/notifications');
const PDFDocument = require('pdfkit');

const getMyResume = asyncHandler(async (req, res) => {
  const resume = await Resume.findOne({ user: req.user._id }).lean();
  res.json({
    resume: resume || {
      template: 'classic',
      data: {},
      isPublished: false,
    },
  });
});

const upsertMyResume = asyncHandler(async (req, res) => {
  const payload = {
    template: typeof req.body?.template === 'string' ? req.body.template.trim() : 'classic',
    data: req.body?.data && typeof req.body.data === 'object' ? req.body.data : {},
    isPublished: Boolean(req.body?.isPublished),
  };

  const resume = await Resume.findOneAndUpdate(
    { user: req.user._id },
    { $set: payload, $setOnInsert: { user: req.user._id } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  sendUserNotification(req.user._id, {
    title: 'Resume updated',
    body: 'Your resume has been saved.',
    data: { resumeId: resume._id.toString() },
  });

  res.json({ resume });
});

const exportMyResumePdf = asyncHandler(async (req, res) => {
  const resume = await Resume.findOne({ user: req.user._id }).lean();
  const data = resume?.data || {};

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'inline; filename="resume.pdf"');

  const doc = new PDFDocument({ margin: 48 });
  doc.pipe(res);

  doc.fontSize(20).text(data.fullName || 'Your Name', { bold: true });
  doc.fontSize(12).fillColor('#444').text(data.headline || 'Role / Headline');
  doc.moveDown(0.5);
  ['linkedin', 'portfolio', 'github', 'twitter'].forEach((key) => {
    if (data[key]) {
      doc.fillColor('#2563eb').text(`${key}: ${data[key]}`);
    }
  });

  const section = (title) => {
    doc.moveDown(1);
    doc.fillColor('#111').fontSize(14).text(title, { underline: true });
    doc.moveDown(0.25);
  };

  if (data.summary) {
    section('Summary');
    doc.fontSize(12).fillColor('#333').text(data.summary);
  }

  if (Array.isArray(data.education) && data.education.length) {
    section('Education');
    data.education.forEach((edu) => {
      doc.fontSize(12).fillColor('#111').text(edu.institution || '');
      doc.fontSize(11).fillColor('#555').text([edu.degree, edu.years].filter(Boolean).join(' • '));
      if (edu.summary) doc.fontSize(11).fillColor('#333').text(edu.summary);
      doc.moveDown(0.5);
    });
  }

  if (Array.isArray(data.experience) && data.experience.length) {
    section('Experience');
    data.experience.forEach((exp) => {
      doc.fontSize(12).fillColor('#111').text(exp.role || '');
      doc.fontSize(11).fillColor('#555').text([exp.company, exp.duration].filter(Boolean).join(' • '));
      if (exp.summary) doc.fontSize(11).fillColor('#333').text(exp.summary);
      doc.moveDown(0.5);
    });
  }

  if (Array.isArray(data.projects) && data.projects.length) {
    section('Projects');
    data.projects.forEach((proj) => {
      doc.fontSize(12).fillColor('#111').text(proj.name || '');
      doc.fontSize(11).fillColor('#555').text(proj.link || '');
      if (proj.summary) doc.fontSize(11).fillColor('#333').text(proj.summary);
      doc.moveDown(0.5);
    });
  }

  if (data.skills) {
    section('Skills');
    doc.fontSize(11).fillColor('#333').text(data.skills);
  }

  doc.end();
});

module.exports = {
  getMyResume,
  upsertMyResume,
  exportMyResumePdf,
};
