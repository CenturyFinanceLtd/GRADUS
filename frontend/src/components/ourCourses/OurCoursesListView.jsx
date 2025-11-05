import { useMemo, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { PROGRAMMES } from "../../data/programmes.js";
import { slugify, stripBrackets } from "../../utils/slugify.js";

const OurCoursesListView = () => {
  const courses = useMemo(() => {
    const out = [];
    PROGRAMMES.forEach((p) => {
      (p.courses || []).forEach((c) => {
        const clean = stripBrackets(c);
        out.push({
          programme: p.title,
          programmeSlug: slugify(p.title),
          name: clean,
          url: `/${slugify(p.title)}/${slugify(c)}`,
          order: out.length, // preserve insertion order for old/new sorting
        });
      });
    });
    return out;
  }, []);

  const programmeOptions = useMemo(
    () => PROGRAMMES.map((p) => ({ id: slugify(p.title), title: p.title, count: (p.courses || []).length })),
    []
  );

  const [selectedProgrammes, setSelectedProgrammes] = useState([]);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("new"); // 'alpha' | 'new' | 'old'
  const [sidebarActive, setSidebarActive] = useState(false);
  const sidebarControl = () => setSidebarActive((p) => !p);

  const location = useLocation();
  const navigate = useNavigate();

  // Parse filters from URL on load and when URL changes
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const programmesParam = params.get("programme") || params.get("programmes");
    const qParam = params.get("q") || "";
    const sParam = params.get("sort") || "new";
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
  }, [location.search, programmeOptions]);

  const updateUrl = (progs, q, s = sort) => {
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
    const search = params.toString();
    navigate(`${location.pathname}${search ? `?${search}` : ""}`, { replace: true });
  };

  const toggleProgramme = (id) => {
    setSelectedProgrammes((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      updateUrl(next, query);
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedProgrammes([]);
    updateUrl([], query);
  };
  const resetFilters = () => {
    setSelectedProgrammes([]);
    setQuery("");
    updateUrl([], "");
  };

  const filteredCourses = useMemo(() => {
    let list = courses;
    if (selectedProgrammes.length) {
      const set = new Set(selectedProgrammes);
      list = list.filter((c) => set.has(c.programmeSlug));
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
    return arr;
  }, [courses, selectedProgrammes, query, sort]);

  const handleSortChange = (e) => {
    const value = e.target.value;
    setSort(value);
    updateUrl(selectedProgrammes, query, value);
  };

  return (
    <section className='course-list-view py-120'>
      <div className={`side-overlay ${sidebarActive ? "show" : ""}`} onClick={() => setSidebarActive(false)} />
      <div className='container'>
        <div className='row'>
          {/* Sidebar (static UI to match layout) */}
          <div className='col-lg-4'>
            <div className={`sidebar rounded-12 bg-main-25 p-32 border border-neutral-30 ${sidebarActive ? "active" : ""}`}>
              <div className='flex-between mb-24'>
                <h4 className='mb-0'>Filter</h4>
                <button
                  type='button'
                  onClick={sidebarControl}
                  className='sidebar-close text-xl text-neutral-500 d-lg-none hover-text-main-600'
                  aria-label='Close filters'
                  title='Close filters'
                >
                  <i className='ph-bold ph-x' />
                </button>
              </div>
              <div className='position-relative'>
                <input
                  type='text'
                  className='common-input pe-48 rounded-pill'
                  placeholder='Search courses…'
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <button
                  type='button'
                  className='text-neutral-500 text-xl d-flex position-absolute top-50 translate-middle-y inset-inline-end-0 me-24'
                  onClick={() => setQuery("")}
                  title='Clear search'
                >
                  <i className='ph-bold ph-magnifying-glass' />
                </button>
              </div>
              <span className='d-block border border-neutral-30 border-dashed my-24' />
              <h6 className='text-lg mb-12 fw-medium'>Programmes</h6>
              <div className='d-flex flex-column gap-12'>
                {programmeOptions.map((opt) => (
                  <label key={opt.id} className='flex-between gap-12 cursor-pointer'>
                    <span className='form-check common-check mb-0'>
                      <input
                        className='form-check-input'
                        type='checkbox'
                        checked={selectedProgrammes.includes(opt.id)}
                        onChange={() => toggleProgramme(opt.id)}
                      />
                      <span className='form-check-label fw-normal flex-grow-1'>
                        {opt.title}
                      </span>
                    </span>
                    <span className='text-neutral-500'>{opt.count}</span>
                  </label>
                ))}
                {selectedProgrammes.length ? (
                  <button type='button' onClick={clearSelection} className='btn btn-sm btn-outline-main rounded-pill mt-8 align-self-start'>
                    Clear selection
                  </button>
                ) : null}
                <span className='d-block border border-neutral-30 border-dashed my-24' />
                <button
                  type='button'
                  onClick={resetFilters}
                  className='btn btn-outline-main rounded-pill flex-center gap-16 fw-semibold w-100'
                >
                  <i className='ph-bold ph-arrow-clockwise d-flex text-lg' />
                  Reset Filters
                </button>
              </div>
            </div>
          </div>

          {/* List view */}
          <div className='col-lg-8'>
            <div className='course-list-wrapper'>
              <div className='flex-between gap-16 flex-wrap mb-40'>
                <span className='text-neutral-500'>Showing {filteredCourses.length} Results</span>
                <div className='flex-align gap-16'>
                  <div className='flex-align gap-8'>
                    <span className='text-neutral-500 flex-shrink-0'>Sort By :</span>
                    <select
                      className='form-select ps-20 pe-28 py-8 fw-medium rounded-pill bg-main-25 border border-neutral-30 text-neutral-700'
                      value={sort}
                      onChange={handleSortChange}
                    >
                      <option value='alpha'>Alphabetical (A–Z)</option>
                      <option value='new'>New to Old</option>
                      <option value='old'>Old to New</option>
                    </select>
                  </div>
                  <button
                    type='button'
                    onClick={sidebarControl}
                    className='list-bar-btn text-xl w-40 h-40 bg-main-600 text-white rounded-8 flex-center d-lg-none'
                    aria-label='Open filters'
                    title='Open filters'
                  >
                    <i className='ph-bold ph-funnel' />
                  </button>
                </div>
              </div>

              <div className='row gy-4'>
                {filteredCourses.map((course, idx) => (
                  <div className='col-12' key={`${course.programme}-${course.name}-${idx}`}>
                    <div className='course-item bg-main-25 rounded-16 p-12 h-100 border border-neutral-30 list-view'>
                      <div className='course-item__thumb rounded-12 overflow-hidden position-relative'>
                        <Link to={course.url} className='w-100 h-100'>
                          <img src='/assets/images/thumbs/course-img1.png' alt={course.name} className='course-item__img rounded-12 cover-img transition-2' />
                        </Link>
                        <div className='flex-align gap-8 bg-main-600 rounded-pill px-24 py-12 text-white position-absolute inset-block-start-0 inset-inline-start-0 mt-20 ms-20 z-1'>
                          <span className='text-2xl d-flex'><i className='ph ph-clock' /></span>
                          <span className='text-lg fw-medium'>Self-paced</span>
                        </div>
                        <button type='button' className='wishlist-btn w-48 h-48 bg-white text-main-two-600 flex-center position-absolute inset-block-start-0 inset-inline-end-0 mt-20 me-20 z-1 text-2xl rounded-circle transition-2'>
                          <i className='ph ph-heart' />
                        </button>
                      </div>
                      <div className='course-item__content flex-grow-1'>
                        <div>
                          <h4 className='mb-28'>
                            <Link to={course.url} className='link text-line-2'>
                              {course.name}
                            </Link>
                          </h4>
                          <div className='flex-between gap-8 flex-wrap mb-16'>
                            <div className='flex-align gap-8'>
                              <span className='text-neutral-700 text-2xl d-flex'><i className='ph-bold ph-video-camera' /></span>
                              <span className='text-neutral-700 text-lg fw-medium'>20 Lessons</span>
                            </div>
                            <div className='flex-align gap-8'>
                              <span className='text-neutral-700 text-2xl d-flex'><i className='ph-bold ph-chart-bar' /></span>
                              <span className='text-neutral-700 text-lg fw-medium'>Beginner</span>
                            </div>
                          </div>
                        </div>
                        <div className='flex-between gap-8 pt-24 border-top border-neutral-50 mt-28 border-dashed border-0'>
                          <h4 className='mb-0 text-main-two-600'>Free</h4>
                          <Link to={course.url} className='flex-align gap-8 text-main-600 hover-text-decoration-underline transition-1 fw-semibold' tabIndex={0}>
                            Explore
                            <i className='ph ph-arrow-right' />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default OurCoursesListView;
