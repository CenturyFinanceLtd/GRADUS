import { useMemo, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { API_BASE_URL } from "../../services/apiClient";
import { stripBrackets } from "../../utils/slugify.js";

const FLAGSHIP_PRICE_INR = 46000;
const INR_CURRENCY_FORMATTER = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const OurCoursesListView = () => {
  // Loaded courses from backend
  const [items, setItems] = useState([]);
  const courses = useMemo(() => items, [items]);

  const [selectedProgrammes, setSelectedProgrammes] = useState([]);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("new"); // 'alpha' | 'new' | 'old'
  const [flagshipOnly, setFlagshipOnly] = useState(false);
  const [sidebarActive, setSidebarActive] = useState(false);
  const sidebarControl = () => setSidebarActive((p) => !p);

  const location = useLocation();
  const navigate = useNavigate();

  const programmeLabel = (slug) => {
    const map = { 'gradus-x': 'Gradus X', 'gradus-finlit': 'Gradus Finlit', 'gradus-lead': 'Gradus Lead' };
    return map[slug] || (slug ? slug.replace(/-/g, ' ') : '');
  };

  // Fetch courses from backend when sort changes (server supports sort=new; others are client-side)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const qs = sort === 'new' ? '?sort=new' : '';
        const resp = await fetch(`${API_BASE_URL}/courses${qs}`, { credentials: 'include' });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        const mapped = (Array.isArray(data?.items) ? data.items : []).map((it, idx) => {
          const slug = it.slug || it.id || '';
          const [progSlug] = String(slug).split('/');
          const ts = Date.parse(it.updatedAt || it.createdAt || 0) || idx;
          return {
            programme: it.programme || programmeLabel(progSlug),
            programmeSlug: progSlug,
            name: stripBrackets(it.name || ''),
            url: `/${slug}`,
            order: ts,
            priceINR: Number(it.priceINR || 0),
            level: it.level || '',
            mode: it.mode || '',
            duration: it.duration || '',
            modulesCount: Number(it.modulesCount || 0),
            imageUrl: it.imageUrl || (it.image && it.image.url) || '',
          };
        });
        if (!cancelled) setItems(mapped);
      } catch (e) {
        if (!cancelled) {
          setItems([]);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [sort]);

  // Build dynamic programme filter options from loaded courses
  const programmeOptions = useMemo(() => {
    const counts = new Map();
    courses.forEach((c) => counts.set(c.programmeSlug, (counts.get(c.programmeSlug) || 0) + 1));
    return Array.from(counts.entries()).map(([id, count]) => ({ id, title: programmeLabel(id), count }));
  }, [courses]);
  const flagshipCount = useMemo(
    () => courses.filter((c) => Number(c.priceINR) === FLAGSHIP_PRICE_INR).length,
    [courses]
  );

  // Parse filters from URL on load and when URL or available programme options change
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const programmesParam = params.get("programme") || params.get("programmes");
    const qParam = params.get("q") || "";
    const sParam = params.get("sort") || "new";
    const flagshipParam = params.get("flagship");
    const available = new Set(programmeOptions.map((p) => p.id));
    if (programmesParam) {
      const parsed = programmesParam
        .split(",")
        .map((s) => s.trim())
        .filter((s) => available.has(s));
      setSelectedProgrammes(parsed);
    } else {
      setSelectedProgrammes([]);
    }
    setQuery(qParam);
    setSort(["alpha", "new", "old"].includes(sParam) ? sParam : "new");
    setFlagshipOnly(flagshipParam === "1");
  }, [location.search, programmeOptions]);

  const updateUrl = (progs, q, s = sort, flagship = flagshipOnly) => {
    const params = new URLSearchParams(location.search);
    if (progs && progs.length) {
      params.set("programme", progs.join(","));
    } else {
      params.delete("programme");
    }
    if (typeof q === "string") {
      if (q.trim()) params.set("q", q.trim());
      else params.delete("q");
    }
    if (s && ["alpha", "new", "old"].includes(s)) {
      params.set("sort", s);
    } else {
      params.delete("sort");
    }
    if (flagship) {
      params.set("flagship", "1");
    } else {
      params.delete("flagship");
    }
    const search = params.toString();
    navigate(`${location.pathname}${search ? `?${search}` : ""}`, { replace: true });
  };

  const toggleProgramme = (id) => {
    setSelectedProgrammes((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      updateUrl(next, query, sort, flagshipOnly);
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedProgrammes([]);
    updateUrl([], query, sort, flagshipOnly);
  };
  const resetFilters = () => {
    setSelectedProgrammes([]);
    setQuery("");
    setFlagshipOnly(false);
    updateUrl([], "", sort, false);
  };
  const toggleFlagshipOnly = () => {
    setFlagshipOnly((prev) => {
      const next = !prev;
      updateUrl(selectedProgrammes, query, sort, next);
      return next;
    });
  };

  const filteredCourses = useMemo(() => {
    let list = courses;
    if (selectedProgrammes.length) {
      const set = new Set(selectedProgrammes);
      list = list.filter((c) => set.has(c.programmeSlug));
    }
    if (flagshipOnly) {
      list = list.filter((c) => Number(c.priceINR) === FLAGSHIP_PRICE_INR);
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q));
    }
    // Apply sorting
    const arr = list.slice();
    if (sort === "alpha") {
      arr.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === "old") {
      arr.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    } else {
      // 'new' default: reverse insertion order
      arr.sort((a, b) => (b.order ?? 0) - (a.order ?? 0));
    }
    const flagship = [];
    const regular = [];
    arr.forEach((course) => (Number(course.priceINR) === FLAGSHIP_PRICE_INR ? flagship.push(course) : regular.push(course)));
    return [...flagship, ...regular];
  }, [courses, selectedProgrammes, query, sort, flagshipOnly]);

  const handleSortChange = (e) => {
    const value = e.target.value;
    setSort(value);
    updateUrl(selectedProgrammes, query, value, flagshipOnly);
  };

  const appliedFilters = useMemo(() => {
    const tags = [];
    if (query.trim()) {
      tags.push(`Search: "${query.trim()}"`);
    }
    if (selectedProgrammes.length) {
      selectedProgrammes.forEach((slug) => tags.push(programmeLabel(slug)));
    } else {
      tags.push("All Programmes");
    }
    tags.push(flagshipOnly ? "Job Gurrantee" : "All Types");
    return tags;
  }, [selectedProgrammes, flagshipOnly, query]);

  const headingLabel = query.trim()
    ? `${query.trim()} Courses`
    : selectedProgrammes.length === 1
    ? `${programmeLabel(selectedProgrammes[0])}`
    : "All Courses";

  return (
    <section className='courses-archive pb-64'>
      <div
        className={`courses-archive__overlay ${sidebarActive ? "is-visible" : ""}`}
        onClick={() => setSidebarActive(false)}
      />
      <div className='container container--xl'>

        <div className='courses-archive__grid'>
          <aside className={`courses-filters ${sidebarActive ? "is-open" : ""}`}>
            <div className='courses-filters__head'>
              <h4>Filters</h4>
              <button
                type='button'
                className='d-lg-none text-xl text-neutral-500'
                onClick={sidebarControl}
                aria-label='Close filters'
              >
                <i className='ph-bold ph-x' />
              </button>
            </div>

            <div className='courses-filters__section'>
              <div className='d-flex justify-content-between align-items-center mb-12'>
                <p className='mb-0 fw-semibold'>Applied Filters</p>
                <button type='button' className='btn-link text-sm' onClick={resetFilters}>
                  clear all
                </button>
              </div>
              {appliedFilters.length ? (
                <div className='filters-tags'>
                  {appliedFilters.map((tag, index) => (
                    <span className='filters-tag' key={`${tag}-${index}`}>
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            <div className='courses-filters__section'>
              <p className='filters__group-title fw-semibold'>Programmes</p>
              <div className='filters__list'>
                <label className='filters__option'>
                  <div className='d-flex align-items-center gap-8 flex-grow-1'>
                    <input
                      type='checkbox'
                      checked={selectedProgrammes.length === 0}
                      onChange={() => resetFilters()}
                    />
                    <span>All</span>
                  </div>
                  <span className='text-neutral-500 text-sm'>{courses.length}</span>
                </label>
                {programmeOptions.map((opt) => (
                  <label className='filters__option' key={opt.id}>
                    <div className='d-flex align-items-center gap-8 flex-grow-1'>
                      <input
                        type='checkbox'
                        checked={selectedProgrammes.includes(opt.id)}
                        onChange={() => toggleProgramme(opt.id)}
                      />
                      <span>{opt.title}</span>
                    </div>
                    <span className='text-neutral-500 text-sm'>{opt.count}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className='courses-filters__section'>
              <p className='filters__group-title fw-semibold'>Category</p>
              <div className='filters__list'>
                <label className='filters__option'>
                  <div className='d-flex align-items-center gap-8 flex-grow-1'>
                    <input type='checkbox' checked={!flagshipOnly} onChange={toggleFlagshipOnly} />
                    <span>All</span>
                  </div>
                  <span className='text-neutral-500 text-sm'>{courses.length}</span>
                </label>
                <label className='filters__option'>
                  <div className='d-flex align-items-center gap-8 flex-grow-1'>
                    <input type='checkbox' checked={flagshipOnly} onChange={toggleFlagshipOnly} />
                    <span>Job Gurrantee</span>
                  </div>
                  <span className='text-neutral-500 text-sm'>{flagshipCount}</span>
                </label>
              </div>
            </div>

            <button type='button' className='btn btn-outline-main w-100 rounded-pill' onClick={resetFilters}>
              Reset Filters
            </button>
          </aside>

          <div className='courses-results'>
            <div className='courses-results__head'>
              <div>
                <nav className='courses-breadcrumb'>
                  <Link to='/'>Home</Link>
                  <span>/</span>
                  <span>Search</span>
                  <span>/</span>
                  <strong>{headingLabel}</strong>
                </nav>
                <div className='d-flex flex-wrap align-items-center gap-12'>
                  <h2 className='mb-0'>{headingLabel}</h2>
                  <span className='text-neutral-500'>{filteredCourses.length} Results</span>
                </div>
              </div>
              <div className='courses-results__actions'>
                <button
                  type='button'
                  className='btn btn-outline-main d-lg-none'
                  onClick={sidebarControl}
                >
                  <i className='ph-bold ph-funnel' /> Filters
                </button>
                <label className='courses-sort'>
                  <span className='text-sm text-neutral-500'>Sort by</span>
                  <select value={sort} onChange={handleSortChange}>
                    <option value='alpha'>Alphabetical (A–Z)</option>
                    <option value='new'>New to Old</option>
                    <option value='old'>Old to New</option>
                  </select>
                </label>
              </div>
            </div>

            <div className='courses-card-grid'>
              {filteredCourses.map((course, idx) => {
                const priceValue = Number(course.priceINR) || 0;
                const isFlagship = priceValue === FLAGSHIP_PRICE_INR;
                const priceLabel = priceValue > 0 ? INR_CURRENCY_FORMATTER.format(priceValue) : "Free";
                const durationLabel =
                  course.duration || (course.modulesCount ? `${course.modulesCount} Modules` : "12 Weeks");
                const levelLabel = course.level || "Beginner";
                const ratingLabel = course.ratingLabel || "5.0 (10 Reviews)";

                return (
                  <article
                    key={`${course.programme}-${course.name}-${idx}`}
                    className={`course-card ${isFlagship ? "is-flagship" : ""}`}
                  >
                    <div className='course-card__thumb'>
                      <Link to={course.url}>
                        <img
                          src={course.imageUrl || "/assets/images/thumbs/course-img1.png"}
                          alt={course.name}
                        />
                      </Link>
                      <div className='course-card__thumb-meta'>
                        <span>{course.programme || "Programme"}</span>
                        {isFlagship ? <span className='badge'>Job Gurrantee</span> : null}
                      </div>
                    </div>
                    <div className='course-card__body'>
                      {/* <p className='course-card__duration'>{durationLabel}</p> */}
                      <h3 className='course-card__title'>
                        <Link to={course.url}>{course.name}</Link>
                      </h3>
                      <div className='course-card__meta'>
                        <span>
                          <i className='ph-bold ph-clock' /> {durationLabel}
                        </span>
                        <span>
                          <i className='ph-bold ph-star' /> {ratingLabel}
                        </span>
                        <span>
                          <i className='ph-bold ph-chart-bar' /> {levelLabel}
                        </span>
                      </div>
                      <div className='course-card__price-row'>
                        <div>
                          <p className='course-card__price mb-0'>{priceLabel}</p>
                          <small className='text-neutral-500'>(+18% GST)</small>
                        </div>
                        <div className='course-card__actions'>
                          <Link to={course.url} className='btn btn-main'>
                            Enroll Now
                          </Link>
                          <button type='button' className='btn-icon' aria-label='Save course'>
                            <i className='ph ph-heart' />
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default OurCoursesListView;
