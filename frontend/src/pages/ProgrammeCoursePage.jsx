import { useMemo, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import FooterOne from "../components/FooterOne";
import HeaderOne from "../components/HeaderOne";
import Animation from "../helper/Animation";
import Preloader from "../helper/Preloader";
import { PROGRAMMES } from "../data/programmes.js";
import { slugify, stripBrackets } from "../utils/slugify.js";

// Build a structured, Coursera-like default content model for any course name
const buildDefaultContent = (courseName, programmeTitle) => {
  const cleanName = stripBrackets(courseName || "");
  const short = cleanName.split(":")[0];

  return {
    subtitle: `This course is part of ${programmeTitle}. Learn more`,
    outcomes: [
      `Describe the core concepts behind ${short} and how they are applied in real projects`,
      `Use modern tools and workflows to build, test, and iterate`,
      `Develop hands-on proficiency through guided labs and assignments`,
      `Showcase a capstone project demonstrating practical mastery`,
    ],
    skills: [
      "Problem Solving",
      "Project Work",
      "Collaboration",
      "Best Practices",
      "Foundations",
      short,
    ],
    details: [
      { icon: "ph-bold ph-seal-check", title: "Shareable certificate", desc: "Add to your Gradus profile" },
      { icon: "ph-bold ph-identification-badge", title: "Assessments", desc: "Projects & assignments" },
      { icon: "ph-bold ph-translate", title: "Taught in English", desc: "In-language available" },
    ],
    stats: {
      modules: 5,
      rating: 4.6,
      ratingCount: "2,200+",
      level: "Beginner level",
      schedule: "Flexible schedule",
      completion: "96% completed this course",
    },
    weeks: [
      {
        title: `Introduction to ${short}`,
        hours: "3 hours to complete",
        points: [
          "Orientation & course expectations",
          "Tools setup and quick wins",
          "First mini-project",
        ],
      },
      {
        title: `${short} Fundamentals`,
        hours: "4 hours to complete",
        points: ["Core concepts", "Practice exercises", "Knowledge checks"],
      },
      {
        title: `Working with ${short} in practice`,
        hours: "5 hours to complete",
        points: ["Applied examples", "Real-world patterns", "Debugging & iteration"],
      },
      {
        title: `Projects and case studies`,
        hours: "5 hours to complete",
        points: ["Guided project", "Peer review", "Refactor & improve"],
      },
      {
        title: "Capstone & next steps",
        hours: "2 hours to complete",
        points: ["Final project", "Submission & feedback", "Career pointers"],
      },
    ],
  };
};

const StatPill = ({ icon, label, sub }) => (
  <div className='flex-align gap-10 px-16 py-12 rounded-12 bg-white border border-neutral-30'>
    <i className={`ph-bold ${icon} d-inline-flex text-main-600`} />
    <div className='d-flex flex-column'>
      <span className='fw-semibold text-neutral-900'>{label}</span>
      {sub ? <span className='text-neutral-600 text-sm'>{sub}</span> : null}
    </div>
  </div>
);

const ProgrammeCoursePage = () => {
  const { programme: programmeSlug, course: courseSlug } = useParams();

  const { programme, course } = useMemo(() => {
    const prog = PROGRAMMES.find((p) => slugify(p.title) === programmeSlug) || null;
    const courseName = prog?.courses?.find((c) => slugify(c) === courseSlug) || null;
    return { programme: prog, course: courseName };
  }, [programmeSlug, courseSlug]);

  const displayCourse = course ? stripBrackets(course) : null;

  if (!programme || !course) {
    return (
      <>
        <Preloader />
        <Animation />
        <HeaderOne />
        <section className='py-120'>
          <div className='container text-center'>
            <h1 className='mb-12'>Course not found</h1>
            <p className='text-neutral-600 mb-24'>The requested programme or course does not exist. Please browse our programmes below.</p>
            <div className='d-flex flex-wrap justify-content-center gap-12'>
              {PROGRAMMES.map((p) => (
                <Link key={p.title} to={p.anchor} className='btn btn-outline-main-600'>
                  {p.title}
                </Link>
              ))}
            </div>
          </div>
        </section>
        <FooterOne />
      </>
    );
  }

  const content = buildDefaultContent(displayCourse, programme.title);
  const half = Math.ceil((content.outcomes || []).length / 2);
  const headerHeight = 88;

  // Smooth scroll to sections with header offset
  const scrollTo = (id) => (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    const el = typeof document !== 'undefined' ? document.getElementById(id) : null;
    if (!el) return;
    const headerOffset = headerHeight + 6; // keep just below sticky site header
    const y = el.getBoundingClientRect().top + window.pageYOffset - headerOffset;
    window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
  };

  const [activeTab, setActiveTab] = useState('about');
  const [showSticky, setShowSticky] = useState(false);
  useEffect(() => {
    const ids = ['about', 'outcomes', 'modules'];
    const handler = () => {
      const headerOffset = headerHeight + 22;
      const positions = ids.map((id) => {
        const el = document.getElementById(id);
        if (!el) return { id, dist: Infinity };
        const rect = el.getBoundingClientRect();
        return { id, dist: Math.abs(rect.top - headerOffset) };
      });
      positions.sort((a, b) => a.dist - b.dist);
      if (positions.length) setActiveTab(positions[0].id);

      // Toggle sticky bar visibility after passing the hero area (around the About section)
      const aboutEl = document.getElementById('about');
      const trigger = aboutEl ? Math.max(0, aboutEl.offsetTop - (headerHeight + 40)) : 180;
      setShowSticky(window.pageYOffset > trigger);
    };
    handler();
    window.addEventListener('scroll', handler, { passive: true });
    window.addEventListener('resize', handler);
    return () => {
      window.removeEventListener('scroll', handler);
      window.removeEventListener('resize', handler);
    };
  }, [programmeSlug, courseSlug]);

  return (
    <>
      <Preloader />
      <Animation />
      <HeaderOne />

      {/* Hero */}
      <section className='py-40 bg-main-25 border-bottom border-neutral-40'>
        <div className='container'>
          <div className='d-flex flex-wrap align-items-start justify-content-between gap-16'>
            <div className='flex-grow-1 min-w-0'>
              <nav aria-label='Breadcrumb' className='mb-8 text-sm'>
                <ol className='d-flex align-items-center gap-10 list-unstyled m-0'>
                  <li>
                    <a href='#about' onClick={scrollTo('about')} className='d-inline-flex align-items-center gap-6 text-neutral-600'>
                      <i className='ph-bold ph-house' />
                      <span>Home</span>
                    </a>
                  </li>
                  <li className='text-neutral-500'><i className='ph-bold ph-caret-right' /></li>
                  <li><Link to='/our-courses' className='link'>Browse</Link></li>
                  <li className='text-neutral-500'><i className='ph-bold ph-caret-right' /></li>
                  <li><Link to={programme.anchor} className='link'>{programme.title}</Link></li>
                  <li className='text-neutral-500'><i className='ph-bold ph-caret-right' /></li>
                  <li className='text-neutral-700 fw-medium'>{displayCourse}</li>
                </ol>
              </nav>
              <h1 className='mb-12 text-neutral-900'>{displayCourse}</h1>
              <p className='text-neutral-600 mb-0'>{content.subtitle}</p>
            </div>
            <div className='d-flex flex-column gap-12'>
              <Link to={`/payment?course=${encodeURIComponent(courseSlug)}`} className='btn btn-main w-100'>Enroll Now</Link>
              <span className='text-center text-sm text-neutral-600'>176,437 already enrolled</span>
            </div>
          </div>

          
        </div>
      </section>

      {/* Stats bar on card (overlay style) */}
      <section className='py-0'>
        <div className='container'>
          <div className='rounded-16 bg-white border border-neutral-40 box-shadow-md p-16' style={{ marginTop: -28, position: 'relative', zIndex: 2 }}>
            <div className='d-grid' style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              <StatPill icon='ph-list-bullets' label={`${content.stats.modules} modules`} sub='Hands-on projects included' />
              <StatPill icon='ph-star' label={`${content.stats.rating} ★`} sub={`${content.stats.ratingCount} ratings`} />
              <StatPill icon='ph-rocket-launch' label={content.stats.level} sub='No prior experience required' />
              <StatPill icon='ph-calendar-check' label={content.stats.schedule} sub='Learn at your own pace' />
              <StatPill icon='ph-target' label={content.stats.completion} sub='Most learners finish' />
            </div>
          </div>
        </div>
      </section>

      {/* Sticky tabs + compact header (hidden until scrolled) */}
      {showSticky ? (
        <section className='py-0'>
          <div className='container'>
            <div className='bg-white' style={{ position: 'sticky', top: 64, zIndex: 30 }}>
              <div className='d-flex justify-content-between align-items-center gap-12 py-10 border-bottom border-neutral-200'>
                <h6 className='mb-0 text-neutral-900'>{displayCourse}</h6>
                <Link to={`/payment?course=${encodeURIComponent(courseSlug)}`} className='btn btn-main btn-sm rounded-pill'>Enroll Now</Link>
              </div>
              <div className='py-10 border-bottom border-neutral-200'>
                <ul role='tablist' className='d-flex flex-wrap align-items-center gap-20 list-unstyled m-0'>
                  <li>
                    <a
                      aria-current={activeTab === 'about' ? 'page' : undefined}
                      className={activeTab === 'about' ? 'px-12 py-8 rounded-8 bg-main-25 text-neutral-900 fw-semibold text-md' : 'link fw-semibold'}
                      href='#about'
                      onClick={scrollTo('about')}
                    >
                      About
                    </a>
                  </li>
                  <li>
                    <a
                      aria-current={activeTab === 'outcomes' ? 'page' : undefined}
                      className={activeTab === 'outcomes' ? 'px-12 py-8 rounded-8 bg-main-25 text-neutral-900 fw-semibold text-md' : 'link fw-semibold'}
                      href='#outcomes'
                      onClick={scrollTo('outcomes')}
                    >
                      Outcomes
                    </a>
                  </li>
                  <li>
                    <a
                      aria-current={activeTab === 'modules' ? 'page' : undefined}
                      className={activeTab === 'modules' ? 'px-12 py-8 rounded-8 bg-main-25 text-neutral-900 fw-semibold text-md' : 'link fw-semibold'}
                      href='#modules'
                      onClick={scrollTo('modules')}
                    >
                      Modules
                    </a>
                  </li>
                  <li><a className='link fw-semibold' href='#recommendations'>Recommendations</a></li>
                  <li><a className='link fw-semibold' href='#testimonials'>Testimonials</a></li>
                  <li><a className='link fw-semibold' href='#reviews'>Reviews</a></li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* Main body */}
      <section className='py-60'>
        <div className='container'>
          {/* Full-width: About */}
          <div className='row g-4'>
            <div className='col-12'>
              <div id='about' className='rounded-16 border border-neutral-30 p-24 mb-20 bg-white'>
                <h3 className='mb-16'>What you'll learn</h3>
                <div className='row g-4'>
                  <div className='col-md-6'>
                    <ul className='list-unstyled d-grid gap-16 m-0'>
                      {(content.outcomes || []).slice(0, half).map((o, i) => (
                        <li key={`outcome-left-${i}`} className='d-flex align-items-start gap-10 text-neutral-700'>
                          <i className='ph-bold ph-check text-main-600 mt-1 d-inline-flex' />
                          <span>{o}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className='col-md-6'>
                    <ul className='list-unstyled d-grid gap-16 m-0'>
                      {(content.outcomes || []).slice(half).map((o, i) => (
                        <li key={`outcome-right-${i}`} className='d-flex align-items-start gap-10 text-neutral-700'>
                          <i className='ph-bold ph-check text-main-600 mt-1 d-inline-flex' />
                          <span>{o}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className='mt-24'>
                  <h6 className='text-neutral-800 fw-semibold mb-12'>Skills you'll gain</h6>
                  <div className='d-flex flex-wrap gap-8'>
                    {content.skills.map((s, i) => (
                      <span key={`skill-${i}`} className='chip chip--neutral'>{s}</span>
                    ))}
                    <a href='#skills' className='link fw-semibold'>View all skills</a>
                  </div>
                </div>
                <div className='mt-24'>
                  <h6 className='text-neutral-900 fw-semibold mb-12'>Details to know</h6>
                  <div className='row g-4'>
                    <div className='col-md-4'>
                      <div className='d-flex align-items-start gap-12'>
                        <i className='ph-bold ph-linkedin-logo text-neutral-800 d-inline-flex text-xl' />
                        <div>
                          <div className='fw-semibold text-neutral-900'>Shareable certificate</div>
                          <div className='text-neutral-600'>Add to your LinkedIn profile</div>
                        </div>
                      </div>
                    </div>
                    <div className='col-md-4'>
                      <div className='d-flex align-items-start gap-12'>
                        <i className='ph-bold ph-note text-neutral-800 d-inline-flex text-xl' />
                        <div>
                          <div className='fw-semibold text-neutral-900'>Assessments</div>
                          <div className='text-neutral-600'>8 assignments <sup>1</sup></div>
                        </div>
                      </div>
                    </div>
                    <div className='col-md-4'>
                      <div className='d-flex align-items-start gap-12'>
                        <i className='ph-bold ph-translate text-neutral-800 d-inline-flex text-xl' />
                        <div>
                          <div className='fw-semibold text-neutral-900'>Taught in English</div>
                          <div className='text-main-600 fw-semibold'>25 languages available</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Full-width: Outcomes */}
          <div className='row g-4'>
            <div className='col-12'>
              <div id='outcomes' className='rounded-16 border border-neutral-30 p-24 mb-20 bg-white'>
                <h4 className='mb-12'>Outcomes</h4>
                <p className='text-neutral-700 mb-12'>Graduates of this course demonstrate practical capability and portfolio‑ready work.</p>
                <ul className='list-unstyled d-grid gap-10 m-0'>
                  {content.outcomes.map((o, i) => (
                    <li key={`outcome2-${i}`} className='d-flex align-items-start gap-10 text-neutral-700'>
                      <i className='ph-bold ph-check text-main-600 mt-1 d-inline-flex' />
                      <span>{o}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Full-width: Recommendations */}
          <div className='row g-4'>
            <div className='col-12'>
              <div id='recommendations' className='rounded-16 border border-neutral-30 p-24 mb-20 bg-white'>
                <div className='d-flex flex-wrap justify-content-between align-items-center gap-16'>
                  <div>
                    <h6 className='mb-8 text-neutral-900'>See how employees at top companies are mastering in‑demand skills</h6>
                    <a href='#' className='link'>Learn more about Gradus for Business</a>
                  </div>
                  <div className='d-flex align-items-center gap-12'>
                    <img src='/assets/images/partners/partner-1.png' alt='' style={{ height: 28 }} />
                    <img src='/assets/images/partners/partner-2.png' alt='' style={{ height: 28 }} />
                    <img src='/assets/images/partners/partner-3.png' alt='' style={{ height: 28 }} />
                    <img src='/assets/images/partners/partner-4.png' alt='' style={{ height: 28 }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Full-width: Expertise block */}
          <div className='row g-4'>
            <div className='col-12'>
              <div className='rounded-16 border border-neutral-30 p-24 mb-20 bg-white'>
                <h4 className='mb-12'>Build your subject-matter expertise</h4>
                <p className='text-neutral-700 mb-16'>Learn from industry-aligned mentors, complete real projects, and earn a shareable certificate to showcase your skills.</p>
                <img src='/assets/images/thumbs/about-us-five-img3.png' alt='' className='rounded-12 cover-img' />
              </div>
            </div>
          </div>

          {/* Two-column: Modules with sidebar */}
          <div className='row g-4'>
            <div className='col-12 col-lg-8'>
              <div id='modules' className='rounded-16 border border-neutral-30 p-24 mb-12 bg-white'>
                <h4 className='mb-8'>There are {content.stats.modules} modules in this course</h4>
                <p className='text-neutral-700 mb-16'>Work through the curriculum at your own pace. Each module blends concise lessons with hands-on practice.</p>

                <div className='accordion common-accordion style-three' id='course-modules-accordion'>
                  {content.weeks.map((w, idx) => (
                    <div className='accordion-item' key={`week-${idx}`}>
                      <h2 className='accordion-header'>
                        <button
                          className={`accordion-button ${idx === 0 ? "" : "collapsed"}`}
                          type='button'
                          data-bs-toggle='collapse'
                          data-bs-target={`#module-${idx}`}
                          aria-expanded={idx === 0 ? "true" : "false"}
                          aria-controls={`module-${idx}`}
                        >
                          <span className='me-10 fw-semibold'>Module {idx + 1}:</span> {w.title}
                          <span className='ms-auto text-neutral-600 text-sm'>{w.hours}</span>
                        </button>
                      </h2>
                      <div id={`module-${idx}`} className={`accordion-collapse collapse ${idx === 0 ? "show" : ""}`} data-bs-parent='#course-modules-accordion'>
                        <div className='accordion-body'>
                          <ul className='list-unstyled d-grid gap-10 mb-0'>
                            {w.points.map((p, pi) => (
                              <li key={`week-${idx}-pt-${pi}`} className='d-flex align-items-start gap-10 text-neutral-700'>
                                <i className='ph-bold ph-circle-wavy-check text-main-600 mt-1 d-inline-flex' />
                                <span>{p}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className='col-12 col-lg-4'>
              <div className='rounded-16 border border-neutral-30 p-20 bg-white mb-16'>
                <h6 className='text-neutral-800 mb-8'>Instructors <span className='text-neutral-500 fw-normal'>• {content.stats.rating} ★ ({content.stats.ratingCount})</span></h6>
                <div className='d-grid gap-10'>
                  <div className='d-flex align-items-start gap-10'>
                    <i className='ph-bold ph-user-circle text-main-600 d-inline-flex text-xl' />
                    <div>
                      <div className='fw-semibold text-neutral-900'>Gradus Mentor</div>
                      <div className='text-neutral-600 text-sm'>Industry Practitioner • 120k learners</div>
                    </div>
                  </div>
                  <div className='d-flex align-items-start gap-10'>
                    <i className='ph-bold ph-user-circle text-main-600 d-inline-flex text-xl' />
                    <div>
                      <div className='fw-semibold text-neutral-900'>Guest Expert</div>
                      <div className='text-neutral-600 text-sm'>Visiting Faculty • 27k learners</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className='rounded-16 border border-neutral-30 p-20 bg-white'>
                <h6 className='text-neutral-800 mb-8'>Offered by</h6>
                <div className='d-flex align-items-center gap-12'>
                  <img src='/assets/images/cfl.png' alt='' style={{ width: 36, height: 36 }} className='rounded-8' />
                  <div>
                    <div className='fw-semibold text-neutral-900'>Gradus India</div>
                    <div className='text-neutral-600 text-sm'>A subsidiary of Century Finance Limited</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <FooterOne />
    </>
  );
};

export default ProgrammeCoursePage;
