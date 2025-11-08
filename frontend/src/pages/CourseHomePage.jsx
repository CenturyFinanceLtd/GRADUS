import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import HeaderOne from "../components/HeaderOne";
import FooterOne from "../components/FooterOne";
import Animation from "../helper/Animation";
import Preloader from "../helper/Preloader";
import { useAuth } from "../context/AuthContext";
import { API_BASE_URL } from "../services/apiClient";

const NAV_SECTIONS = [
  { id: "assessments", label: "Assessments", slug: "assessments" },
  { id: "notes", label: "Notes", slug: "notes" },
  { id: "messages", label: "Messages", slug: "messages" },
  { id: "resources", label: "Resources", slug: "resources" },
  { id: "info", label: "Course Info", slug: "course-info" },
];

const MODULE_SECTION_ID = "module";
const MODULE_SECTION_SLUG = "module";
const DEFAULT_SECTION_ID = "info";
const SECTION_SLUG_BY_ID = NAV_SECTIONS.reduce((acc, section) => {
  acc[section.id] = section.slug || section.id;
  return acc;
}, {});
const SECTION_ID_BY_SLUG = NAV_SECTIONS.reduce((acc, section) => {
  acc[(section.slug || section.id).toLowerCase()] = section.id;
  return acc;
}, {});

const resolveSectionFromSlug = (slug) => {
  if (!slug) {
    return DEFAULT_SECTION_ID;
  }
  const normalized = String(slug).toLowerCase();
  if (normalized === MODULE_SECTION_SLUG) {
    return MODULE_SECTION_ID;
  }
  return SECTION_ID_BY_SLUG[normalized] || DEFAULT_SECTION_ID;
};

const formatSlugText = (value = "") =>
  value
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const toArray = (value) => {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/\r?\n|,|;|\u2022/g)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const normalizeLectureItems = (items) => {
  if (!Array.isArray(items)) {
    return [];
  }
  return items
    .map((entry) => {
      if (typeof entry === "string") {
        const title = entry.trim();
        return title ? { title, duration: "", type: "" } : null;
      }
      if (entry && typeof entry === "object") {
        const title = String(entry.title || entry.name || entry.label || "").trim();
        const duration = String(entry.duration || entry.length || entry.time || "").trim();
        const type = String(entry.type || entry.category || "").trim();
        if (!title) {
          return null;
        }
        return { title, duration, type };
      }
      return null;
    })
    .filter(Boolean);
};

const normalizeWeeklyStructureBlocks = (module) => {
  const source =
    module?.weeklyStructure ??
    module?.structure ??
    module?.schedule ??
    module?.weeksStructure ??
    [];
  const blocks = Array.isArray(source) ? source : source ? [source] : [];
  return blocks
    .map((entry, idx) => {
      if (!entry) {
        return null;
      }
      if (typeof entry === "string") {
        const title = entry.trim();
        return title
          ? {
              title,
              subtitle: "",
              summary: "",
              lectures: [],
              assignments: [],
              projects: [],
              quizzes: [],
              notes: [],
            }
          : null;
      }
      if (typeof entry !== "object") {
        return null;
      }
      const title = String(entry.title || entry.heading || entry.label || "").trim();
      const subtitle = String(entry.subtitle || entry.tagline || entry.summary || "").trim();
      const summary = String(entry.summary || entry.description || "").trim();
      const lectures = normalizeLectureItems(entry.lectures || entry.items || entry.videos || []);
      const assignments = toArray(entry.assignments || entry.tasks || entry.homework);
      const projects = toArray(entry.projects || entry.activities);
      const quizzes = toArray(entry.quizzes || entry.tests);
      const notes = toArray(entry.notes || entry.resources);
      if (
        !title &&
        !subtitle &&
        !summary &&
        !lectures.length &&
        !assignments.length &&
        !projects.length &&
        !quizzes.length &&
        !notes.length
      ) {
        return null;
      }
      return {
        title: title || `Week ${idx + 1}`,
        subtitle,
        summary,
        lectures,
        assignments,
        projects,
        quizzes,
        notes,
      };
    })
    .filter(Boolean);
};

const deriveModuleOutcomes = (module) => {
  if (Array.isArray(module?.outcomes) && module.outcomes.length) {
    return module.outcomes.filter(Boolean);
  }
  if (module?.outcome) {
    return [module.outcome];
  }
  return [];
};

const normalizeModules = (courseData) => {
  if (!courseData) {
    return [];
  }

  if (Array.isArray(courseData.modules) && courseData.modules.length) {
    return courseData.modules.map((module, index) => {
      const topics = module?.topics?.length !== undefined ? module.topics : module?.points;
      return {
        title: module?.title || `Module ${index + 1}`,
        subtitle: module?.weeksLabel || module?.hours || "",
        topics: toArray(topics),
        outcome: module?.outcome || "",
        weeklyStructure: normalizeWeeklyStructureBlocks(module),
        outcomes: deriveModuleOutcomes(module),
        resources: toArray(module?.resources),
        extras: module?.extras,
      };
    });
  }

  if (Array.isArray(courseData.weeks) && courseData.weeks.length) {
    return courseData.weeks.map((week, index) => ({
      title: week?.title || `Module ${index + 1}`,
      subtitle: week?.hours || "",
      topics: toArray(week?.points),
      outcome: "",
      weeklyStructure: [],
      outcomes: [],
      resources: [],
      extras: undefined,
    }));
  }

  return [];
};

const buildOverviewFromCourse = (courseData = {}) => {
  const hero = courseData.hero || {};
  const stats = courseData.stats || {};
  const modules = normalizeModules(courseData);
  const aboutProgram =
    Array.isArray(courseData.aboutProgram) && courseData.aboutProgram.length
      ? courseData.aboutProgram
      : courseData.outcomeSummary
      ? [courseData.outcomeSummary]
      : [];
  const learn =
    Array.isArray(courseData.learn) && courseData.learn.length
      ? courseData.learn
      : Array.isArray(courseData.outcomes)
      ? courseData.outcomes
      : [];
  const skills = Array.isArray(courseData.skills) ? courseData.skills : [];
  const details = courseData.details || {};
  const capstone = courseData.capstone || {};
  const capstoneBullets = toArray(
    (Array.isArray(capstone.bullets) && capstone.bullets.length
      ? capstone.bullets
      : courseData.capstonePoints) || []
  );
  const careerOutcomes = toArray(courseData.careerOutcomes);
  const toolsFrameworks = toArray(courseData.toolsFrameworks);
  const instructors = Array.isArray(courseData.instructors)
    ? courseData.instructors
    : [];

  return {
    hero: {
      subtitle: courseData.subtitle || hero.subtitle || "",
      enrolledText: hero.enrolledText || "",
    },
    stats: {
      modules: modules.length || stats.modules || 0,
      mode: courseData.mode || stats.mode || "",
      level: courseData.level || stats.level || "",
      duration: courseData.duration || stats.duration || "",
    },
    aboutProgram,
    learn,
    skills,
    details: {
      effort: details.effort || "",
      language: details.language || "",
      prerequisites: details.prerequisites || "",
    },
    capstone: {
      summary: capstone.summary || courseData.focus || courseData.outcomeSummary || "",
      bullets: capstoneBullets,
    },
    careerOutcomes,
    toolsFrameworks,
    instructors,
    modules,
  };
};

const NotesIllustration = () => (
  <svg
    className='course-home-illustration'
    width='180'
    height='140'
    viewBox='0 0 180 140'
    role='img'
    aria-hidden='true'
  >
    <rect x='10' y='20' width='110' height='90' rx='12' fill='#E9F4FF' />
    <rect x='28' y='36' width='74' height='6' rx='3' fill='#B4D8FF' />
    <rect x='28' y='50' width='64' height='6' rx='3' fill='#B4D8FF' />
    <rect x='28' y='64' width='82' height='6' rx='3' fill='#B4D8FF' />
    <rect x='28' y='78' width='48' height='6' rx='3' fill='#B4D8FF' />
    <rect x='120' y='32' width='50' height='72' rx='10' fill='#D7F0DB' />
    <rect x='128' y='46' width='34' height='6' rx='3' fill='#8DD19A' />
    <rect x='128' y='60' width='34' height='6' rx='3' fill='#8DD19A' />
    <rect x='128' y='74' width='34' height='6' rx='3' fill='#8DD19A' />
    <path
      d='M68 96L84 116'
      stroke='#2D8CFF'
      strokeWidth='8'
      strokeLinecap='round'
    />
    <path
      d='M96 88L84 116'
      stroke='#FFBF3C'
      strokeWidth='8'
      strokeLinecap='round'
    />
  </svg>
);

const SectionPlaceholder = ({ title, description }) => (
  <div className='course-home-panel'>
    <div className='course-home-panel__header border-bottom pb-24 mb-32'>
      <div>
        <p className='course-home-panel__eyebrow mb-12'>{title}</p>
        <h2 className='course-home-panel__title'>{title}</h2>
      </div>
    </div>
    <p className='text-neutral-600 mb-0'>{description}</p>
  </div>
);

const CourseHomePage = () => {
  const { programme, course, section: sectionSlugParam, subSection: sectionDetailParam } =
    useParams();
  const { token, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const sectionFromUrl = useMemo(
    () => resolveSectionFromSlug(sectionSlugParam),
    [sectionSlugParam]
  );
  const [state, setState] = useState({ loading: true, error: null, course: null, overview: null });
  const [activeSection, setActiveSection] = useState(sectionFromUrl);
  const [materialExpanded, setMaterialExpanded] = useState(true);
  const modules = useMemo(() => normalizeModules(state.course), [state.course]);
  const moduleIndexFromUrl = useMemo(() => {
    if (sectionFromUrl !== MODULE_SECTION_ID) {
      return null;
    }
    const parsed = Number(sectionDetailParam);
    if (!Number.isFinite(parsed) || parsed < 1) {
      return 0;
    }
    return parsed - 1;
  }, [sectionFromUrl, sectionDetailParam]);

  useEffect(() => {
    setActiveSection(sectionFromUrl);
  }, [sectionFromUrl]);

  useEffect(() => {
    if (!programme || !course || sectionFromUrl === MODULE_SECTION_ID) {
      return;
    }
    const expectedSlug =
      SECTION_SLUG_BY_ID[sectionFromUrl] || SECTION_SLUG_BY_ID[DEFAULT_SECTION_ID];
    const normalizedSlug = sectionSlugParam ? sectionSlugParam.toLowerCase() : "";
    const hasValidSlug = Boolean(normalizedSlug && SECTION_ID_BY_SLUG[normalizedSlug]);
    if (sectionSlugParam !== expectedSlug) {
      navigate(`/${programme}/${course}/home/${expectedSlug}`, {
        replace: !sectionSlugParam || !hasValidSlug,
      });
    }
  }, [programme, course, sectionSlugParam, sectionFromUrl, navigate]);

  useEffect(() => {
    if (sectionFromUrl !== MODULE_SECTION_ID) {
      return;
    }
    if (!programme || !course || !modules.length) {
      return;
    }
    const safeIndex = Math.min(
      Math.max(moduleIndexFromUrl ?? 0, 0),
      Math.max(modules.length - 1, 0)
    );
    const canonicalDetail = String(safeIndex + 1);
    if (sectionDetailParam !== canonicalDetail) {
      navigate(`/${programme}/${course}/home/${MODULE_SECTION_SLUG}/${canonicalDetail}`, {
        replace: true,
      });
    }
  }, [
    sectionFromUrl,
    moduleIndexFromUrl,
    modules.length,
    sectionDetailParam,
    programme,
    course,
    navigate,
  ]);

  useEffect(() => {
    let cancelled = false;
    if (!programme || !course || authLoading) {
      return undefined;
    }

    const loadCourse = async () => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const headers = new Headers();
        if (token) {
          headers.set("Authorization", `Bearer ${token}`);
        }
        const response = await fetch(
          `${API_BASE_URL}/courses/${encodeURIComponent(programme)}/${encodeURIComponent(course)}`,
          {
            credentials: "include",
            headers,
          }
        );
        if (!response.ok) {
          throw new Error(`Unable to load course (HTTP ${response.status})`);
        }
        const payload = await response.json();
        if (!cancelled) {
          setState({
            loading: false,
            error: null,
            course: payload?.course || null,
            overview: buildOverviewFromCourse(payload?.course || {}),
          });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            loading: false,
            error: error?.message || "Unable to load the course at this moment.",
            course: null,
            overview: null,
          });
        }
      }
    };

    loadCourse();
    return () => {
      cancelled = true;
    };
  }, [programme, course, token, authLoading]);

  const programmeSlug = (programme || "").trim().toLowerCase();
  const courseSlug = (course || "").trim().toLowerCase();
  const prettyProgrammeName = useMemo(
    () => formatSlugText(programmeSlug),
    [programmeSlug]
  );
  const prettyCourseName = useMemo(
    () => state.course?.name || formatSlugText(course || ""),
    [state.course?.name, course]
  );
  const programmeTitle = prettyProgrammeName || "Programme";

  const isEnrolled = Boolean(state.course?.isEnrolled);
  const handleSectionChange = (nextSectionId) => {
    const normalizedSection =
      NAV_SECTIONS.find((section) => section.id === nextSectionId)?.id || DEFAULT_SECTION_ID;
    const slug =
      SECTION_SLUG_BY_ID[normalizedSection] || SECTION_SLUG_BY_ID[DEFAULT_SECTION_ID];
    setActiveSection(normalizedSection);
    navigate(`/${programme}/${course}/home/${slug}`);
  };
  const handleModuleClick = (moduleIndex) => {
    if (!modules.length) {
      return;
    }
    const safeIndex = Math.min(Math.max(moduleIndex, 0), modules.length - 1);
    setActiveSection(MODULE_SECTION_ID);
    navigate(`/${programme}/${course}/home/${MODULE_SECTION_SLUG}/${safeIndex + 1}`);
  };
  const handleModuleKeyDown = (event, moduleIndex) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleModuleClick(moduleIndex);
    }
  };

  const renderModuleDetail = () => {
    if (!modules.length) {
      return (
        <div className='course-home-panel'>
          <p className='text-neutral-600 mb-0'>Module details will be available soon.</p>
        </div>
      );
    }
    const safeIndex = Math.min(Math.max(moduleIndexFromUrl ?? 0, 0), modules.length - 1);
    const module = modules[safeIndex];
    const weeklyStructure = Array.isArray(module.weeklyStructure) ? module.weeklyStructure : [];
    const moduleOutcomes =
      Array.isArray(module.outcomes) && module.outcomes.length
        ? module.outcomes
        : module.outcome
        ? [module.outcome]
        : [];
    const resources = Array.isArray(module.resources) ? module.resources : [];
    const extras = module.extras;
    const hasTopics = Array.isArray(module.topics) && module.topics.length;

    const renderWeekBulletGroup = (title, items, iconClass = "ph-check-circle") => {
      if (!items?.length) {
        return null;
      }
      return (
        <div className='course-module-week__group'>
          <p className='course-module-week__group-title'>{title}</p>
          <ul className='course-module-week__list course-module-week__list--bullets'>
            {items.map((item, idx) => (
              <li key={`${title}-${idx}`}>
                <i className={`ph-bold ${iconClass} text-main-500`} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      );
    };

    return (
      <div className='course-home-panel course-info-panel'>
        <div className='course-home-panel__header mb-24'>
          <div>
            <p className='course-home-panel__eyebrow mb-8'>Module {safeIndex + 1}</p>
            <h2 className='course-home-panel__title mb-0'>{module.title}</h2>
          </div>
          {module.subtitle ? <span className='course-info-module__meta'>{module.subtitle}</span> : null}
        </div>
        {hasTopics ? (
          <div className='course-info-section'>
            <h3 className='course-info-section__title'>Topics covered</h3>
            <ul className='course-info-list'>
              {module.topics.map((topic, idx) => (
                <li key={`module-detail-${safeIndex}-topic-${idx}`}>
                  <i className='ph-bold ph-circle-wavy-check text-main-500' />
                  <span>{topic}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {!hasTopics && !weeklyStructure.length ? (
          <p className='text-neutral-600 mb-0'>Detailed topics for this module will be added soon.</p>
        ) : null}

        {weeklyStructure.length ? (
          <div className='course-info-section'>
            <h3 className='course-info-section__title'>Weekly structure</h3>
            <div className='course-module-weeks'>
              {weeklyStructure.map((week, weekIdx) => (
                <div key={`module-${safeIndex}-week-${weekIdx}`} className='course-module-week'>
                  <div className='course-module-week__header'>
                    <div>
                      <p className='course-module-week__title'>{week.title || `Week ${weekIdx + 1}`}</p>
                      {week.subtitle ? (
                        <span className='course-module-week__subtitle'>{week.subtitle}</span>
                      ) : null}
                    </div>
                    {week.summary ? <p className='text-neutral-600 mb-0'>{week.summary}</p> : null}
                  </div>
                  {week.lectures?.length ? (
                    <div className='course-module-week__group'>
                      <p className='course-module-week__group-title'>Lectures</p>
                      <ul className='course-module-week__list course-module-week__list--lectures'>
                        {week.lectures.map((lecture, lectureIdx) => (
                          <li key={`module-${safeIndex}-week-${weekIdx}-lecture-${lectureIdx}`}>
                            <div>
                              <span className='course-module-week__lecture-title'>{lecture.title}</span>
                              {lecture.type ? (
                                <span className='course-module-week__lecture-type'>{lecture.type}</span>
                              ) : null}
                            </div>
                            {lecture.duration ? (
                              <span className='course-module-week__badge'>{lecture.duration}</span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {renderWeekBulletGroup("Assignments", week.assignments, "ph-pencil-simple")}
                  {renderWeekBulletGroup("Quizzes", week.quizzes, "ph-list-checks")}
                  {renderWeekBulletGroup("Projects & practice", week.projects, "ph-flask")}
                  {renderWeekBulletGroup("Notes & resources", week.notes, "ph-book-open")} 
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {moduleOutcomes.length ? (
          <div className='course-info-section'>
            <h3 className='course-info-section__title'>Outcomes</h3>
            <ul className='course-info-list'>
              {moduleOutcomes.map((item, idx) => (
                <li key={`module-outcome-${idx}`}>
                  <i className='ph-bold ph-target text-main-500' />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {extras && (extras.projectTitle || extras.projectDescription || extras.examples?.length || extras.deliverables?.length) ? (
          <div className='course-info-section'>
            <h3 className='course-info-section__title'>{extras.projectTitle || "Projects & deliverables"}</h3>
            {extras.projectDescription ? (
              <p className='text-neutral-600 mb-12'>{extras.projectDescription}</p>
            ) : null}
            {extras.examples?.length ? renderWeekBulletGroup("Example projects", extras.examples, "ph-check") : null}
            {extras.deliverables?.length
              ? renderWeekBulletGroup("Deliverables", extras.deliverables, "ph-package")
              : null}
          </div>
        ) : null}

        {resources.length ? (
          <div className='course-info-section'>
            <h3 className='course-info-section__title'>Recommended resources</h3>
            <div className='course-info-chips'>
              {resources.map((item, idx) => (
                <span key={`module-resource-${idx}`} className='course-info-chip'>
                  {item}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  const renderCourseInfo = () => {
    const info = state.overview;
    if (!info) {
      return (
        <div className='course-home-panel'>
          <p className='text-neutral-600 mb-0'>Course info will be available soon.</p>
        </div>
      );
    }

    const statsCards = [
      info.stats?.modules ? { label: "Modules included", value: `${info.stats.modules}` } : null,
      info.stats?.mode ? { label: "Mode", value: info.stats.mode } : null,
      info.stats?.level ? { label: "Level", value: info.stats.level } : null,
      info.stats?.duration ? { label: "Duration", value: info.stats.duration } : null,
    ].filter(Boolean);

    const detailCards = [
      info.details?.effort ? { label: "Effort", value: info.details.effort } : null,
      info.details?.language ? { label: "Language", value: info.details.language } : null,
      info.details?.prerequisites
        ? { label: "Prerequisites", value: info.details.prerequisites }
        : null,
    ].filter(Boolean);

    return (
      <div className='course-home-panel course-info-panel'>
        <div className='course-home-panel__header mb-24'>
          <div>
            <p className='course-home-panel__eyebrow mb-8'>Course Info</p>
            <h2 className='course-home-panel__title mb-0'>Course Info</h2>
          </div>
        </div>

        {statsCards.length ? (
          <div className='course-info-grid mb-32'>
            {statsCards.map((card, idx) => (
              <div key={`stat-${idx}`} className='course-info-card'>
                <p className='course-info-card__label'>{card.label}</p>
                <p className='course-info-card__value'>{card.value}</p>
              </div>
            ))}
          </div>
        ) : null}

        {info.aboutProgram?.length ? (
          <div className='course-info-section'>
            <h3 className='course-info-section__title'>About the Program</h3>
            <div className='d-grid gap-12'>
              {info.aboutProgram.map((paragraph, idx) => (
                <p key={`about-${idx}`} className='text-neutral-600 mb-0'>
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        ) : null}

        {info.learn?.length ? (
          <div className='course-info-section'>
            <h3 className='course-info-section__title'>What you'll learn</h3>
            <ul className='course-info-list'>
              {info.learn.map((item, idx) => (
                <li key={`learn-${idx}`}>
                  <i className='ph-bold ph-check-circle text-main-500' />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {info.skills?.length ? (
          <div className='course-info-section'>
            <h3 className='course-info-section__title'>Skills you'll gain</h3>
            <div className='course-info-chips'>
              {info.skills.map((skill, idx) => (
                <span key={`skill-${idx}`} className='course-info-chip'>
                  {skill}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {detailCards.length ? (
          <div className='course-info-section'>
            <h3 className='course-info-section__title'>Course details</h3>
            <div className='course-info-grid'>
              {detailCards.map((card, idx) => (
                <div key={`detail-${idx}`} className='course-info-card'>
                  <p className='course-info-card__label'>{card.label}</p>
                  <p className='course-info-card__value'>{card.value}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {info.modules?.length ? (
          <div className='course-info-section'>
            <h3 className='course-info-section__title'>Module breakdown</h3>
            <div className='course-info-modules'>
              {info.modules.map((module, idx) => (
                <div key={`module-${idx}`} className='course-info-module'>
                  <div className='d-flex justify-content-between flex-wrap gap-8 mb-12'>
                    <div>
                      <p className='course-info-module__eyebrow'>Module {idx + 1}</p>
                      <h4 className='course-info-module__title'>{module.title}</h4>
                    </div>
                    {module.subtitle ? (
                      <span className='course-info-module__meta'>{module.subtitle}</span>
                    ) : null}
                  </div>
                  {module.topics?.length ? (
                    <ul className='course-info-list course-info-list--compact'>
                      {module.topics.map((topic, topicIdx) => (
                        <li key={`module-${idx}-topic-${topicIdx}`}>
                          <i className='ph-bold ph-caret-right text-main-500' />
                          <span>{topic}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {info.capstone?.summary || (info.capstone?.bullets || []).length ? (
          <div className='course-info-section'>
            <h3 className='course-info-section__title'>Capstone outcome</h3>
            {info.capstone?.summary ? (
              <p className='text-neutral-600 mb-16'>{info.capstone.summary}</p>
            ) : null}
            {(info.capstone?.bullets || []).length ? (
              <ul className='course-info-list'>
                {info.capstone.bullets.map((item, idx) => (
                  <li key={`capstone-${idx}`}>
                    <i className='ph-bold ph-target text-main-500' />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        {info.careerOutcomes?.length ? (
          <div className='course-info-section'>
            <h3 className='course-info-section__title'>Career outcomes</h3>
            <ul className='course-info-list'>
              {info.careerOutcomes.map((item, idx) => (
                <li key={`career-${idx}`}>
                  <i className='ph-bold ph-briefcase text-main-500' />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {info.toolsFrameworks?.length ? (
          <div className='course-info-section'>
            <h3 className='course-info-section__title'>Tools &amp; frameworks</h3>
            <div className='course-info-chips'>
              {info.toolsFrameworks.map((tool, idx) => (
                <span key={`tool-${idx}`} className='course-info-chip'>
                  {tool}
                </span>
              ))}
            </div>
          </div>
        ) : null}

      </div>
    );
  };

  const renderMainContent = () => {
    if (state.loading) {
      return (
        <div className='course-home-panel'>
          <p className='text-neutral-600 mb-0'>Loading your course workspace...</p>
        </div>
      );
    }

    if (state.error) {
      return (
        <div className='course-home-panel text-center'>
          <p className='text-danger-600 mb-16'>{state.error}</p>
          <button
            type='button'
            className='btn btn-main rounded-pill px-32'
            onClick={() => window.location.reload()}
          >
            Try again
          </button>
        </div>
      );
    }

    if (!isEnrolled) {
      return (
        <div className='course-home-panel text-center'>
          <p className='text-neutral-800 fw-semibold mb-12'>
            You need to enroll in this course to access the workspace.
          </p>
          <p className='text-neutral-600 mb-24'>
            Complete your enrollment to unlock modules, notes, resources, and assessments.
          </p>
          <button
            type='button'
            className='btn btn-main rounded-pill px-32'
            onClick={() => navigate(`/${programme}/${course}`)}
          >
            Review course overview
          </button>
        </div>
      );
    }

    switch (activeSection) {
      case "notes":
        return (
          <div className='course-home-panel'>
            <div className='course-home-panel__header mb-32'>
              <div>
                <p className='course-home-panel__eyebrow mb-8'>Notes</p>
                <h2 className='course-home-panel__title mb-0'>Notes</h2>
              </div>
              <button type='button' className='course-home-filter'>
                <span>Filter: </span>
                <strong>All notes</strong>
                <i className='ph-bold ph-caret-down d-inline-flex text-md' />
              </button>
            </div>
            <div className='course-home-empty text-center'>
              <NotesIllustration />
              <p className='text-neutral-700 fw-semibold mb-8'>
                You have not added any notes yet.
              </p>
              <p className='text-neutral-600 mb-0'>
                Notes can be created from video pages and will appear here automatically.
              </p>
            </div>
          </div>
        );
      case "assessments":
        return (
          <SectionPlaceholder
            title='Assessments'
            description='Assessments unlock as you progress through modules. Keep learning to access your first checkpoint.'
          />
        );
      case "messages":
        return (
          <SectionPlaceholder
            title='Messages'
            description='Stay tuned! Mentor updates and cohort announcements will show up here once your batch begins.'
          />
        );
      case "resources":
        return (
          <SectionPlaceholder
            title='Resources'
            description='Downloadable templates, case studies, and reading lists will be added for your cohort soon.'
          />
        );
      case "info":
        return renderCourseInfo();
      case MODULE_SECTION_ID:
        return renderModuleDetail();
      default:
        return null;
    }
  };

  const renderSidebar = () => (
    <aside className='course-home-sidebar'>
      <div className='course-home-summary mb-24'>
        <h3 className='course-home-summary__title mb-0'>{prettyCourseName}</h3>
      </div>
      <div className='course-home-material mb-24'>
        <button
          type='button'
          className='course-home-material__toggle'
          onClick={() => setMaterialExpanded((prev) => !prev)}
        >
          <span>Course Material</span>
          <i
            className={`ph-bold ph-caret-${materialExpanded ? "up" : "down"} d-inline-flex`}
          />
        </button>
        {materialExpanded ? (
          <ul className='course-home-modules list-unstyled mb-0'>
            {modules.length ? (
              modules.map((module, index) => {
                const isActiveModule =
                  sectionFromUrl === MODULE_SECTION_ID &&
                  Math.min(Math.max(moduleIndexFromUrl ?? -1, -1), modules.length - 1) === index;
                return (
                  <li
                    key={`module-${index}`}
                    className={`course-home-modules__item ${isActiveModule ? "is-active" : ""}`}
                    role='button'
                    tabIndex={0}
                    onClick={() => handleModuleClick(index)}
                    onKeyDown={(event) => handleModuleKeyDown(event, index)}
                  >
                    <i className='ph-bold ph-check-circle text-success-500 mt-1' />
                    <div>
                      <span className='text-neutral-500 text-sm d-block mb-1'>
                        Module {index + 1}
                      </span>
                      <p className='mb-2 fw-semibold'>{module.title}</p>
                      {module.subtitle ? (
                        <span className='text-sm text-neutral-600'>{module.subtitle}</span>
                      ) : null}
                    </div>
                  </li>
                );
              })
            ) : (
              <li className='course-home-modules__item course-home-modules__item--empty'>
                Module list will appear once your course curriculum is published.
              </li>
            )}
          </ul>
        ) : null}
      </div>
      <nav className='course-home-nav'>
        {NAV_SECTIONS.map((section) => (
          <button
            key={section.id}
            type='button'
            className={`course-home-nav__item ${
              activeSection === section.id ? "is-active" : ""
            }`}
            onClick={() => handleSectionChange(section.id)}
          >
            {section.label}
          </button>
        ))}
      </nav>
    </aside>
  );

  return (
    <>
      <Preloader />
      <Animation />
      <HeaderOne />
      <section className='course-home-section py-60'>
        <div className='container'>
          <div className='row align-items-start gy-4 mb-32'>
            <div className='col-lg-8'>
              <p className='text-main-600 fw-semibold mb-8'>{programmeTitle}</p>
              <h1 className='text-neutral-900 mb-0'>{prettyCourseName}</h1>
            </div>
            <div className='col-lg-4 text-end'>
              <button
                type='button'
                className='btn btn-main rounded-pill px-40'
                onClick={() => navigate(`/${programme}/${course}`)}
              >
                Back to Course Overview
              </button>
            </div>
          </div>
          <div className='course-home-grid'>
            {renderSidebar()}
            <div className='course-home-content'>{renderMainContent()}</div>
          </div>
        </div>
      </section>
      <FooterOne />
    </>
  );
};

export default CourseHomePage;
