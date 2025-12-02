/*
  Assessment controller
  - Generates AI-backed assessments per course
  - Lists assessments for admin and public course pages
*/
const asyncHandler = require('express-async-handler');
const AssessmentSet = require('../models/AssessmentSet');
const AssessmentAttempt = require('../models/AssessmentAttempt');
const Course = require('../models/Course');
const CourseDetail = require('../models/CourseDetail');
const { generateAssessmentSetForCourse } = require('../services/assessmentGenerator');

const QUESTION_POOL_TARGET = 500;
const QUESTION_POOL_BATCH_SIZE = 40;
const PER_ATTEMPT_COUNT = 10;

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

const shuffleArray = (input = []) => {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const mergeUsageTotals = (target = null, usage = null) => {
  if (!usage) {
    return target;
  }
  const next = target || { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
  return {
    promptTokens: next.promptTokens + (usage.prompt_tokens ?? usage.promptTokens ?? 0),
    completionTokens: next.completionTokens + (usage.completion_tokens ?? usage.completionTokens ?? 0),
    totalTokens: next.totalTokens + (usage.total_tokens ?? usage.totalTokens ?? 0),
  };
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
    questionPoolSize: Number.isFinite(doc.questionPoolSize) ? doc.questionPoolSize : questions.length,
    perAttemptCount: doc.perAttemptCount || 10,
    questionCount: questions.length,
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

const buildQuestionPool = async ({ course, courseDetail, targetQuestionCount }) => {
  const target = Math.min(targetQuestionCount || QUESTION_POOL_TARGET, QUESTION_POOL_TARGET);
  const seenPrompts = new Set();
  const collected = [];
  let meta = null;
  let usageTotals = null;
  let model = '';

  const maxIterations = Math.max(3, Math.ceil(target / QUESTION_POOL_BATCH_SIZE) + 1);

  for (let round = 0; collected.length < target && round < maxIterations; round += 1) {
    const remaining = target - collected.length;
    const batchSize = Math.min(QUESTION_POOL_BATCH_SIZE, remaining);
    const { assessment, usage, model: currentModel } = await generateAssessmentSetForCourse({
      course,
      courseDetail,
      questionCount: batchSize,
    });

    if (!meta) {
      meta = {
        title: assessment.title,
        level: assessment.level,
        summary: assessment.summary,
        tags: assessment.tags,
      };
    }

    usageTotals = mergeUsageTotals(usageTotals, usage);
    if (!model && currentModel) {
      model = currentModel;
    }

    const questions = Array.isArray(assessment?.questions) ? assessment.questions : [];
    questions.forEach((question) => {
      if (!question || !question.prompt) {
        return;
      }
      const promptKey = question.prompt.trim();
      if (seenPrompts.has(promptKey)) {
        return;
      }
      seenPrompts.add(promptKey);
      collected.push(question);
    });

    if (!questions.length) {
      break;
    }
  }

  if (!collected.length) {
    throw new Error('Assessment generation did not produce any questions.');
  }

  return {
    meta: meta || { title: course?.name || 'Assessment', level: '', summary: '', tags: [] },
    questions: collected.slice(0, target),
    usage: usageTotals,
    model,
  };
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
  const questionCountInput = parsePositiveInt(req.body?.questionCount ?? req.query?.questionCount);
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

  const targetQuestionCount = Math.min(
    questionCountInput || (weekIndex ? QUESTION_POOL_TARGET : 50),
    QUESTION_POOL_TARGET
  );

  const pool = await buildQuestionPool({
    course,
    courseDetail: scopedCourseDetail,
    targetQuestionCount,
  });
  const { meta, questions, usage, model } = pool;

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
        title: meta.title || defaultTitle,
        level: meta.level,
        summary: meta.summary,
        tags: meta.tags,
        questions,
        questionPoolSize: questions.length,
        perAttemptCount: PER_ATTEMPT_COUNT,
        source: 'ai',
        variant,
        moduleIndex: moduleIndex || null,
        weekIndex: weekIndex || null,
        moduleTitle,
        weekTitle,
        model: model || '',
        ...(usageMeta ? { usage: usageMeta } : {}),
        generatedAt: new Date(),
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();

  res.status(201).json({
    assessment: mapAssessmentSet(saved),
  });
});

const pickQuestionsForAttempt = (questions = [], count = PER_ATTEMPT_COUNT) => {
  if (!Array.isArray(questions) || !questions.length) {
    return [];
  }
  const shuffledPool = shuffleArray(questions);
  const picked = shuffledPool.slice(0, Math.min(count, shuffledPool.length));
  return picked.map((question) => ({
    questionId: question.id || question.questionId || question.prompt || `q-${Math.random().toString(16).slice(2)}`,
    prompt: question.prompt,
    options: shuffleArray(Array.isArray(question.options) ? question.options : []),
    correctOptionId: question.correctOptionId,
    selectedOptionId: '',
    isCorrect: null,
  }));
};

const mapAttemptForResponse = (attempt, { includeCorrect = false } = {}) => {
  if (!attempt) {
    return null;
  }
  const status = attempt.status || 'in-progress';
  const questions = Array.isArray(attempt.questions) ? attempt.questions : [];
  const showCorrect = includeCorrect || status === 'submitted';
  return {
    id: attempt._id ? attempt._id.toString() : '',
    courseSlug: attempt.courseSlug || '',
    programmeSlug: attempt.programmeSlug || '',
    courseName: attempt.courseName || '',
    moduleIndex: attempt.moduleIndex || null,
    weekIndex: attempt.weekIndex || null,
    moduleTitle: attempt.moduleTitle || '',
    weekTitle: attempt.weekTitle || '',
    status,
    score: attempt.score || 0,
    totalQuestions: attempt.totalQuestions || questions.length,
    questionPoolSize: attempt.questionPoolSize || 0,
    perAttemptCount: attempt.perAttemptCount || PER_ATTEMPT_COUNT,
    submittedAt: attempt.submittedAt || null,
    startedAt: attempt.startedAt || attempt.createdAt || null,
    questions: questions.map((q) => {
      const mapped = {
        id: q.questionId,
        prompt: q.prompt,
        options: Array.isArray(q.options) ? q.options : [],
        selectedOptionId: q.selectedOptionId || '',
      };
      if (showCorrect) {
        mapped.correctOptionId = q.correctOptionId;
        mapped.isCorrect = typeof q.isCorrect === 'boolean' ? q.isCorrect : q.selectedOptionId === q.correctOptionId;
      }
      return mapped;
    }),
  };
};

const startAssessmentAttempt = asyncHandler(async (req, res) => {
  if (!req.user?._id) {
    res.status(401);
    throw new Error('Sign in to access assessments.');
  }

  const slug = resolveCourseSlug(req);
  if (!slug) {
    res.status(400);
    throw new Error('Course identifier is required.');
  }

  const moduleIndex = parsePositiveInt(req.body?.moduleIndex ?? req.query?.moduleIndex);
  const weekIndex = parsePositiveInt(req.body?.weekIndex ?? req.query?.weekIndex);
  if (!moduleIndex || !weekIndex) {
    res.status(400);
    throw new Error('moduleIndex and weekIndex are required to start an assessment.');
  }

  const course = await Course.findOne({ slug }).select(['_id', 'slug', 'programmeSlug', 'programme', 'name']).lean();
  if (!course) {
    res.status(404);
    throw new Error('Course not found.');
  }

  const set = await AssessmentSet.findOne({ courseSlug: course.slug, moduleIndex, weekIndex }).lean();
  if (!set || !Array.isArray(set.questions) || !set.questions.length) {
    res.status(404);
    throw new Error('Assessment set not found for this module/week.');
  }

  const perAttemptCount = Number(set.perAttemptCount) || PER_ATTEMPT_COUNT;
  let attempt = await AssessmentAttempt.findOne({
    userId: req.user._id,
    courseSlug: course.slug,
    moduleIndex,
    weekIndex,
  }).lean();

  if (!attempt) {
    const attemptQuestions = pickQuestionsForAttempt(set.questions, perAttemptCount);
    attempt = await AssessmentAttempt.create({
      userId: req.user._id,
      courseId: course._id,
      courseSlug: course.slug,
      programmeSlug: course.programmeSlug || course.programme || '',
      courseName: course.name,
      moduleIndex,
      weekIndex,
      moduleTitle: set.moduleTitle || `Module ${moduleIndex}`,
      weekTitle: set.weekTitle || `Week ${weekIndex}`,
      status: 'in-progress',
      questions: attemptQuestions,
      questionPoolSize: set.questionPoolSize || set.questions.length,
      perAttemptCount,
      score: 0,
      totalQuestions: attemptQuestions.length,
      startedAt: new Date(),
    });

    attempt = attempt.toObject();
  }

  res.json({
    attempt: mapAttemptForResponse(attempt, { includeCorrect: attempt.status === 'submitted' }),
  });
});

const submitAssessmentAttempt = asyncHandler(async (req, res) => {
  if (!req.user?._id) {
    res.status(401);
    throw new Error('Sign in to submit assessments.');
  }

  const attemptId = req.params?.attemptId || req.body?.attemptId;
  if (!attemptId) {
    res.status(400);
    throw new Error('Attempt identifier is required.');
  }

  const attempt = await AssessmentAttempt.findById(attemptId);
  if (!attempt) {
    res.status(404);
    throw new Error('Assessment attempt not found.');
  }

  if (String(attempt.userId) !== String(req.user._id)) {
    res.status(403);
    throw new Error('You cannot submit an attempt you do not own.');
  }

  if (attempt.status === 'submitted') {
    return res.json({
      attempt: mapAttemptForResponse(attempt.toObject(), { includeCorrect: true }),
    });
  }

  const answers = Array.isArray(req.body?.answers) ? req.body.answers : [];
  const answerMap = new Map();
  answers.forEach((answer) => {
    if (!answer || !answer.questionId) {
      return;
    }
    answerMap.set(String(answer.questionId), answer.selectedOptionId || '');
  });

  let correctCount = 0;
  attempt.questions = attempt.questions.map((question) => {
    const baseQuestion = typeof question.toObject === 'function' ? question.toObject() : question;
    const selectedOptionId = answerMap.get(String(question.questionId)) || '';
    const isCorrect = selectedOptionId && selectedOptionId === baseQuestion.correctOptionId;
    if (isCorrect) {
      correctCount += 1;
    }
    return {
      ...baseQuestion,
      selectedOptionId,
      isCorrect,
    };
  });

  attempt.score = correctCount;
  attempt.totalQuestions = attempt.questions.length;
  attempt.status = 'submitted';
  attempt.submittedAt = new Date();

  await attempt.save();

  res.json({
    attempt: mapAttemptForResponse(attempt.toObject(), { includeCorrect: true }),
  });
});

module.exports = {
  getCourseAssessments,
  listAssessmentsAdmin,
  generateCourseAssessments,
  startAssessmentAttempt,
  submitAssessmentAttempt,
};
