const Course = require('../models/Course');
const CoursePage = require('../models/CoursePage');
const defaultCourseContent = require('../data/defaultCourseContent');

const normalizeArray = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === 'string' ? item.trim() : item))
    .filter((item) => {
      if (typeof item === 'string') {
        return item.length > 0;
      }
      return item && typeof item === 'object' ? Object.keys(item).length > 0 : Boolean(item);
    });
};

const ensureCourseContent = async () => {
  const [courseCount, pageCount] = await Promise.all([
    Course.countDocuments(),
    CoursePage.countDocuments(),
  ]);

  if (courseCount === 0) {
    const coursesToInsert = (defaultCourseContent.courses || []).map((course, index) => ({
      name: course.name,
      slug: course.slug || course.id,
      subtitle: course.subtitle,
      focus: course.focus,
      approvals: normalizeArray(course.approvals),
      placementRange: course.placementRange,
      outcomeSummary: course.outcomeSummary,
      deliverables: normalizeArray(course.deliverables),
      outcomes: normalizeArray(course.outcomes),
      finalAward: course.finalAward,
      partners: normalizeArray(course.partners),
      weeks: normalizeArray(course.weeks).map((week) => ({
        title: week.title,
        points: normalizeArray(week.points),
      })),
      certifications: normalizeArray(course.certifications).map((cert) => ({
        level: cert.level,
        certificateName: cert.certificateName,
        coverage: normalizeArray(cert.coverage),
        outcome: cert.outcome,
      })),
      order: index + 1,
    }));

    if (coursesToInsert.length) {
      await Course.insertMany(coursesToInsert);
    }
  }

  if (pageCount === 0 && defaultCourseContent.hero) {
    await CoursePage.create({
      hero: defaultCourseContent.hero,
    });
  }
};

module.exports = ensureCourseContent;
