import { Link } from "react-router-dom";
import { slugify } from "../../utils/slugify.js";

// Standalone section matching the reference layout with
// colored, differentiated programme cards.
const GradusProgrammes = () => {
  const cards = [
    {
      id: "gradusx",
      badge: "GradusX",
      title: "Technology Programmes",
      theme: "gp-theme-blue",
      courses: [
        { slug: "python-programming", title: "Python Programming" },
        { slug: "data-structures-algorithms", title: "Data Structures & Algorithms" },
        {
          slug: "full-stack-development",
          title: "Full Stack Development",
          subtitle: "HTML, CSS, JavaScript, React, etc.",
        },
        { slug: "mobile-app-development", title: "Mobile App Development", subtitle: "Android / iOS" },
        { slug: "database-management", title: "Database Management", subtitle: "SQL, MongoDB" },
      ],
    },
    {
      id: "gradusquity",
      badge: "Gradus Finlit",
      title: "Financial Markets",
      theme: "gp-theme-violet",
      courses: [
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
      courses: [
        { slug: "nism-certification", title: "NISM Certification" },
      ],
    },
  ];

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
                      to={`/our-courses?programme=${slugify(c.badge || c.title)}`}
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
                            to={`/${slugify(c.badge)}/${slugify(course.title)}`}
                            className="gp-course-item"
                          >
                            <span className="gp-course-text">
                              <span className="gp-course-title">{course.title}</span>
                            </span>
                          </Link>
                        ))}
                      </div>
                    ) : null}
                    <Link to={`/our-courses?programme=${slugify(c.badge || c.title)}`}
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
