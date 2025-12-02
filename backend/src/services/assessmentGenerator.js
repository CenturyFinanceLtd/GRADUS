const fetch = require('node-fetch');

const MAX_QUESTION_COUNT = 500;
const normalizeString = (value) => (typeof value === 'string' ? value.trim() : '');
const toArray = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);

const slugify = (value, fallback) => {
  const normalized = normalizeString(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
  if (normalized) {
    return normalized;
  }
  return fallback ? String(fallback) : '';
};

const truncate = (value, maxLength = 3600) => {
  if (!value) {
    return '';
  }
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength).trim()}...`;
};

const formatList = (items, label) => {
  const list = toArray(items)
    .map((item) => normalizeString(item))
    .filter(Boolean);
  if (!list.length) {
    return '';
  }
  return `${label}: ${list.join(', ')}`;
};

const summarizeModules = (modules = []) => {
  const moduleSummaries = [];
  modules.forEach((module, moduleIndex) => {
    const lines = [];
    if (module?.title) {
      const moduleLabel = module.weeksLabel ? `${module.title} (${module.weeksLabel})` : module.title;
      lines.push(`Module ${moduleIndex + 1}: ${moduleLabel}`);
    }
    if (module?.outcome) {
      lines.push(`Outcome: ${module.outcome}`);
    }
    const topics = formatList(module?.topics, 'Topics');
    if (topics) {
      lines.push(topics);
    }
    if (Array.isArray(module?.weeklyStructure) && module.weeklyStructure.length) {
      module.weeklyStructure.forEach((week, weekIndex) => {
        const weekParts = [];
        if (week?.title || week?.subtitle) {
          weekParts.push(`Week ${weekIndex + 1}: ${[week.title, week.subtitle].filter(Boolean).join(' - ')}`);
        }
        if (week?.summary) {
          weekParts.push(`Summary: ${week.summary}`);
        }
        const lectureTitles = toArray(week?.lectures)
          .map((lecture) => normalizeString(lecture?.title || lecture))
          .filter(Boolean);
        if (lectureTitles.length) {
          weekParts.push(`Lectures: ${lectureTitles.slice(0, 4).join(', ')}`);
        }
        const assignments = formatList(week?.assignments, 'Assignments');
        if (assignments) {
          weekParts.push(assignments);
        }
        const projects = formatList(week?.projects, 'Projects');
        if (projects) {
          weekParts.push(projects);
        }
        const quizzes = formatList(week?.quizzes, 'Quizzes');
        if (quizzes) {
          weekParts.push(quizzes);
        }
        if (weekParts.length) {
          lines.push(weekParts.join(' | '));
        }
      });
    }
    if (lines.length) {
      moduleSummaries.push(lines.join('\n'));
    }
  });
  return moduleSummaries.join('\n');
};

const summarizeDetailedModules = (moduleDetails = []) => {
  const summaries = [];
  moduleDetails.forEach((module, moduleIndex) => {
    const lines = [];
    if (module?.title) {
      lines.push(`Deep Module ${moduleIndex + 1}: ${module.title}`);
    }
    if (Array.isArray(module?.sections) && module.sections.length) {
      module.sections.forEach((section, sectionIndex) => {
        const sectionLines = [];
        if (section?.title) {
          sectionLines.push(`Section ${sectionIndex + 1}: ${section.title}`);
        }
        if (section?.summary) {
          sectionLines.push(`Focus: ${section.summary}`);
        }
        const lectureTitles = toArray(section?.lectures)
          .map((lecture) => normalizeString(lecture?.title || lecture))
          .filter(Boolean);
        if (lectureTitles.length) {
          sectionLines.push(`Lectures: ${lectureTitles.slice(0, 4).join(', ')}`);
        }
        const quizTitles = formatList(section?.quizzes, 'Quizzes');
        if (quizTitles) {
          sectionLines.push(quizTitles);
        }
        if (sectionLines.length) {
          lines.push(sectionLines.join(' | '));
        }
      });
    }
    if (lines.length) {
      summaries.push(lines.join('\n'));
    }
  });
  return summaries.join('\n');
};

const buildCourseContext = (course = {}, courseDetail = null) => {
  const parts = [];
  if (course?.name) {
    parts.push(`Course name: ${course.name}`);
  }
  const subtitle = normalizeString(course?.subtitle || course?.focus);
  if (subtitle) {
    parts.push(`Subtitle: ${subtitle}`);
  }
  const level = normalizeString(course?.level);
  if (level) {
    parts.push(`Level: ${level}`);
  }
  const duration = normalizeString(course?.duration || course?.stats?.duration);
  if (duration) {
    parts.push(`Duration: ${duration}`);
  }
  const mode = normalizeString(course?.mode || course?.stats?.mode);
  if (mode) {
    parts.push(`Mode: ${mode}`);
  }
  const outcomeSummary = normalizeString(course?.outcomeSummary);
  if (outcomeSummary) {
    parts.push(`Outcomes: ${outcomeSummary}`);
  }
  const aboutProgram = formatList(course?.aboutProgram, 'About program');
  if (aboutProgram) {
    parts.push(aboutProgram);
  }
  const learn = formatList(course?.learn, 'Students will learn');
  if (learn) {
    parts.push(learn);
  }
  const skills = formatList(course?.skills, 'Skills');
  if (skills) {
    parts.push(skills);
  }
  const modulesSummary = summarizeModules(course?.modules || []);
  if (modulesSummary) {
    parts.push(modulesSummary);
  }
  const deepModulesSummary = summarizeDetailedModules(courseDetail?.modules || []);
  if (deepModulesSummary) {
    parts.push(deepModulesSummary);
  }
  const combined = parts.join('\n').replace(/\n{2,}/g, '\n');
  return truncate(combined, 3200);
};

const concatMessages = (messages = []) =>
  messages
    .filter((msg) => msg && typeof msg.content === 'string')
    .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
    .join('\n\n');

const callOpenAI = async (messages) => {
  const apiKey = process.env.OPENAI_API_KEY;
  // Use highest quality available; override via OPENAI_CHAT_MODEL in .env
  const model = process.env.OPENAI_CHAT_MODEL || 'gpt-4.1';
  const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured for assessment generation.');
  }

  const body = {
    model,
    messages,
    temperature: 0.35,
    response_format: { type: 'json_object' },
  };

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content || !String(content).trim()) {
    throw new Error('Empty response from OpenAI.');
  }
  return {
    content: content || '',
    usage: data?.usage || null,
    model,
  };
};

const callGemini = async (messages) => {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const baseUrl = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta';

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured for assessment generation.');
  }

  const prompt = concatMessages(messages);
  const url = `${baseUrl.replace(/\/$/, '')}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(
    apiKey
  )}`;

  const baseGenerationConfig = {
    temperature: 0.35,
    maxOutputTokens: 4096,
  };

  const jsonGenerationConfig = {
    ...baseGenerationConfig,
    responseMimeType: 'application/json',
    responseSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        level: { type: 'string' },
        summary: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
        questions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              prompt: { type: 'string' },
              options: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    label: { type: 'string' },
                  },
                  required: ['id', 'label'],
                },
              },
              correctOptionId: { type: 'string' },
              explanation: { type: 'string' },
              tryItTemplate: { type: 'string' },
            },
            required: ['id', 'prompt', 'options', 'correctOptionId'],
            additionalProperties: false,
          },
        },
      },
      required: ['title', 'level', 'summary', 'tags', 'questions'],
      additionalProperties: false,
    },
  };

  const supportsJsonMode = /v1beta/i.test(baseUrl);
  const allowThinking = /^true$/i.test(process.env.GEMINI_ENABLE_THINKING || '');
  const supportsThinking = supportsJsonMode && allowThinking;
  const thinkingConfig = supportsThinking
    ? {
        includeThoughts: false,
        maxThoughtTokens: 256,
      }
    : null;

  const makeRequest = (useJsonMode = supportsJsonMode) =>
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: useJsonMode ? jsonGenerationConfig : baseGenerationConfig,
        ...(thinkingConfig ? { thinkingConfig } : {}),
      }),
    });

  let response = await makeRequest();

  if (!response.ok && supportsJsonMode) {
    const errorText = await response.text();
    const schemaFieldMissing =
      response.status === 400 && /responseMimeType|responseSchema/i.test(errorText || '');

    if (!schemaFieldMissing) {
      throw new Error(`Gemini API error: ${response.status} ${errorText}`);
    }

    // Fallback for endpoints (like v1) that do not support structured outputs.
    response = await makeRequest(false);
    if (!response.ok) {
      const fallbackError = await response.text();
      throw new Error(`Gemini API error: ${response.status} ${fallbackError}`);
    }
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const content = parts
    .map((part) => (typeof part?.text === 'string' ? part.text : ''))
    .filter(Boolean)
    .join('\n')
    .trim();

  if (!content) {
    const finishReason = data?.candidates?.[0]?.finishReason || 'UNKNOWN';
    const raw = JSON.stringify(data || {}, null, 2);
    throw new Error(`Empty response from Gemini (finishReason: ${finishReason}). Raw response: ${raw.slice(0, 2000)}`);
  }

  return {
    content: content || '',
    usage: data?.usage || null,
    model,
  };
};

const extractJson = (rawText) => {
  if (!rawText) {
    throw new Error('Empty response from OpenAI.');
  }
  const trimmed = rawText.trim();
  const stripFence = (text) => {
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fenceMatch && fenceMatch[1]) {
      return fenceMatch[1];
    }
    return text;
  };

  const extractBraces = (text) => {
    const first = text.indexOf('{');
    const last = text.lastIndexOf('}');
    if (first !== -1 && last !== -1 && last > first) {
      return text.slice(first, last + 1);
    }
    return text;
  };

  const normalizeSingleQuotes = (text) => {
    // Very light touch: replace single quotes around keys/values with double quotes
    return text.replace(/'([^']*)'/g, '"$1"');
  };

  const candidates = [];
  const base = stripFence(trimmed);
  candidates.push(base);
  candidates.push(base.replace(/^json\s*/i, ''));
  candidates.push(extractBraces(base));
  candidates.push(normalizeSingleQuotes(extractBraces(base)));

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      return parsed;
    } catch (err) {
      // try next candidate
    }
  }

  throw new Error('Unable to parse AI response as JSON: received non-JSON content.');
};

const normalizeOptions = (options = [], questionIndex = 0) => {
  const letters = ['a', 'b', 'c', 'd', 'e'];
  return options
    .map((option, optionIndex) => {
      if (!option) {
        return null;
      }
      const label = normalizeString(option.label || option.text || option.title);
      if (!label) {
        return null;
      }
      const fallbackId = letters[optionIndex] || `opt-${questionIndex + 1}-${optionIndex + 1}`;
      const id = slugify(option.id || option.key || fallbackId, fallbackId);
      return { id, label };
    })
    .filter(Boolean)
    .slice(0, 5);
};

const normalizeAssessment = (raw = {}, { course = {}, questionCount = 8, desiredLevel = '' } = {}) => {
  const count = Math.min(Math.max(Number(questionCount) || 8, 4), MAX_QUESTION_COUNT);
  const normalizedQuestions = [];
  const seenQuestionIds = new Set();
  const rawQuestions = Array.isArray(raw.questions) ? raw.questions : [];

  rawQuestions.forEach((question, questionIndex) => {
    if (!question) {
      return;
    }
    const prompt = normalizeString(question.prompt || question.question || question.text);
    if (!prompt) {
      return;
    }
    const options = normalizeOptions(question.options || question.choices || [], questionIndex);
    if (!options.length) {
      return;
    }
    let correctOptionId = normalizeString(question.correctOptionId || question.answerId || question.answer);
    const optionIds = new Set(options.map((opt) => opt.id));
    if (!correctOptionId || !optionIds.has(correctOptionId)) {
      correctOptionId = options[0].id;
    }
    let id = slugify(question.id || question.slug || prompt.slice(0, 48), `q${questionIndex + 1}`);
    if (seenQuestionIds.has(id)) {
      id = `${id}-${questionIndex + 1}`;
    }
    seenQuestionIds.add(id);
    normalizedQuestions.push({
      id,
      prompt,
      options,
      correctOptionId,
      explanation: normalizeString(question.explanation || question.reason || ''),
      tryItTemplate: normalizeString(question.tryItTemplate || ''),
    });
  });

  if (!normalizedQuestions.length) {
    throw new Error('AI response did not include any usable questions.');
  }

  const limitedQuestions = normalizedQuestions.slice(0, count);

  const courseLabel = normalizeString(course?.name) || 'Course';
  const tags = toArray(raw.tags)
    .map((tag) => normalizeString(tag))
    .filter(Boolean);

  return {
    title: normalizeString(raw.title) || `${courseLabel} checkpoint`,
    level: normalizeString(desiredLevel) || normalizeString(raw.level) || normalizeString(course?.level) || 'Mixed',
    summary: normalizeString(raw.summary) || `Assessment generated from course content for ${courseLabel}.`,
    tags: Array.from(new Set(['AI-generated', 'Auto-graded', ...tags])),
    questions: limitedQuestions,
    generatedAt: new Date(),
    source: 'ai',
    variant: 'course-default',
  };
};

const generateAssessmentSetForCourse = async ({ course, courseDetail = null, questionCount = 6, desiredLevel = '' }) => {
  const courseContext = buildCourseContext(course, courseDetail);
  const courseName = normalizeString(course?.name) || 'this course';
  const desiredCount = Math.min(Math.max(Number(questionCount) || 10, 4), MAX_QUESTION_COUNT);
  const levelHint = normalizeString(desiredLevel) ? `Target difficulty: ${normalizeString(desiredLevel)}.` : '';
  const messages = [
    {
      role: 'system',
      content:
        'You are an expert edtech question writer. Create rigorous, unambiguous multiple-choice questions with one correct answer. Ground every question in the provided course context. Always return clean JSON only.',
    },
    {
      role: 'user',
      content: `Generate ${desiredCount} multiple-choice questions with 4 options each for ${courseName}. ${levelHint} Keep prompts concise and grounded strictly in the course context below.\n\nCourse context:\n${courseContext}\n\nReturn ONLY JSON in this exact shape:\n{\n  "title": "Assessment title",\n  "level": "Beginner/Mid/Advanced",\n  "summary": "1-2 line overview",\n  "tags": ["tag1", "tag2"],\n  "questions": [\n    {\n      "id": "slug-id",\n      "prompt": "Question text",\n      "options": [\n        {"id": "a", "label": "Option text"},\n        {"id": "b", "label": "Option text"},\n        {"id": "c", "label": "Option text"},\n        {"id": "d", "label": "Option text"}\n      ],\n      "correctOptionId": "a",\n      "explanation": "Why the answer is correct.",\n      "tryItTemplate": ""\n    }\n  ]\n}\nEnsure correctOptionId matches one of the option ids. No prose before/after the JSON. Do not emit markdown fences.`,
    },
  ];

  const provider =
    process.env.ASSESSMENT_AI_PROVIDER ||
    (process.env.GEMINI_API_KEY ? 'gemini' : 'openai');

  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);
  const hasGemini = Boolean(process.env.GEMINI_API_KEY);

  const order =
    provider === 'gemini'
      ? ['gemini', 'openai']
      : provider === 'openai'
      ? ['openai', 'gemini']
      : ['openai', 'gemini'];

  let content;
  let usage;
  let model;
  let lastError;

  const isQuotaError = (errorMessage = '') => /429|quota/i.test(errorMessage);

  for (const current of order) {
    if (current === 'openai' && !hasOpenAI) {
      continue;
    }
    if (current === 'gemini' && !hasGemini) {
      continue;
    }

    try {
      if (current === 'gemini') {
        ({ content, usage, model } = await callGemini(messages));
      } else {
        ({ content, usage, model } = await callOpenAI(messages));
      }
      lastError = null;
      break;
    } catch (err) {
      lastError = err;
      const message = (err && err.message) || String(err);
      const hasAlt = (current === 'openai' && hasGemini) || (current === 'gemini' && hasOpenAI);
      const fallbackAllowed = hasAlt && (isQuotaError(message) || current !== provider);

      if (!fallbackAllowed) {
        throw err;
      }
      // else: try next provider in order
    }
  }

  if (!content) {
    throw lastError || new Error('Assessment generation failed for all providers.');
  }

  const parsed = extractJson(content);
  const normalized = normalizeAssessment(parsed, { course, questionCount: desiredCount, desiredLevel });
  return {
    assessment: normalized,
    usage,
    model,
    rawResponse: content,
  };
};

module.exports = {
  buildCourseContext,
  generateAssessmentSetForCourse,
};
