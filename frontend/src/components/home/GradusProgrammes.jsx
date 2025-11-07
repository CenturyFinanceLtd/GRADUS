import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { slugify } from "../../utils/slugify.js";

// Standalone section matching the reference layout with
// colored, differentiated programme cards.
const GradusProgrammes = () => {
  // Base cards spec (title, theme and programme slug)
  const BASE_CARDS = [
    {
      id: "gradusx",
      badge: "GradusX",
      title: "Technology Programmes",
      theme: "gp-theme-blue",
      programmeSlug: "gradus-x",
      courses: [
        { slug: "python-programming", title: "Python Programming" },
        {
          slug: "full-stack-development-mastery-mern",
          title: "Full Stack Development Mastery (MERN)",
          subtitle: "MERN: MongoDB • Express • React • Node.js",
        },
        { slug: "mobile-app-development", title: "Mobile App Development", subtitle: "Android / iOS" },
        { slug: "agentic-ai-engineering-program", title: "Agentic AI Engineering Program" },
        { slug: "quantum-computing-basics-program", title: "Quantum Computing Basics Program" },
        { slug: "blockchain-development-fundamentals", title: "Blockchain Development Fundamentals" },
      ],
    },
    {
      id: "gradusquity",
      badge: "Gradus Finlit",
      title: "Financial Markets",
      theme: "gp-theme-violet",
      programmeSlug: "gradus-finlit",
      courses: [
        { slug: "complete-trading-and-investment-mastery-program", title: "Complete Trading & Investment Mastery Program" },
        { slug: "technical-analysis", title: "Technical analysis" },
        { slug: "swing-trading-investing", title: "Swing trading & investing" },
        { slug: "scalping-intraday", title: "Scalping & Intraday" },
        { slug: "futures-options", title: "Futures and options" },
        { slug: "commodity-trading", title: "Commodity trading" },
        { slug: "mutual-funds-sips", title: "Mutual funds and SIPs" },
      ],
    },
    {
      id: "graduslead",
      badge: "Gradus Lead",
      title: "Leadership & Management",
      theme: "gp-theme-amber",
      programmeSlug: "gradus-lead",
      courses: [
        { slug: "nism-certification", title: "NISM Certification" },
      ],
    },
  ];

  const [cards, setCards] = useState(BASE_CARDS);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const base = (import.meta?.env?.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/$/, '');
        const resp = await fetch(`${base}/courses?sort=new`, { credentials: 'include' });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        const items = Array.isArray(data?.items) ? data.items : [];

        // Group by programmeSlug derived from the first part of the full slug
        const grouped = new Map();
        for (const it of items) {
          const full = String(it.slug || '').trim();
          if (!full.includes('/')) continue;
          const [progSlug, courseSlug] = full.split('/');
          if (!progSlug || !courseSlug) continue;
          const entry = { slug: courseSlug, title: it.name || courseSlug.replace(/-/g, ' ') };
          if (!grouped.has(progSlug)) grouped.set(progSlug, []);
          grouped.get(progSlug).push(entry);
        }

        // Build updated cards showing all courses per programme
        const updated = BASE_CARDS.map((c) => {
          const fromApi = grouped.get(c.programmeSlug) || [];
          // keep any existing explicit items at the top if present, then API items without duplicates
          const existing = Array.isArray(c.courses) ? c.courses : [];
          const seen = new Set();
          for (const e of existing) {
            if (e?.slug) seen.add(e.slug);
            const norm = slugify(e?.title || e?.name || '');
            if (norm) seen.add(norm);
          }
          const filtered = [];
          for (const e of fromApi) {
            const norm = slugify(e?.title || e?.name || '');
            const cands = [e?.slug, norm].filter(Boolean);
            const dup = cands.some((k) => seen.has(k));
            if (!dup) {
              filtered.push(e);
              cands.forEach((k) => seen.add(k));
            }
          }
          // hide “Data Structures & Algorithms” and “Database Management”
          const HIDE = new Set(['data-structures-algorithms','database-management','database-management-sql-mongodb']);
          const shouldHide = (item) => {
            const slug = String(item?.slug || '').toLowerCase();
            const norm = slugify(item?.title || item?.name || '');
            return HIDE.has(slug) || HIDE.has(norm) || norm.includes('data-structures') || norm.includes('database');
          };
          const merged = existing.concat(filtered).filter((it) => !shouldHide(it));
          return { ...c, courses: merged };
        });

        if (!cancelled) setCards(updated);
      } catch (e) {
        // Silently keep BASE_CARDS on failure
        console.warn('[GradusProgrammes] Failed to load dynamic courses:', e?.message || e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <section className="gradus-programmes py-64 position-relative z-1">
      <div className="container">
        <div className="row justify-content-center text-center">
          <div className="col-xl-8 col-lg-9">
            <h2 className="mb-8 text-neutral-900">Gradus Programmes</h2>
            <p className="mb-0 text-neutral-600">
              Explore our flagship tracks across Technology, Finance and Leadership.
            </p>
          </div>
        </div>

        <div className="row gy-4 mt-40">
          {cards.map((c) => (
            <div className="col-lg-4 col-md-12" key={c.id}>
              <div className={`gp-card bg-white rounded-24 border border-neutral-30 box-shadow-md overflow-hidden position-relative ${c.theme}`}>
                <div className="gp-art w-100 h-100"></div>
                <div className="row g-0 align-items-end position-relative z-1 h-100">
                  <div className="col-12 col-lg-12 p-24 gp-content">
                    <Link
                      to={`/our-courses?programme=${c.programmeSlug || slugify(c.badge || c.title)}`}
                      className="gp-badge fw-semibold text-md mb-8"
                      title={`View ${c.badge} courses`}
                    >
                      {c.badge}
                    </Link>
                    <h4 className="text-neutral-900 mb-16">{c.title}</h4>
                    {Array.isArray(c.courses) ? (
                      <div className="gp-course-list mb-20">
                        {c.courses.map((course) => (
                          <Link
                            key={`${c.id}-${course.slug}`}
                            to={`/${c.programmeSlug || slugify(c.badge)}/${course.slug || slugify(course.title)}`}
                            className="gp-course-item"
                          >
                            <span className="gp-course-text">
                              <span className="gp-course-title">{course.title}</span>
                            </span>
                          </Link>
                        ))}
                      </div>
                    ) : null}
                    <Link to={`/our-courses?programme=${c.programmeSlug || slugify(c.badge || c.title)}`}
                          className="btn btn-main rounded-pill flex-align gap-8 px-24 py-12 gp-cta">
                      Explore Courses <i className="ph-bold ph-arrow-up-right d-flex text-lg" />
                    </Link>
                  </div>
                  </div>
                </div>
              </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default GradusProgrammes;
