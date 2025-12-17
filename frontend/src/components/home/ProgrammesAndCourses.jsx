import { useEffect, useMemo, useState, useRef } from "react";
import { Link } from "react-router-dom";

import { fetchCourseOptions } from "../../services/courseService";
import { slugify } from "../../utils/slugify";



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
  const durationLabel =
    item?.stats?.duration ||
    item?.durationLabel ||
    item?.duration ||
    (item?.stats?.weeks ? `${item.stats.weeks} Weeks` : "") ||
    "";

  // User requested: "if 3 module 6 week then only show 6 week"
  // So if we have a duration, use that.
  if (durationLabel) return durationLabel;

  // Fallback to modules if no duration
  const modulesValue =
    getNumber(item?.stats?.modules ?? item?.modulesCount ?? item?.stats?.totalModules) ??
    (Array.isArray(item?.modules) ? item.modules.length : null);

  if (modulesValue && modulesValue > 0) return `${modulesValue} Module`;

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
  // Truncate to 30 words to allow CSS to handle the 1-4 line dynamic clamping
  const summaryText = truncateSummary(summary, 130);

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

  // Map real data from MongoDB schema
  const rating = item.rating || 4.7; // Not in schema, keeping mock or default
  const reviewsCount = item.reviewsCount || 450; // Not in schema

  // "Intermediate–Advanced" -> item.stats.level
  // Clean up level as requested: "Beginner-Intermediate" -> "Beginner"
  const rawLevel = item.stats?.level || item.level || "Beginner";
  const level = rawLevel.split(/[-–]| to /)[0].trim(); // Split by "-", "–" (en-dash), or " to " and take first

  // "6 Weeks" -> item.stats.duration
  const durationHours = item.stats?.duration || item.duration || "Self-paced";

  // "Gradus X" -> item.programme
  const programType = item.programme || item.programType || "CERTIFICATION";

  return {
    id: item._id?.$oid || item.id || item._id || item.slug || title,
    title,
    summary: summaryText,
    priceAmount,
    priceLabel: item.hero?.priceINR ? formatCurrency(item.hero.priceINR) : priceLabel,
    oldPriceLabel: priceLabel === oldPriceLabel ? null : oldPriceLabel,
    studentsLabel,
    scheduleLabel,
    thumbnail: item.image?.url || thumbnail,
    programmeSlug,
    courseSlug: normalizedCourseSlug,
    programmeLabel: programmeSlug === "popular" ? "Popular" : (programmeSlug || "").replace(/-/g, " "),
    href,
    rating,
    reviewsCount,
    level,
    durationHours,
    programType
  };
};


const LevelIcon = ({ level }) => {
  let count = 1;
  const l = (level || "").toLowerCase();
  if (l.includes("intermed")) count = 2;
  else if (l.includes("advanc")) count = 3;

  return (
    <div
      className="level-icon"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        justifyContent: 'center',
        width: '14px',
        marginRight: '6px'
      }}
      aria-hidden="true"
    >
      {[...Array(count)].map((_, i) => (
        <span
          key={i}
          style={{
            display: 'block',
            width: '100%',
            height: '2px',
            backgroundColor: 'currentColor', // Inherit from parent
            borderRadius: '1px'
          }}
        />
      ))}
    </div>
  );
};

const ProgrammesAndCourses = () => {
  const [courses, setCourses] = useState([]);
  const [activeTab, setActiveTab] = useState("all");
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





  // Infinite Scroll & Drag Logic
  const scrollRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  // Triple the courses for infinite loop effect [set1, set2, set3]
  const displayCourses = useMemo(() => {
    if (!courses.length) return [];
    return [...courses, ...courses, ...courses];
  }, [courses]);

  // Velocity tracking
  const velRef = useRef(0);
  const lastXRef = useRef(0);
  const lastTimeRef = useRef(0);
  const rafRef = useRef(null);

  // Initialize scroll to the middle set
  useEffect(() => {
    if (displayCourses.length && scrollRef.current && courses.length) {
      // Small timeout to allow layout to settle
      setTimeout(() => {
        if (!scrollRef.current) return;
        const singleSetWidth = courses.length * (237 + 10); // card width + gap
        // Only set if we are near 0 (initial load)
        if (scrollRef.current.scrollLeft < 100) {
          scrollRef.current.scrollLeft = singleSetWidth;
        }
      }, 50);
    }
  }, [displayCourses, courses.length]);

  const handleScroll = () => {
    if (!scrollRef.current || !courses.length) return;
    const scrollLeft = scrollRef.current.scrollLeft;
    const singleSetWidth = courses.length * (237 + 10); // 237px width + 10px gap

    // Teleport logic
    // We add a small buffer (e.g., 50px) to prevent flickering at exact boundary
    if (scrollLeft < singleSetWidth * 0.5) {
      // Too far left (into first set) -> jump forward to middle set (add length of one set)
      scrollRef.current.scrollLeft += singleSetWidth;
    } else if (scrollLeft > singleSetWidth * 2.5) {
      // Too far right (into third set) -> jump back to middle set (subtract length of one set)
      scrollRef.current.scrollLeft -= singleSetWidth;
    }
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    // Reset momentum
    cancelAnimationFrame(rafRef.current);
    velRef.current = 0;

    lastXRef.current = e.pageX;
    lastTimeRef.current = Date.now();
  };

  const stopDragging = () => {
    if (!isDragging) return;
    setIsDragging(false);
    startMomentum();
  };

  const handleMouseLeave = () => {
    if (isDragging) stopDragging();
  };

  const handleMouseUp = () => {
    if (isDragging) stopDragging();
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();

    // Use delta movement to be robust against scroll wrapping
    const dx = e.pageX - lastXRef.current;

    // 1:1 movement
    if (scrollRef.current) {
      scrollRef.current.scrollLeft -= dx;
    }

    // Track velocity
    const now = Date.now();
    const dt = now - lastTimeRef.current;
    if (dt > 0) {
      velRef.current = dx / dt; // pixels per ms
      lastXRef.current = e.pageX;
      lastTimeRef.current = now;
    }
  };

  const startMomentum = () => {
    let velocity = velRef.current;
    // Cap initial velocity if needed, but let's keep it raw for "force" feel

    const loop = () => {
      if (Math.abs(velocity) < 0.01) {
        cancelAnimationFrame(rafRef.current);
        return;
      }

      // Apply friction (gravity)
      velocity *= 0.95; // Decay factor (0.95 = standard smooth bearing)

      if (scrollRef.current) {
        scrollRef.current.scrollLeft -= velocity * 16; // velocity * deltaTime (approx 16ms)
        rafRef.current = requestAnimationFrame(loop);
      }
    };
    rafRef.current = requestAnimationFrame(loop);
  };

  // Cleanup RAF
  useEffect(() => {
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const showSkeleton = (loading || Boolean(error)) && !courses.length;
  const showComingSoon = !loading && !error && !courses.length;

  return (
    <section className='programmes-courses-section py-64'>
      <div className='container-fluid' style={{ paddingLeft: 0, paddingRight: 0 }}>
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
           /* Gradient Fade Effect - Fixed width for consistent visibility */
          .programmes-courses-carousel {
            mask-image: linear-gradient(to right, transparent, black 80px, black calc(100% - 80px), transparent);
            -webkit-mask-image: linear-gradient(to right, transparent, black 80px, black calc(100% - 80px), transparent);
          }
          .programmes-courses-slider .slick-list {
            overflow: visible !important;
          }
          .programmes-courses-slider .slick-slide {
            padding: 0 5px !important; /* Reduced spacing between cards */
          }
          /* Hide scrollbar for Chrome, Safari and Opera */
          .hide-scrollbar::-webkit-scrollbar {
            display: none;
          }
          /* Hide scrollbar for IE, Edge and Firefox */
          .hide-scrollbar {
            -ms-overflow-style: none;  /* IE and Edge */
            scrollbar-width: none;  /* Firefox */
          }
          .programmes-courses-frame {
            /* border: 1px solid rgba(115, 138, 255, 0.4); */
            border-radius: 32px;
            padding: clamp(16px, 2vw, 0px);
          .programmes-courses-frame {
            /* border: 1px solid rgba(115, 138, 255, 0.4); */
            border-radius: 32px;
            padding: clamp(16px, 2vw, 0px);
            padding-left: 0 !important;
            padding-right: 0 !important;
            box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.06);
          }
          .cursor-grab { cursor: grab; user-select: none; -webkit-user-select: none; }
          .cursor-grabbing { cursor: grabbing; user-select: none; -webkit-user-select: none; }
          .programme-card img { -webkit-user-drag: none; user-select: none; pointer-events: none; }
        `}</style>
        <div className='container'>
          <div className='d-flex justify-content-between align-items-end mb-32 flex-wrap gap-3'>
            <div className='text-start'>
              <div className='text-uppercase fw-bold text-primary mb-2' style={{ letterSpacing: '1px', fontSize: '14px' }}>
                TOP-RATED PROGRAMS
              </div>
              <h2 className='h2 fw-bold text-white mb-0'>
                Master the Skills with Gradus
              </h2>
            </div>
            <div>
              <Link to='/our-courses' className='btn btn-primary px-32'>
                Browse Courses
              </Link>
            </div>
          </div>
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
              <div
                ref={scrollRef}
                className={`d-flex overflow-auto pb-3 hide-scrollbar ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                onMouseDown={handleMouseDown}
                onMouseLeave={handleMouseLeave}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
                onScroll={handleScroll}
                style={{
                  gap: '10px',
                  paddingLeft: '0',
                  overflowX: 'auto',
                  WebkitOverflowScrolling: 'touch' // Ensures smooth momentum scroll on iOS
                }}
              >
                {displayCourses.map((course, index) => {
                  return (
                    <div
                      key={`infinite-${index}-${course.id}`} // Index key essential for duplicates
                      className='programme-card-wrapper'
                      style={{
                        flex: '0 0 auto',
                        width: '237px', // Fixed width as requested
                        minWidth: '237px',
                        // scrollSnapAlign removed for free-flowing smooth scroll
                      }}
                    >
                      <div className='programme-card'>
                        <div className='programme-card__thumb' style={{ position: "relative", overflow: "hidden" }}>
                          {course.thumbnail ? (
                            <>
                              {!thumbLoaded[course.id] ? <div className='programme-thumb-loading' aria-hidden='true' /> : null}
                              <img
                                src={course.thumbnail}
                                alt={course.title}
                                loading='lazy'
                                draggable={false}
                                onLoad={() => setThumbLoaded((prev) => ({ ...prev, [course.id]: true }))}
                                style={!thumbLoaded[course.id] ? { visibility: "hidden" } : undefined}
                              />
                            </>
                          ) : (
                            <div className='programme-card__thumb--placeholder' aria-hidden='true' />
                          )}
                        </div>

                        <div className='programme-card__body'>
                          <div className='programme-card__text-area'>
                            <h3 className='programme-card__title'>
                              <Link to={course.href}>{course.title}</Link>
                            </h3>
                            <p className='programme-card__summary text-sm'>{course.summary}</p>
                          </div>

                          <div className='programme-card__rating-row'>
                            <div className="programme-card__program-type">
                              <span className="icon-badge"></span>
                              {course.programType}
                            </div>
                            <div className='programme-card__rating'>
                              <span className="star-icon">★</span>
                              <span className="rating-val">{course.rating}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className='programme-card__footer'>
                        <div className="programme-card__meta-item">
                          <LevelIcon level={course.level} />
                          {course.level}
                        </div>
                        <div className="programme-card__meta-item">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="meta-icon" style={{ marginRight: '6px' }}>
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                          </svg>
                          {course.scheduleLabel || course.durationHours}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </section >
  );
};

export default ProgrammesAndCourses;
