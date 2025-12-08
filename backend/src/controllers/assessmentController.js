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
const Syllabus = require('../models/Syllabus');
const AssessmentQuestion = require('../models/AssessmentQuestion');
const AssessmentJob = require('../models/AssessmentJob');
const { generateAssessmentSetForCourse } = require('../services/assessmentGenerator');

const QUESTION_POOL_TARGET = 500;
const QUESTION_POOL_BATCH_SIZE = 40;
const PER_ATTEMPT_COUNT = 10;
const toArray = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);

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

const normalizeSyllabusModules = (syllabus = {}) => {
  const modules = Array.isArray(syllabus?.modules) ? syllabus.modules : [];
  return modules.map((module, moduleIndex) => {
    const weeks = Array.isArray(module?.weeks) ? module.weeks : [];
    const weeklyStructure = weeks.map((week, weekIndex) => {
      const lectures = toArray(week?.lectures).map((lecture, lectureIndex) => {
        const topics = toArray(lecture?.topics)
          .map((topic) => normalizeString(topic))
          .filter(Boolean);
        return {
          title: lecture?.title || lecture?.name || `Lecture ${lecture?.lecture || lectureIndex + 1}`,
          summary: topics.join('; '),
          topics,
        };
      });
      const flattenedTopics = lectures.flatMap((lec) => lec.topics || []);
      const summaryParts = [];
      if (flattenedTopics.length) {
        summaryParts.push(`Topics: ${flattenedTopics.join(', ')}`);
      }
      if (week?.summary) {
        summaryParts.push(normalizeString(week.summary));
      }
      return {
        week: parsePositiveInt(week?.week) || weekIndex + 1,
        title: week?.title || `Week ${week?.week || weekIndex + 1}`,
        subtitle: week?.subtitle || '',
        summary: summaryParts.join(' | '),
        lectures,
      };
    });

    return {
      moduleIndex: moduleIndex + 1,
      title: module?.module || module?.title || `Module ${moduleIndex + 1}`,
      summary: normalizeString(module?.summary || ''),
      weeklyStructure,
    };
  });
};

const buildCourseDetailFromSyllabus = (syllabusDoc = null) => {
  if (!syllabusDoc?.syllabus) return null;
  const modules = normalizeSyllabusModules(syllabusDoc.syllabus);
  return { modules };
};

const mergeQuestionPools = (existing = [], incoming = []) => {
  const seen = new Set();
  const merged = [];
  existing.forEach((q) => {
    if (!q?.prompt) return;
    const key = q.prompt.trim().toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(q);
  });
  incoming.forEach((q) => {
    if (!q?.prompt) return;
    const key = q.prompt.trim().toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(q);
  });
  return merged;
};

const ensureUniqueQuestionId = (baseId, suffixSeed = '') => {
  const safeBase = normalizeString(baseId) || 'q';
  return `${safeBase}-${Date.now()}-${Math.random().toString(16).slice(2, 6)}${suffixSeed}`;
};

const pickGenerationTasks = (courseDetail = null, syllabusDetail = null, moduleIndex = null, weekIndex = null) => {
  const detailModules = Array.isArray(courseDetail?.modules) ? courseDetail.modules : [];
  const syllabusModules = Array.isArray(syllabusDetail?.modules) ? syllabusDetail.modules : [];

  const pickModule = (idx) => syllabusModules[idx] || detailModules[idx] || null;
  const tasks = [];

  if (moduleIndex) {
    const moduleIdx = moduleIndex - 1;
    const module = pickModule(moduleIdx);
    if (!module) return [];
    if (weekIndex) {
      const weekIdx = weekIndex - 1;
      const week = Array.isArray(module.weeklyStructure) ? module.weeklyStructure[weekIdx] : null;
      if (!week) return [];
      tasks.push({ moduleIndex, weekIndex, module, week });
    } else {
      const weeks = Array.isArray(module.weeklyStructure) ? module.weeklyStructure : [];
      weeks.forEach((week, idx) => {
        tasks.push({ moduleIndex, weekIndex: idx + 1, module, week });
      });
    }
    return tasks;
  }

  // whole course: all modules/weeks from syllabus first, else detail
  const sourceModules = syllabusModules.length ? syllabusModules : detailModules;
  sourceModules.forEach((module, mIdx) => {
    const weeks = Array.isArray(module.weeklyStructure) ? module.weeklyStructure : [];
    weeks.forEach((week, wIdx) => {
      tasks.push({ moduleIndex: mIdx + 1, weekIndex: wIdx + 1, module, week });
    });
  });
  return tasks;
};

const buildQuestionPool = async ({ course, courseDetail, targetQuestionCount, desiredLevel }) => {
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
      desiredLevel,
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
  const desiredLevelRaw = normalizeString(req.body?.level || req.query?.level || '');
  const desiredLevel =
    desiredLevelRaw && ['beginner', 'intermediate', 'advanced'].includes(desiredLevelRaw.toLowerCase())
      ? desiredLevelRaw
      : '';
  if (weekIndex && !moduleIndex) {
    res.status(400);
    throw new Error('Week assessments must include a moduleIndex.');
  }

  const courseDetail = await CourseDetail.findOne({ courseSlug: course.slug }).lean();
  const syllabusDoc = await Syllabus.findOne({ courseSlug: course.slug }).lean();
  const syllabusDetail = buildCourseDetailFromSyllabus(syllabusDoc);
  const questionCountInput = parsePositiveInt(req.body?.questionCount ?? req.query?.questionCount);
  const targetQuestionCount = Math.min(
    questionCountInput || (weekIndex ? QUESTION_POOL_TARGET : 50),
    QUESTION_POOL_TARGET
  );

  const job = await AssessmentJob.create({
    courseId: course._id,
    courseSlug: course.slug,
    programmeSlug: normalizeSlug(course.programmeSlug || course.programme).replace(/\s+/g, '-'),
    courseName: course.name,
    moduleIndex: moduleIndex || null,
    weekIndex: weekIndex || null,
    variant: moduleIndex ? (weekIndex ? `module-${moduleIndex}-week-${weekIndex}` : `module-${moduleIndex}`) : 'course-default',
    level: desiredLevel,
    totalTarget: 0,
    completed: 0,
    status: 'pending',
  });

  const tasks = pickGenerationTasks(courseDetail, syllabusDetail, moduleIndex, weekIndex);
  if (!tasks.length) {
    await AssessmentJob.findByIdAndUpdate(job._id, { status: 'failed', error: 'No modules/weeks found to generate.' });
    res.status(400);
    throw new Error('No modules/weeks found to generate.');
  }

  job.totalTarget = tasks.length * targetQuestionCount;
  job.status = 'running';
  job.startedAt = new Date();
  await job.save();

  setImmediate(async () => {
    try {
      let completed = 0;
      for (const task of tasks) {
        const jobState = await AssessmentJob.findById(job._id).lean();
        if (!jobState || jobState.status === 'cancelled') {
          break;
        }
        const variant = `module-${task.moduleIndex}-week-${task.weekIndex}`;
        const moduleTitle = task.module?.title || `Module ${task.moduleIndex}`;
        const weekTitle = task.week?.title || `Week ${task.weekIndex}`;
        const defaultTitle = `${course.name} - ${moduleTitle} - ${weekTitle}`;
        const scopedCourseDetail = { modules: [{ ...task.module, weeklyStructure: [task.week] }] };
        let existingSet = await AssessmentSet.findOne({ courseSlug: course.slug, variant }).lean();

        let generatedForTask = 0;
        while (generatedForTask < targetQuestionCount) {
          const currentJob = await AssessmentJob.findById(job._id).lean();
          if (!currentJob || currentJob.status === 'cancelled') {
            break;
          }
          const batchSize = Math.min(5, targetQuestionCount - generatedForTask); // generate in small batches for speed
          let pool = null;
          let lastErr = null;
          for (let attempt = 0; attempt < 3; attempt += 1) {
            try {
              pool = await buildQuestionPool({
                course,
                courseDetail: scopedCourseDetail,
                targetQuestionCount: batchSize,
                desiredLevel,
              });
              lastErr = null;
              break;
            } catch (err) {
              lastErr = err;
              await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
            }
          }
          if (!pool && lastErr) {
            await AssessmentJob.findByIdAndUpdate(job._id, {
              status: 'failed',
              error: lastErr?.message || 'Generation failed after retries.',
              finishedAt: new Date(),
            });
            return;
          }
          const { meta, questions, usage, model } = pool;
          const merged = mergeQuestionPools(existingSet?.questions || [], questions);

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
                level: desiredLevel || meta.level,
                summary: meta.summary,
                tags: meta.tags,
                questions: merged,
                questionPoolSize: merged.length,
                perAttemptCount: PER_ATTEMPT_COUNT,
                source: 'ai',
                variant,
                moduleIndex: task.moduleIndex || null,
                weekIndex: task.weekIndex || null,
                moduleTitle,
                weekTitle,
                model: model || '',
                ...(usageMeta ? { usage: usageMeta } : {}),
                generatedAt: new Date(),
                initialQuestionCount: merged.length,
              },
            },
            { new: true, upsert: true, setDefaultsOnInsert: true }
          ).lean();

          const questionDocs = questions.map((q, idx) => ({
            courseId: course._id,
            courseSlug: course.slug,
            programmeSlug: normalizeSlug(course.programmeSlug || course.programme).replace(/\s+/g, '-'),
            moduleIndex: task.moduleIndex || null,
            weekIndex: task.weekIndex || null,
            variant,
            assessmentId: saved?._id,
            // Always force a unique id to avoid duplicate-key errors
            questionId: ensureUniqueQuestionId(`q-${Date.now()}-${idx}-${Math.random().toString(16).slice(2, 6)}`),
            prompt: q.prompt,
            options: Array.isArray(q.options) ? q.options : [],
            correctOptionId: q.correctOptionId,
            explanation: q.explanation || '',
            source: 'ai',
          }));
          try {
            await AssessmentQuestion.insertMany(questionDocs, { ordered: false });
          } catch (err) {
            if (err?.code !== 11000) {
              throw err;
            }
            // Ignore duplicate key errors; continue generation.
          }

          generatedForTask += questions.length;
          completed += questions.length;
          await AssessmentJob.findByIdAndUpdate(job._id, {
            completed,
            status: 'running',
            error: '',
          });

          existingSet = saved;
        }
      }
      const finalJob = await AssessmentJob.findById(job._id).lean();
      if (finalJob?.status === 'cancelled') {
        return;
      }
      await AssessmentJob.findByIdAndUpdate(job._id, {
        status: 'completed',
        finishedAt: new Date(),
      });
    } catch (err) {
      await AssessmentJob.findByIdAndUpdate(job._id, {
        status: 'failed',
        error: err?.message || 'Generation failed.',
      });
    }
  });

  res.status(202).json({
    jobId: job._id.toString(),
    status: job.status,
    totalTarget: job.totalTarget,
    completed: job.completed,
  });
});

const generateAssessmentsFromSyllabus = asyncHandler(async (req, res) => {
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

  const syllabus = req.body?.syllabus;
  if (!syllabus) {
    res.status(400);
    throw new Error('Syllabus JSON is required.');
  }

  await Syllabus.findOneAndUpdate(
    { courseSlug: course.slug },
    {
      $set: {
        courseId: course._id,
        courseSlug: course.slug,
        programmeSlug: normalizeSlug(course.programmeSlug || course.programme).replace(/\s+/g, '-'),
        courseName: course.name,
        syllabus,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  res.status(201).json({
    message: 'Syllabus saved for course. Use Generate to create assessments.',
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
        id: q._id ? q._id.toString() : q.questionId,
        questionId: q.questionId,
        prompt: q.prompt,
        options: Array.isArray(q.options) ? q.options : [],
        selectedOptionId: status === 'submitted' ? (q.selectedOptionId || '') : '',
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

  const findFallbackSet = async () => {
    // exact match
    let target = await AssessmentSet.findOne({ courseSlug: course.slug, moduleIndex, weekIndex }).lean();
    if (target) return target;
    // module-level fallback
    if (moduleIndex && !weekIndex) {
      target = await AssessmentSet.findOne({ courseSlug: course.slug, moduleIndex, weekIndex: null }).lean();
      if (target) return target;
    }
    // course-level fallback
    target = await AssessmentSet.findOne({ courseSlug: course.slug, moduleIndex: null, weekIndex: null }).lean();
    return target;
  };

  // Check for an active attempt to resume
  let activeAttempt = await AssessmentAttempt.findOne({
    userId: req.user._id,
    courseSlug: course.slug,
    moduleIndex,
    weekIndex,
    status: 'in-progress'
  }).lean();

  if (activeAttempt) {
    return res.json({
      attempt: mapAttemptForResponse(activeAttempt, { includeCorrect: false }),
    });
  }

  // No active attempt -> Create a NEW one with questions removed from the GLOBAL POOL
  // 1. Find the Set (without lean, we might need to update it, but better to use updateOne for atomicity)
  const set = await findFallbackSet();
  
  if (!set || !Array.isArray(set.questions) || set.questions.length === 0) {
     // Re-check: If questions are empty, user sees "Not Uploaded"
     return res.status(400).json({
      error: 'Assessments has not been uploaded soon it will be uploaded',
      code: 'POOL_EXHAUSTED'
    });
  }

  // 2. Check if we have enough questions
  const perAttemptCount = Number(set.perAttemptCount) || 10;
  
  // If we have fewer than 10, should we use them all?
  // Requirement: "once any 10... decreasing... after all questions finished... show not uploaded"
  // This implies we consume what is there.
  
  // 3. Select Questions (Shuffle and Pick)
  // We pick from the currently available set.questions
  const selectedQuestions = pickQuestionsForAttempt(set.questions, perAttemptCount);
  const selectedIds = selectedQuestions.map(q => q.id);

  // 4. GLOBAL DEPLETION: Permanently remove these questions from the AssessmentSet
  // This ensures they are "used" and the count in Admin decreases
  await AssessmentSet.updateOne(
    { _id: set._id },
    { $pull: { questions: { id: { $in: selectedIds } } } }
  );

  // 5. Create New Attempt
  const attemptsCount = await AssessmentAttempt.countDocuments({
    userId: req.user._id,
    courseSlug: course.slug,
    moduleIndex,
    weekIndex
  });

  const attempt = await AssessmentAttempt.create({
    userId: req.user._id,
    courseId: course._id,
    courseSlug: course.slug,
    programmeSlug: course.programmeSlug || course.programme || '',
    courseName: course.name,
    moduleIndex,
    weekIndex,
    moduleTitle: set.moduleTitle,
    weekTitle: set.weekTitle,
    title: `${set.title} (Attempt ${attemptsCount + 1})`,
    status: 'in-progress',
    questions: selectedQuestions,
    questionPoolSize: set.questions.length - selectedQuestions.length, // Remaining pool size
    perAttemptCount,
    totalQuestions: selectedQuestions.length,
    startedAt: new Date(),
  });//end of creation

  res.json({
    attempt: mapAttemptForResponse(attempt.toObject(), { includeCorrect: false }),
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
    const lookupId = baseQuestion._id ? baseQuestion._id.toString() : String(baseQuestion.questionId);
    
    const selectedOptionId = answerMap.has(lookupId)
      ? answerMap.get(lookupId) || ''
      : '';
    const isCorrect = !!(selectedOptionId && selectedOptionId === baseQuestion.correctOptionId);
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

const deleteAssessmentSet = asyncHandler(async (req, res) => {
  const assessmentId = req.params?.assessmentId;
  if (!assessmentId) {
    res.status(400);
    throw new Error('Assessment identifier is required.');
  }
  const assessment = await AssessmentSet.findById(assessmentId);
  if (!assessment) {
    res.status(404);
    throw new Error('Assessment not found.');
  }
  await AssessmentQuestion.deleteMany({ assessmentId });
  await assessment.deleteOne();
  res.json({ message: 'Assessment set deleted.' });
});

const getAssessmentJobStatus = asyncHandler(async (req, res) => {
  const slug = resolveCourseSlug(req);
  if (!slug) {
    res.status(400);
    throw new Error('Course identifier is required.');
  }
  const moduleIndex = parsePositiveInt(req.query?.moduleIndex);
  const weekIndex = parsePositiveInt(req.query?.weekIndex);
  const filter = { courseSlug: slug };
  if (moduleIndex) filter.moduleIndex = moduleIndex;
  if (weekIndex) filter.weekIndex = weekIndex;
  const jobs = await AssessmentJob.find(filter).sort({ updatedAt: -1 }).limit(1).lean();
  if (!jobs || !jobs.length) {
    return res.json({ job: null });
  }
  let job = jobs[0];

  // Auto-heal: mark completed if counts match, or fail stale running jobs
  const now = Date.now();
  const updatedAt = job.updatedAt ? new Date(job.updatedAt).getTime() : now;
  const isStaleRunning = job.status === 'running' && now - updatedAt > 10 * 60 * 1000; // 10 minutes
  const isDone = job.totalTarget && job.completed >= job.totalTarget;

  if (isDone && job.status !== 'completed') {
    job = await AssessmentJob.findByIdAndUpdate(
      job._id,
      { status: 'completed', finishedAt: new Date() },
      { new: true }
    ).lean();
  } else if (isStaleRunning) {
    job = await AssessmentJob.findByIdAndUpdate(
      job._id,
      { status: 'failed', error: 'Job stalled; auto-marked as failed.' },
      { new: true }
    ).lean();
  }

  res.json({
    job: {
      id: job._id?.toString() || '',
      status: job.status,
      totalTarget: job.totalTarget || 0,
      completed: job.completed || 0,
      error: job.error || '',
      moduleIndex: job.moduleIndex || null,
      weekIndex: job.weekIndex || null,
      level: job.level || '',
      startedAt: job.startedAt || job.createdAt || null,
      finishedAt: job.finishedAt || null,
      variant: job.variant || '',
    },
  });
});

const cancelAssessmentJob = asyncHandler(async (req, res) => {
  const slug = resolveCourseSlug(req);
  if (!slug) {
    res.status(400);
    throw new Error('Course identifier is required.');
  }
  const moduleIndex = parsePositiveInt(req.body?.moduleIndex ?? req.query?.moduleIndex);
  const weekIndex = parsePositiveInt(req.body?.weekIndex ?? req.query?.weekIndex);
  const filter = { courseSlug: slug, status: { $in: ['pending', 'running'] } };
  if (moduleIndex) filter.moduleIndex = moduleIndex;
  if (weekIndex) filter.weekIndex = weekIndex;
  const job = await AssessmentJob.findOneAndUpdate(
    filter,
    { $set: { status: 'cancelled', error: 'Cancelled by user', finishedAt: new Date() } },
    { new: true }
  ).lean();
  if (!job) {
    res.status(404);
    throw new Error('No running job found to cancel.');
  }
  res.json({
    job: {
      id: job._id?.toString() || '',
      status: job.status,
      completed: job.completed || 0,
      totalTarget: job.totalTarget || 0,
    },
  });
});

module.exports = {
  getCourseAssessments,
  listAssessmentsAdmin,
  generateCourseAssessments,
  generateAssessmentsFromSyllabus,
  startAssessmentAttempt,
  submitAssessmentAttempt,
  deleteAssessmentSet,
  getAssessmentJobStatus,
  cancelAssessmentJob,
};
