/*
  Assessment controller
  - Generates AI-backed assessments per course
  - Lists assessments for admin and public course pages
*/
const asyncHandler = require('express-async-handler');
const AssessmentSet = require('../models/AssessmentSet');
const Course = require('../models/Course');
const CourseDetail = require('../models/CourseDetail');
const { generateAssessmentSetForCourse } = require('../services/assessmentGenerator');

const normalizeString = (value) => (typeof value === 'string' ? value.trim() : '');
const normalizeSlug = (value) => normalizeString(value).toLowerCase();

const resolveCourseSlug = (req) => {
  const paramSlug =
    normalizeSlug(req.params?.courseSlug || req.params?.slug || req.query?.courseSlug || req.body?.courseSlug);
  const programmeSlug = normalizeSlug(req.params?.programmeSlug || req.query?.programmeSlug || req.body?.programmeSlug);

  if (programmeSlug && paramSlug && !paramSlug.includes('/')) {
    return `${programmeSlug}/${paramSlug}`;
  }
  return paramSlug || programmeSlug;
};

const mapAssessmentSet = (doc) => {
  if (!doc) {
    return null;
  }
  const questions = Array.isArray(doc.questions) ? doc.questions : [];
  return {
    id: doc._id ? doc._id.toString() : '',
    courseSlug: doc.courseSlug || '',
    programmeSlug: doc.programmeSlug || '',
    courseName: doc.courseName || '',
    moduleIndex: doc.moduleIndex || null,
    weekIndex: doc.weekIndex || null,
    moduleTitle: doc.moduleTitle || '',
    weekTitle: doc.weekTitle || '',
    title: doc.title || '',
    level: doc.level || '',
    summary: doc.summary || '',
    tags: Array.isArray(doc.tags) ? doc.tags : [],
    questions: questions.map((question) => ({
      id: question.id,
      prompt: question.prompt,
      options: Array.isArray(question.options)
        ? question.options.map((option) => ({
            id: option.id,
            label: option.label,
          }))
        : [],
      correctOptionId: question.correctOptionId,
      explanation: question.explanation || '',
      tryItTemplate: question.tryItTemplate || '',
    })),
    source: doc.source || 'ai',
    variant: doc.variant || 'course-default',
    generatedAt: doc.generatedAt || doc.updatedAt || null,
    model: doc.model || '',
    usage: doc.usage || null,
  };
};

const getCourseAssessments = asyncHandler(async (req, res) => {
  const slug = resolveCourseSlug(req);
  if (!slug) {
    res.status(400);
    throw new Error('Course identifier is required.');
  }

  const course = await Course.findOne({ slug }).select(['_id', 'slug', 'programme', 'programmeSlug', 'name']).lean();
  if (!course) {
    res.status(404);
    throw new Error('Course not found.');
  }

  const moduleIndex = Number(req.query?.moduleIndex);
  const weekIndex = Number(req.query?.weekIndex);
  const filter = { courseSlug: course.slug };
  if (Number.isFinite(moduleIndex) && moduleIndex > 0) {
    filter.moduleIndex = moduleIndex;
  }
  if (Number.isFinite(weekIndex) && weekIndex > 0) {
    filter.weekIndex = weekIndex;
  }

  const assessments = await AssessmentSet.find(filter).sort({ updatedAt: -1 }).lean();
  res.json({
    items: assessments.map(mapAssessmentSet).filter(Boolean),
  });
});

const listAssessmentsAdmin = asyncHandler(async (req, res) => {
  const slug = resolveCourseSlug(req);
  const filter = slug ? { courseSlug: slug } : {};
  const assessments = await AssessmentSet.find(filter).sort({ updatedAt: -1 }).lean();
  res.json({
    items: assessments.map(mapAssessmentSet).filter(Boolean),
  });
});

const parsePositiveInt = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    return null;
  }
  return Math.floor(n);
};

const generateCourseAssessments = asyncHandler(async (req, res) => {
  const slug = resolveCourseSlug(req);
  if (!slug) {
    res.status(400);
    throw new Error('Course identifier is required to generate assessments.');
  }

  const course = await Course.findOne({ slug });
  if (!course) {
    res.status(404);
    throw new Error('Course not found.');
  }

  const moduleIndex = parsePositiveInt(req.body?.moduleIndex ?? req.query?.moduleIndex);
  const weekIndex = parsePositiveInt(req.body?.weekIndex ?? req.query?.weekIndex);
  if (weekIndex && !moduleIndex) {
    res.status(400);
    throw new Error('Week assessments must include a moduleIndex.');
  }

  const courseDetail = await CourseDetail.findOne({ courseSlug: course.slug }).lean();
  const questionCountInput = Number(req.body?.questionCount);
  let scopedCourseDetail = courseDetail;
  let variant = 'course-default';
  let defaultTitle = course.name;
  let moduleTitle = '';
  let weekTitle = '';

  if (moduleIndex) {
    const moduleIdx = moduleIndex - 1;
    const modules = Array.isArray(courseDetail?.modules) ? courseDetail.modules : [];
    const targetModule = modules[moduleIdx];
    if (!targetModule) {
      res.status(400);
      throw new Error(`Module ${moduleIndex} not found for this course.`);
    }
    moduleTitle = targetModule.title || `Module ${moduleIndex}`;
    variant = `module-${moduleIndex}`;
    defaultTitle = `${course.name} - ${moduleTitle}`;
    if (weekIndex) {
      const weekIdx = weekIndex - 1;
      const week = Array.isArray(targetModule.weeklyStructure) ? targetModule.weeklyStructure[weekIdx] : null;
      if (!week) {
        res.status(400);
        throw new Error(`Week ${weekIndex} not found for module ${moduleIndex}.`);
      }
      weekTitle = week.title || `Week ${weekIndex}`;
      variant = `module-${moduleIndex}-week-${weekIndex}`;
      defaultTitle = `${course.name} - ${moduleTitle} - ${weekTitle}`;
      const trimmedModule = { ...targetModule, weeklyStructure: [week] };
      scopedCourseDetail = { ...(courseDetail || {}), modules: [trimmedModule] };
    } else {
      scopedCourseDetail = { ...(courseDetail || {}), modules: [targetModule] };
    }
  }

  const { assessment, usage, model } = await generateAssessmentSetForCourse({
    course,
    courseDetail: scopedCourseDetail,
    questionCount: Number.isFinite(questionCountInput) ? questionCountInput : undefined,
  });

  const usageMeta = usage
    ? {
        promptTokens: usage.prompt_tokens ?? usage.promptTokens ?? 0,
        completionTokens: usage.completion_tokens ?? usage.completionTokens ?? 0,
        totalTokens: usage.total_tokens ?? usage.totalTokens ?? 0,
      }
    : undefined;

  const saved = await AssessmentSet.findOneAndUpdate(
    { courseSlug: course.slug, variant },
    {
      $set: {
        courseId: course._id,
        courseSlug: course.slug,
        programmeSlug: normalizeSlug(course.programmeSlug || course.programme).replace(/\s+/g, '-'),
        courseName: course.name,
        title: assessment.title || defaultTitle,
        level: assessment.level,
        summary: assessment.summary,
        tags: assessment.tags,
        questions: assessment.questions,
        source: 'ai',
        variant,
        moduleIndex: moduleIndex || null,
        weekIndex: weekIndex || null,
        moduleTitle,
        weekTitle,
        model: model || '',
        ...(usageMeta ? { usage: usageMeta } : {}),
        generatedAt: assessment.generatedAt || new Date(),
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();

  res.status(201).json({
    assessment: mapAssessmentSet(saved),
  });
});

module.exports = {
  getCourseAssessments,
  listAssessmentsAdmin,
  generateCourseAssessments,
};
