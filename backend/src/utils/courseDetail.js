/*
  Course detail utilities
  - Shared helpers for normalizing module detail payloads
*/
const { randomUUID } = require('crypto');

const safeString = (value) => (typeof value === 'string' ? value.trim() : '');

const safeArray = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => safeString(item)).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(/\r?\n|,|;|\u2022/g)
      .map((item) => safeString(item))
      .filter(Boolean);
  }
  return [];
};

const buildId = (existing, fallbackPrefix) => {
  const str = safeString(existing);
  if (str) return str;
  if (typeof randomUUID === 'function') return randomUUID();
  return `${fallbackPrefix || 'id'}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const normalizeLecture = (lecture, fallbackTitle = '') => {
  const lectureId = buildId(lecture?.lectureId || lecture?.id, 'lecture');
  return {
    lectureId,
    title: safeString(lecture?.title || fallbackTitle) || 'Lecture',
    duration: safeString(lecture?.duration),
    description: safeString(lecture?.description || lecture?.summary),
    type: safeString(lecture?.type),
    video: {
      url: safeString(lecture?.video?.url),
      publicId: safeString(lecture?.video?.publicId),
      folder: safeString(lecture?.video?.folder),
      assetType: safeString(lecture?.video?.assetType) || (lecture?.video?.url ? 'video' : ''),
      duration: Number.isFinite(lecture?.video?.duration) ? lecture.video.duration : 0,
      bytes: Number.isFinite(lecture?.video?.bytes) ? lecture.video.bytes : 0,
      format: safeString(lecture?.video?.format),
    },
  };
};

const normalizeSection = (section, moduleIndex, sectionIndex) => {
  const sectionId = buildId(section?.sectionId || section?.id, 'section');
  const lectures = Array.isArray(section?.lectures)
    ? section.lectures.map((lecture, lectureIndex) =>
        normalizeLecture(lecture, `Lecture ${sectionIndex + 1}.${lectureIndex + 1}`)
      )
    : [];
  return {
    sectionId,
    title: safeString(section?.title) || `Week ${sectionIndex + 1}`,
    subtitle: safeString(section?.subtitle),
    summary: safeString(section?.summary),
    lectures,
    assignments: safeArray(section?.assignments),
    quizzes: safeArray(section?.quizzes),
    projects: safeArray(section?.projects),
    outcomes: safeArray(section?.outcomes),
    notes: safeArray(section?.notes),
  };
};

const normalizeModule = (module, index) => {
  const moduleId = buildId(module?.moduleId || module?.id, 'module');
  const sections = Array.isArray(module?.sections)
    ? module.sections.map((section, sectionIndex) => normalizeSection(section, index, sectionIndex))
    : [];
  return {
    moduleId,
    order: Number.isFinite(module?.order) ? module.order : index,
    moduleLabel: safeString(module?.moduleLabel) || `Module ${index + 1}`,
    title: safeString(module?.title),
    weeksLabel: safeString(module?.weeksLabel),
    summary: safeString(module?.summary),
    topicsCovered: safeArray(module?.topicsCovered),
    outcomes: safeArray(module?.outcomes),
    variant: safeString(module?.variant) || 'default',
    sections,
    resources: safeArray(module?.resources),
    capstone: {
      summary: safeString(module?.capstone?.summary),
      deliverables: safeArray(module?.capstone?.deliverables),
      rubric: safeArray(module?.capstone?.rubric),
    },
  };
};

const normalizeModulesPayload = (modulesInput) => {
  if (!Array.isArray(modulesInput)) return [];
  return modulesInput
    .map((module, index) => normalizeModule(module, index))
    .sort((a, b) => a.order - b.order)
    .map((module, index) => ({ ...module, order: index }));
};

const buildSectionsFromWeeklyStructure = (weeklyStructure) => {
  if (!Array.isArray(weeklyStructure)) return [];
  return weeklyStructure.map((week, index) =>
    normalizeSection(
      {
        ...week,
        lectures: Array.isArray(week?.lectures)
          ? week.lectures.map((lecture, lectureIndex) =>
              normalizeLecture(lecture, `Lecture ${index + 1}.${lectureIndex + 1}`)
            )
          : [],
      },
      0,
      index
    )
  );
};

const buildFallbackModules = (courseDoc) => {
  if (!courseDoc?.modules?.length) return [];
  return courseDoc.modules.map((module, index) => {
    const variant = module?.extras ? 'capstone' : 'default';
    return {
      moduleId: buildId(module?.moduleId, 'module'),
      order: index,
      moduleLabel: `Module ${index + 1}`,
      title: safeString(module?.title),
      weeksLabel: safeString(module?.weeksLabel),
      summary: safeString(module?.outcome),
      topicsCovered: safeArray(module?.topics),
      outcomes: safeArray(module?.outcomes),
      variant,
      sections: buildSectionsFromWeeklyStructure(module?.weeklyStructure),
      resources: safeArray(module?.resources),
      capstone: {
        summary: safeString(module?.extras?.projectDescription),
        deliverables: safeArray(module?.extras?.deliverables),
        rubric: safeArray(module?.extras?.examples),
      },
    };
  });
};

module.exports = {
  safeString,
  safeArray,
  buildId,
  normalizeModulesPayload,
  buildFallbackModules,
};
