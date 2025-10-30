/*
  Data bootstrapper for course content
  - Seeds initial Course and CoursePage documents using src/data/defaultCourseContent
  - Normalizes arrays/partner objects to keep DB shape consistent
*/
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

const normalizePartners = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((partner) => {
      if (!partner) {
        return null;
      }

      if (typeof partner === 'string') {
        const name = partner.trim();
        return name ? { name, logo: '', website: '' } : null;
      }

      if (typeof partner === 'object') {
        const name = typeof partner.name === 'string' ? partner.name.trim() : '';
        const title = typeof partner.title === 'string' ? partner.title.trim() : '';
        const label = typeof partner.label === 'string' ? partner.label.trim() : '';
        const logo =
          typeof partner.logo === 'string'
            ? partner.logo.trim()
            : typeof partner.logoUrl === 'string'
            ? partner.logoUrl.trim()
            : typeof partner.image === 'string'
            ? partner.image.trim()
            : '';
        const website =
          typeof partner.website === 'string'
            ? partner.website.trim()
            : typeof partner.url === 'string'
            ? partner.url.trim()
            : typeof partner.link === 'string'
            ? partner.link.trim()
            : '';

        const normalizedName = name || title || label;

        if (!normalizedName && !logo && !website) {
          return null;
        }

        return {
          name: normalizedName,
          logo,
          website,
        };
      }

      return null;
    })
    .filter(Boolean);
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
      partners: normalizePartners(course.partners),
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
