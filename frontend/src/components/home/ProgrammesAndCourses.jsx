import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Slider from "react-slick";
import { fetchCourseOptions } from "../../services/courseService";
import { slugify } from "../../utils/slugify";

const TABS = [
  { id: "popular", label: "Popular Courses" },
  { id: "gradus-x", label: "Gradus X" },
  { id: "gradus-finlit", label: "Gradus Finlit" },
  { id: "gradus-lead", label: "Gradus Lead" },
];

const POPULAR_PRICE_TARGET = 46000;
const POPULAR_COURSE_TARGETS = [
  {
    canonical: "full-stack-development-mastery-mern",
    aliases: ["full-stack-development-mastery-mern", "full-stack-development-mastery"],
  },
  {
    canonical: "python-programming-mastery",
    aliases: ["python-programming-mastery"],
  },
  {
    canonical: "mobile-app-development-mastery-react-native",
    aliases: ["mobile-app-development-mastery-react-native", "mobile-app-development-mastery"],
  },
];
const POPULAR_COURSE_ORDER = POPULAR_COURSE_TARGETS.reduce((map, { canonical }, index) => {
  map[canonical] = index;
  return map;
}, {});
const POPULAR_COURSE_ALIAS_MAP = POPULAR_COURSE_TARGETS.reduce((map, { canonical, aliases }) => {
  aliases.forEach((alias) => {
    map[alias] = canonical;
  });
  return map;
}, {});

const SliderArrow = ({ direction, onClick, className = "" }) => {
  const isDisabled = className?.includes?.("slick-disabled");
  return (
  <button
    type='button'
    className={`programmes-courses-arrow ${direction} ${isDisabled ? "is-disabled" : ""}`}
    aria-label={direction === "next" ? "Next courses" : "Previous courses"}
    onClick={onClick}
    disabled={isDisabled}
  >
    <span aria-hidden='true'>{direction === "next" ? "›" : "‹"}</span>
  </button>
  );
};

const BASE_SLIDER_SETTINGS = {
  dots: false,
  arrows: true,
  infinite: true,
  speed: 600,
  slidesToShow: 4,
  slidesToScroll: 1,
  autoplay: true,
  autoplaySpeed: 4500,
  pauseOnHover: true,
  nextArrow: <SliderArrow direction='next' />,
  prevArrow: <SliderArrow direction='prev' />,
  responsive: [
    {
      breakpoint: 1399.98,
      settings: { slidesToShow: 3 },
    },
    {
      breakpoint: 991.98,
      settings: { slidesToShow: 2 },
    },
    {
      breakpoint: 575.98,
      settings: { slidesToShow: 1, autoplaySpeed: 4000 },
    },
  ],
};

const getNumber = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9.]/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const formatCurrency = (value) => {
  const num = getNumber(value);
  if (num == null) return null;
  return `₹${Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(num)}`;
};

const formatModulesDuration = (item) => {
  const modulesValue =
    getNumber(item?.stats?.modules ?? item?.modulesCount ?? item?.stats?.totalModules) ??
    (Array.isArray(item?.modules) ? item.modules.length : null);
  const moduleLabel = modulesValue && modulesValue > 0 ? `${modulesValue} Module` : null;

  const durationLabel =
    item?.stats?.duration ||
    item?.durationLabel ||
    item?.duration ||
    (item?.stats?.weeks ? `${item.stats.weeks} Weeks` : "") ||
    "";

  if (moduleLabel && durationLabel) return `${moduleLabel} (${durationLabel})`;
  if (moduleLabel) return moduleLabel;
  if (durationLabel) return durationLabel;
  return "Self-paced";
};

const deriveProgrammeFromSlug = (slug = "") => {
  const safe = String(slug).replace(/^\//, "").toLowerCase();
  if (!safe) return { programmeSlug: "popular", courseSlug: "" };
  const parts = safe.split("/");
  if (parts.length >= 2) {
    return { programmeSlug: parts[0], courseSlug: parts[1] };
  }
  return { programmeSlug: "popular", courseSlug: safe };
};

const truncateSummary = (text = "", maxWords = 6) => {
  const trimmed = (text || "").trim();
  if (!trimmed) return "";
  const words = trimmed.split(/\s+/);
  if (words.length <= maxWords) return trimmed;
  return `${words.slice(0, maxWords).join(" ")}…`;
};

const normalizeCourse = (item) => {
  if (!item) return null;
  const { programmeSlug, courseSlug } = deriveProgrammeFromSlug(item.slug || item.path || "");
  const title = item.name || item.title || courseSlug?.replace(/-/g, " ") || "Gradus course";
  const aboutFromCourse = Array.isArray(item.aboutProgram)
    ? item.aboutProgram.map((entry) => (typeof entry === "string" ? entry.trim() : "")).find((entry) => entry.length)
    : "";
  const summary =
    aboutFromCourse ||
    item.shortDescription ||
    item.subtitle ||
    item.metaDescription ||
    (Array.isArray(item.highlights) ? item.highlights.find((text) => (text || "").trim()) : "") ||
    "Outcome-focused cohort aligned to industry requirements.";
  const summaryText = truncateSummary(summary, 12);

  const priceValue =
    item.priceINR ??
    item.hero?.priceINR ??
    item.salePrice ??
    item.offerPrice ??
    item.price ??
    null;
  const crossedValue = item.listPrice ?? item.mrp ?? item.price;
  const priceLabel = formatCurrency(priceValue);
  const priceAmount = priceValue == null ? null : getNumber(priceValue);
  const oldPriceLabel = (() => {
    const formatted = formatCurrency(crossedValue);
    if (!formatted || formatted === priceLabel) return null;
    return formatted;
  })();
  const studentsCount =
    getNumber(
      item.enrolledCount ??
        item.studentsEnrolled ??
        item.stats?.enrolled ??
        item.meta?.students ??
        item.minLearners
    ) ?? null;
  const studentsLabel = studentsCount
    ? `+ ${Intl.NumberFormat("en-IN").format(studentsCount)} students`
    : "";
  const scheduleLabel = formatModulesDuration(item);
  const thumbnail =
    item.thumbnailUrl || item.heroImage || item.coverImage || item.bannerImage || item.thumbnail || item.imageUrl;
  const href =
    courseSlug && programmeSlug !== "popular"
      ? `/${programmeSlug}/${courseSlug}`
      : `/our-courses?course=${slugify(title)}`;

  const normalizedCourseSlug = (courseSlug || slugify(title)).replace(/^\//, "").toLowerCase();

  return {
    id: item.id || item._id || item.slug || title,
    title,
    summary: summaryText,
    priceAmount,
    priceLabel,
    oldPriceLabel: priceLabel === oldPriceLabel ? null : oldPriceLabel,
    studentsLabel,
    scheduleLabel,
    thumbnail,
    programmeSlug,
    courseSlug: normalizedCourseSlug,
    programmeLabel: programmeSlug === "popular" ? "Popular" : (programmeSlug || "").replace(/-/g, " "),
    href,
  };
};

const ProgrammesAndCourses = () => {
  const [courses, setCourses] = useState([]);
  const [activeTab, setActiveTab] = useState(TABS[0].id);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [thumbLoaded, setThumbLoaded] = useState({});

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const response = await fetchCourseOptions();
        if (!mounted) return;
        const items = Array.isArray(response?.items) ? response.items : [];
        const normalized = items.map(normalizeCourse).filter(Boolean);
        setCourses(normalized);
        setError(null);
      } catch (err) {
        if (!mounted) return;
        setError(err?.message || "Unable to load courses right now.");
        setCourses([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const tabbedCourses = useMemo(() => {
    const priceMatches = courses.filter((course) => course.priceAmount === POPULAR_PRICE_TARGET);
    const priceMatchIds = new Set(priceMatches.map((course) => course.id));

    if (activeTab === "popular") {
      const aliasMatches = courses.reduce((acc, course) => {
        const canonical = POPULAR_COURSE_ALIAS_MAP[course.courseSlug];
        if (canonical) {
          acc.push({ canonical, course });
        }
        return acc;
      }, []);
      const prioritized = POPULAR_COURSE_TARGETS.map(({ canonical }) => {
        const entry = aliasMatches.find((item) => item.canonical === canonical);
        return entry?.course || null;
      }).filter(Boolean);

      const prioritizedIds = new Set(prioritized.map((course) => course.id));
      const prioritizedWithoutPriceHits = prioritized.filter((course) => !priceMatchIds.has(course.id));
      const fillers = courses.filter(
        (course) => !priceMatchIds.has(course.id) && !prioritizedIds.has(course.id)
      );

      // Keep 46000-price courses right at the top, then our hand-picked ones, then any remaining.
      return [...priceMatches, ...prioritizedWithoutPriceHits, ...fillers];
    }

    const filtered = courses.filter((course) => course.programmeSlug === activeTab);
    return filtered.sort((a, b) => {
      const aIsTarget = priceMatchIds.has(a.id);
      const bIsTarget = priceMatchIds.has(b.id);
      if (aIsTarget === bIsTarget) return 0;
      return aIsTarget ? -1 : 1;
    });
  }, [courses, activeTab]);

  const sliderSettings = useMemo(() => {
    const total = tabbedCourses.length;
    const slidesToShow = Math.min(4, Math.max(1, total));
    const responsive = BASE_SLIDER_SETTINGS.responsive.map(({ breakpoint, settings }) => ({
      breakpoint,
      settings: {
        ...settings,
        slidesToShow: Math.min(settings.slidesToShow, Math.max(1, total)),
      },
    }));
    return {
      ...BASE_SLIDER_SETTINGS,
      slidesToShow,
      infinite: total > slidesToShow,
      className: `programmes-courses-slider${total < 4 ? " is-condensed" : ""}`,
      responsive,
    };
  }, [tabbedCourses.length]);

  const showSkeleton = (loading || Boolean(error)) && !courses.length;
  const showComingSoon = !loading && !error && !tabbedCourses.length;

  const sliderKey = `${activeTab}-${tabbedCourses.length}`;

  return (
    <section className='programmes-courses-section py-64'>
      <div className='container'>
        <style>{`
          @keyframes programmeThumbShimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
          .programme-thumb-loading {
            position: absolute;
            inset: 0;
            border-radius: 18px;
            background: linear-gradient(120deg, #eef2f7, #e2e8f0, #eef2f7);
            background-size: 200% 100%;
            animation: programmeThumbShimmer 1.6s ease-in-out infinite;
          }
          .programme-card-skeleton {
            background: linear-gradient(120deg, #eef2f7, #e2e8f0, #eef2f7);
            background-size: 200% 100%;
            animation: programmeThumbShimmer 1.6s ease-in-out infinite;
          }
        `}</style>
        <div className='row justify-content-center text-center mb-32'>
          
        </div>
        <div className='programmes-courses-tabs d-flex flex-wrap justify-content-center gap-16 mb-32'>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type='button'
              className={`programmes-courses-tab ${tab.id === activeTab ? "is-active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className='programmes-courses-carousel'>
          <div className='programmes-courses-frame'>
            {showSkeleton ? (
              <div
                className='programmes-courses-skeleton-grid'
                style={{ display: "flex", gap: 24, flexWrap: "wrap", justifyContent: "center" }}
              >
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div key={`course-skel-${idx}`} className='programme-card-wrapper' style={{ minWidth: 260, maxWidth: 320 }}>
                    <div className='programme-card programme-card--skeleton'>
                      <div className='programme-card__thumb programme-card-skeleton' style={{ height: 190, borderRadius: 18 }} />
                      <div className='programme-card__pill programme-card-skeleton d-flex align-items-center gap-10' style={{ marginTop: 12, height: 36, borderRadius: 18, justifyContent: "space-between" }}>
                        <div className='d-flex gap-8'>
                          <span className='programme-card-skeleton' style={{ width: 24, height: 24, borderRadius: 12 }} />
                          <span className='programme-card-skeleton' style={{ width: 24, height: 24, borderRadius: 12 }} />
                          <span className='programme-card-skeleton' style={{ width: 24, height: 24, borderRadius: 12 }} />
                        </div>
                        <span className='programme-card-skeleton' style={{ width: 120, height: 14, borderRadius: 10 }} />
                      </div>
                      <div className='programme-card__body'>
                        <div className='programme-card-skeleton mb-10' style={{ height: 14, width: "65%", borderRadius: 8 }} />
                        <div className='programme-card-skeleton mb-14' style={{ height: 18, width: "90%", borderRadius: 10 }} />
                        <div className='programme-card-skeleton mb-8' style={{ height: 14, width: "100%", borderRadius: 10 }} />
                        <div className='programme-card-skeleton mb-8' style={{ height: 14, width: "92%", borderRadius: 10 }} />
                        <div className='programme-card-skeleton mb-8' style={{ height: 14, width: "80%", borderRadius: 10 }} />
                        <div className='d-flex justify-content-between align-items-center mt-14'>
                          <div className='programme-card-skeleton' style={{ height: 22, width: 90, borderRadius: 10 }} />
                          <div className='programme-card-skeleton' style={{ height: 34, width: 120, borderRadius: 10 }} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : showComingSoon ? (
              <div className='programmes-courses-empty text-white-50 text-center py-40'>
                Coming soon
              </div>
            ) : (
              <Slider key={sliderKey} {...sliderSettings}>
                {tabbedCourses.map((course) => {
                  const isFlagship = course.priceAmount === POPULAR_PRICE_TARGET;
                  return (
                    <div key={`${activeTab}-${course.id}`} className='programme-card-wrapper'>
                      <div className='programme-card'>
                        <div className='programme-card__thumb' style={{ position: "relative", overflow: "hidden" }}>
                          {isFlagship ? (
                            <div className='programme-card__flagship' aria-label='Job Guarante programme'>
                              <span className='programme-card__flagship-icon' aria-hidden='true'>
                                <img src='/assets/images/logo/favicon.png' alt='Gradus logo' loading='lazy' />
                              </span>
                              <span className='programme-card__flagship-text'>Job Guarante</span>
                            </div>
                          ) : null}
                          {course.thumbnail ? (
                            <>
                              {!thumbLoaded[course.id] ? <div className='programme-thumb-loading' aria-hidden='true' /> : null}
                              <img
                                src={course.thumbnail}
                                alt={course.title}
                                loading='lazy'
                                onLoad={() => setThumbLoaded((prev) => ({ ...prev, [course.id]: true }))}
                                style={!thumbLoaded[course.id] ? { visibility: "hidden" } : undefined}
                              />
                            </>
                          ) : (
                            <div className='programme-card__thumb--placeholder' aria-hidden='true' />
                          )}
                        </div>
                        {course.studentsLabel ? (
                          <div className='programme-card__pill' aria-label={course.studentsLabel}>
                            <div className='programme-card__avatars' aria-hidden='true'>
                              {[0, 1, 2, 3].map((idx) => (
                                <span key={`${course.id}-avatar-${idx}`} className={`programme-card__avatar avatar-${idx}`} />
                              ))}
                            </div>
                            <span className='programme-card__pill-text'>{course.studentsLabel}</span>
                          </div>
                        ) : null}
                        <div className='programme-card__body'>
                          <p className='programme-card__schedule text-sm'>{course.scheduleLabel}</p>
                          <h5 className='programme-card__title'>{course.title}</h5>
                          <p className='programme-card__summary text-sm'>{course.summary}</p>
                          <div className='programme-card__footer'>
                            <div className='programme-card__price'>
                              {course.priceLabel ? (
                                <>
                                  <span className='programme-card__price-current'>{course.priceLabel}</span>
                                  {course.oldPriceLabel ? (
                                    <span className='programme-card__price-old'>{course.oldPriceLabel}</span>
                                  ) : null}
                                </>
                              ) : (
                                <span className='programme-card__price-talk'>Talk to us</span>
                              )}
                            </div>
                            <Link className='programme-card__cta btn btn-success ' to={course.href}>
                             Explore Course
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </Slider>
            )}
          </div>
        </div>
        <div className='text-center mt-40'>
          <Link to='/our-courses' className='programmes-courses-all btn'>
            All Courses
          </Link>
        </div>
      </div>
    </section>
  );
};

export default ProgrammesAndCourses;
