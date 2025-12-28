import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import apiClient from "../services/apiClient";
import FooterOne from "../components/FooterOne";
import HeaderOne from "../components/HeaderOne";
import Animation from "../helper/Animation";
import Preloader from "../helper/Preloader";

const COURSE_LOADING_CARDS = [
  {
    title: "Outcome Blueprint",
    description: "Mapping skills, tools and placement pathways tailored to this track.",
  },
  {
    title: "Curriculum Blocks",
    description: "Sequencing modules, capstone milestones and mentor touchpoints.",
  },
  {
    title: "Mentor Desk",
    description: "Confirming expert faculty, feedback loops and live sessions.",
  },
];

function ProgrammeCoursePage() {
  const { programme, course } = useParams();
  const navigate = useNavigate();
  const { token, loading: authLoading } = useAuth();
  const programmeSlug = (programme || '').trim().toLowerCase();
  const courseSlug = (course || '').trim().toLowerCase();
  const combinedSlug = `${programmeSlug}/${courseSlug}`;
  const resolveCourseSlugCandidates = (prog, course) => {
    const list = [course];
    if (prog === "gradus-x" && course === "agentic-ai-engineering-flagship") {
      list.push("agentic-ai-engineering-program");
    }
    return Array.from(new Set(list.filter(Boolean)));
  };
  const courseSlugCandidates = resolveCourseSlugCandidates(programmeSlug, courseSlug);
  const courseHomePath = programmeSlug && courseSlug ? `/${programmeSlug}/${courseSlug}/home` : '/my-courses';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Ensure we fetch after auth state is resolved so enrollment reflects correctly
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (authLoading) return;
      try {
        setLoading(true);
        setError(null);
        const headers = new Headers();
        if (token) headers.set('Authorization', `Bearer ${token}`);
        let payload = null;
        let lastStatus = null;
        for (const slugCandidate of courseSlugCandidates) {
          try {
            // apiClient.get returns the data payload directly, or throws.
            // It will automatically intercept /courses/... to use the Edge Function.
            const apiData = await apiClient.get(
              `/courses/${encodeURIComponent(programme || '')}/${encodeURIComponent(slugCandidate || '')}`,
              { token } // Pass token to allow backend to check enrollment
            );
            // If we get here, it succeeded (200 OK)
            payload = apiData;
            break;
          } catch (err) {
            lastStatus = err.status || 500;
            if (lastStatus !== 404) {
              // If it's a real error (not just not found), throw it
              throw err;
            }
            // If 404, continue to next candidate
          }
        }
        if (!payload) {
          throw new Error(lastStatus ? `HTTP ${lastStatus}` : "Course not found");
        }
        if (payload) {
          const c = payload?.course || {};
          const hero = c.hero || {};
          const stats = c.stats || {};
          const priceFromHero = hero.priceINR != null ? Number(hero.priceINR) : null;
          const priceFromString = c.price ? Number(String(c.price).replace(/[^0-9]/g, '')) : null;
          const priceNum = Number.isFinite(priceFromHero) ? priceFromHero : (Number.isFinite(priceFromString) ? priceFromString : 0);

          // Prefer new "modules" shape. Only fall back to legacy "weeks" if it has items.
          const weeksFromModel = (Array.isArray(c.weeks) && c.weeks.length)
            ? c.weeks.map((w, idx) => ({
              title: w?.title || `Module ${idx + 1}`,
              weeksLabel: w?.hours || `Weeks ${idx + 1}`,
              topics: Array.isArray(w?.points) ? w.points : [],
            }))
            : null;
          const toArray = (val) => {
            if (Array.isArray(val)) return val;
            if (typeof val === 'string') return val.split(/\r?\n|,|;|\u2022/).map((s) => s.trim()).filter(Boolean);
            return [];
          };
          const weeksFromModules = Array.isArray(c.modules)
            ? c.modules.map((m, idx) => ({
              title: m?.title || `Module ${idx + 1}`,
              weeksLabel: m?.weeksLabel || m?.hours || `Weeks ${idx + 1}`,
              topics: toArray(m?.topics?.length !== undefined ? m.topics : (Array.isArray(m?.points) ? m.points : m?.topics)),
              outcome: m?.outcome || '',
              extras: m?.extras
                ? {
                  projectTitle: m.extras.projectTitle || '',
                  projectDescription: m.extras.projectDescription || '',
                  examples: toArray(m.extras.examples),
                  deliverables: toArray(m.extras.deliverables),
                }
                : undefined,
            }))
            : null;
          const modules = weeksFromModules || weeksFromModel || [];

          const aboutProgram = Array.isArray(c.aboutProgram) && c.aboutProgram.length
            ? c.aboutProgram
            : (c.outcomeSummary ? [c.outcomeSummary] : []);
          const learn = Array.isArray(c.learn) && c.learn.length ? c.learn : (Array.isArray(c.outcomes) ? c.outcomes : []);
          const skills = Array.isArray(c.skills) ? c.skills : [];
          const details = c.details || {};
          const capstone = c.capstone || {};
          const capstoneBullets = Array.isArray(capstone.bullets) && capstone.bullets.length ? capstone.bullets : (Array.isArray(c.capstonePoints) ? c.capstonePoints : []);
          const capstoneSummary = capstone.summary || c.focus || c.outcomeSummary || '';
          const careerOutcomes = Array.isArray(c.careerOutcomes) ? c.careerOutcomes : [];
          const toolsFrameworks = Array.isArray(c.toolsFrameworks) ? c.toolsFrameworks : [];
          const instructors = Array.isArray(c.instructors) ? c.instructors : [];
          const offeredBy = c.offeredBy && typeof c.offeredBy === 'object' ? c.offeredBy : { name: 'Gradus India', subtitle: 'A subsidiary of MDM MADHUBANI TECHNOLOGIES PRIVATE LIMITED', logo: '/assets/images/logo/logo.png' };
          const targetAudience = Array.isArray(c.targetAudience) && c.targetAudience.length ? c.targetAudience : [];
          const prereqsList = Array.isArray(c.prereqsList) && c.prereqsList.length ? c.prereqsList : [];

          if (!cancelled) {
            const priceNum = Number(c.priceINR ?? c.price ?? 0);
            setData({
              name: c.name || '',
              hero: {
                subtitle: c.subtitle || hero.subtitle || '',
                priceINR: priceNum,
                enrolledText: hero.enrolledText || ''
              },
              stats: {
                modules: modules.length || c.modulesCount || 0,
                mode: c.mode || stats.mode || '',
                level: c.level || stats.level || '',
                duration: c.duration || stats.duration || ''
              },
              aboutProgram,
              learn,
              skills,
              details: {
                effort: details.effort || '',
                language: details.language || '',
                prerequisites: details.prerequisites || ''
              },
              capstone: { summary: capstoneSummary, bullets: capstoneBullets },
              careerOutcomes,
              toolsFrameworks,
              modules,
              instructors,
              offeredBy,
              targetAudience,
              prereqsList,
              isEnrolled: Boolean(c.isEnrolled),
              enrollment: c.enrollment || null,
            });
          }
        } else {
          throw new Error(`HTTP ${api.status}`);
        }
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [programme, course, token, authLoading]);

  const priceINR = useMemo(() => {
    const n = Number(data?.hero?.priceINR || 0);
    if (!n) return '';
    try { return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n); }
    catch { return `₹${n}`; }
  }, [data?.hero?.priceINR]);
  const modulesCount = useMemo(() => {
    if (Array.isArray(data?.modules)) return data.modules.length;
    const v = Number(data?.stats?.modules);
    return Number.isFinite(v) && v > 0 ? v : 5;
  }, [data?.modules, data?.stats?.modules]);
  const learnLeft = useMemo(() => { const l = data?.learn || []; return l.slice(0, Math.ceil(l.length / 2)); }, [data?.learn]);
  const learnRight = useMemo(() => { const l = data?.learn || []; return l.slice(Math.ceil(l.length / 2)); }, [data?.learn]);

  if (loading) {
    return (
      <>
        <Preloader />
        <Animation />
        <HeaderOne />
        <section className='course-loading position-relative overflow-hidden'>
          <div className='course-loading__bg-glow course-loading__bg-glow--one' aria-hidden='true' />
          <div className='course-loading__bg-glow course-loading__bg-glow--two' aria-hidden='true' />
          <div className='course-loading__stars' aria-hidden='true'>
            {Array.from({ length: 24 }).map((_, idx) => (
              <span
                key={`star-${idx}`}
                style={{
                  animationDelay: `${idx * 0.15}s`,
                  "--rand-x": Math.random(),
                  "--rand-y": Math.random(),
                }}
              />
            ))}
          </div>
          <div className='container position-relative'>
            <div className='course-loading__hero'>
              <span className='course-loading__badge'>Preparing programme</span>
              <h1>Curating your learning journey</h1>
              <p className='mb-24 text-neutral-200'>
                We are lining up modules, mentors, and capstone briefs so you start with momentum.
              </p>
              <div className='course-loading__progress'>
                <div className='course-loading__progress-bar' role='progressbar' aria-label='Fetching course content'>
                  <span className='course-loading__progress-fill' />
                </div>
                <div className='course-loading__progress-text'>
                  <span className='pulse-dot' aria-hidden='true' />
                  Loading course details…
                </div>
              </div>
            </div>
            <div className='course-loading__grid'>
              {COURSE_LOADING_CARDS.map((card) => (
                <div key={card.title} className='course-loading-card'>
                  <div className='course-loading-card__icon'>
                    <i className='ph ph-compass' />
                  </div>
                  <div className='course-loading-card__body'>
                    <p className='course-loading-card__title'>{card.title}</p>
                    <p className='course-loading-card__description'>{card.description}</p>
                    <div className='course-loading-skeleton course-loading-skeleton--short' />
                    <div className='course-loading-skeleton course-loading-skeleton--long' />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </>
    );
  }

  if (!data) {
    return (
      <>
        <Preloader />
        <Animation />
        <HeaderOne />
        <section className='py-120'>
          <div className='container text-center'>
            <h1 className='mb-12'>Course not found</h1>
            <p className='text-neutral-600 mb-0'>We couldn’t find this course. Please check the URL.</p>
          </div>
        </section>
      </>
    );
  }

  const effortLabel = data?.details?.effort || "8–10 hrs/week";
  const durationLabel = data?.stats?.duration || "12 Weeks";
  const modeLabel = data?.stats?.mode || "Online / Hybrid";

  return (
    <>
      <Preloader />
      <Animation />
      <HeaderOne />

      <section className='py-40 bg-main-25 border-bottom border-neutral-40'>
        <div className='container padding-mob-5'>
          <div className='d-flex flex-wrap align-items-start justify-content-between gap-16'>
            <div className='flex-grow-1 min-w-0'>
              {(() => {
                const toTitle = (s) => (s || '')
                  .split('-')
                  .filter(Boolean)
                  .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                  .join(' ');
                const programmeTitle = (data?.programme && String(data.programme)) || toTitle(programme);
                const courseTitle = data?.name || toTitle(course);
                const programmeQuery = encodeURIComponent(programme || '');
                return (
                  <nav aria-label='Breadcrumb' className='mb-8 text-sm'>
                    <ol className='d-flex align-items-center gap-10 list-unstyled m-0'>
                      <li>
                        <a href='#about' className='d-inline-flex align-items-center gap-6 text-neutral-600'>
                          <i className='ph-bold ph-house' />
                          <span>Home</span>
                        </a>
                      </li>
                      <li className='text-neutral-500'><i className='ph-bold ph-caret-right' /></li>
                      <li><Link to='/our-courses' className='link'>Programmes</Link></li>
                      <li className='text-neutral-500'><i className='ph-bold ph-caret-right' /></li>
                      <li><Link to={`/our-courses?programme=${programmeQuery}`} className='link'>{programmeTitle}</Link></li>
                      <li className='text-neutral-500'><i className='ph-bold ph-caret-right' /></li>
                      <li className='text-neutral-700 fw-medium'>{courseTitle}</li>
                    </ol>
                  </nav>
                );
              })()}
              <h1 className='mb-12 text-neutral-900'>{data?.name || ((course || '').split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '))}</h1>
              <p className='text-neutral-600 mb-0'>{data?.hero?.subtitle}</p>
            </div>
            <div className='d-flex flex-column gap-12'>
              <div className='text-end'>
                {data?.enrollment?.payment_status === 'PAID' ? (
                  <div className='fw-semibold text-success-600 text-lg'>Already enrolled</div>
                ) : data?.enrollment ? (
                  <div className='fw-semibold text-warning-600 text-lg'>Payment Pending</div>
                ) : (
                  <div className='fw-semibold text-neutral-900 text-lg'>
                    {priceINR} <span className='text-sm text-neutral-600'>(+ 18% GST)</span>
                  </div>
                )}
              </div>
              {data?.enrollment?.payment_status === 'PAID' ? (
                <Link to={courseHomePath} className='btn btn-main w-100'>Go to Course</Link>
              ) : (
                <Link
                  to={`/payment?course=${encodeURIComponent(combinedSlug)}`}
                  className='btn btn-main w-100'
                  onClick={(e) => {
                    if (!token) {
                      e.preventDefault();
                      navigate('/sign-in', {
                        replace: false,
                        state: { redirectTo: `/payment?course=${encodeURIComponent(combinedSlug)}` },
                      });
                    }
                  }}
                >
                  {data?.enrollment ? 'Complete Payment' : 'Enroll Now'}
                </Link>
              )}
              <span className='text-center text-sm text-neutral-600'>{data?.hero?.enrolledText || '176,437 already enrolled'}</span>
            </div>
          </div>
        </div>
      </section>

      <section className='py-0'>
        <div className='container'>
          <div
            className='course-info-summary rounded-16 prt-0 bg-white border border-neutral-40 box-shadow-md p-16'
            style={{ marginTop: -28, position: "relative", zIndex: 2 }}
          >
            <div className='course-info-summary__grid'>
              <div className='course-info-summary__item'>
                <div className='d-flex flex-column'>
                  <span className='fw-semibold text-neutral-900'>{modulesCount} modules</span>
                  <span className='text-neutral-600 text-sm'>Hands-on projects included</span>
                </div>
              </div>
              <div className='course-info-summary__item'>
                <div className='d-flex flex-column'>
                  <span className='fw-semibold text-neutral-900'>Mode</span>
                  <span className='summary-chip'>{modeLabel}</span>
                </div>
              </div>
              <div className='course-info-summary__item'>
                <div className='d-flex flex-column'>
                  <span className='fw-semibold text-neutral-900'>Level</span>
                  <span className='text-neutral-600 text-sm'>{data?.stats?.level || "-"}</span>
                </div>
              </div>
              <div className='course-info-summary__item'>
                <div className='d-flex flex-column'>
                  <span className='fw-semibold text-neutral-900'>Duration</span>
                  <span className='summary-chip'>{`${durationLabel} • ${effortLabel}`}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id='about' className='py-24'>
        <div className='container'>
          <div className='row g-4'>
            <div className='col-12'>
              <div className='rounded-16 border border-neutral-30 p-24 mb-12 bg-white'>
                <h3 className='mb-16'>About the Program</h3>
                {(data?.aboutProgram || []).map((p, i) => (
                  <p key={`about-${i}`} className={`text-neutral-700 ${i < (data.aboutProgram?.length || 0) - 1 ? 'mb-10' : 'mb-0'}`}>{p}</p>
                ))}
              </div>

              <div className='rounded-16 border border-neutral-30 p-24 mb-12 bg-white'>
                <h3 className='mb-16'>What you'll learn</h3>
                <div className='row'>
                  <div className='col-md-6'>
                    <ul className='list-unstyled d-grid gap-10 m-0'>
                      {learnLeft.map((t, i) => (
                        <li key={`ll-${i}`} className='d-flex align-items-start gap-10 text-neutral-700'><i className='ph-bold ph-check text-main-600 mt-1 d-inline-flex' />{t}</li>
                      ))}
                    </ul>
                  </div>
                  <div className='col-md-6'>
                    <ul className='list-unstyled d-grid gap-10 m-0'>
                      {learnRight.map((t, i) => (
                        <li key={`lr-${i}`} className='d-flex align-items-start gap-10 text-neutral-700'><i className='ph-bold ph-check text-main-600 mt-1 d-inline-flex' />{t}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className='mt-24'>
                  <h6 className='text-neutral-800 fw-semibold mb-12'>Skills you'll gain</h6>
                  <div className='d-flex flex-wrap gap-8'>
                    {(data?.skills || []).map((s, i) => (<span key={`skill-${i}`} className='chip chip--neutral'>{s}</span>))}
                  </div>
                </div>
                <div className='mt-24'>
                  <h6 className='text-neutral-900 fw-semibold mb-12'>Details to know</h6>
                  <div className='row g-4'>
                    <div className='col-md-4'>
                      <div className='d-flex align-items-start gap-12'>
                        <div>
                          <div className='fw-semibold text-neutral-900'>Effort</div>
                          <div className='text-neutral-600'>{data?.details?.effort || '8-10 hours per week'}</div>
                        </div>
                      </div>
                    </div>
                    <div className='col-md-4'>
                      <div className='d-flex align-items-start gap-12'>
                        <div>
                          <div className='fw-semibold text-neutral-900'>Language</div>
                          <div className='text-neutral-600'>{data?.details?.language || 'English'}</div>
                        </div>
                      </div>
                    </div>
                    <div className='col-md-4'>
                      <div className='d-flex align-items-start gap-12'>
                        <div>
                          <div className='fw-semibold text-neutral-900'>Prerequisites</div>
                          <div className='text-neutral-600'>{data?.details?.prerequisites || 'Basic HTML/CSS/JS (covered in Module 1)'}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className='mt-24 row g-4'>
                  {data?.targetAudience?.length > 0 && (
                    <div className='col-md-6'>
                      <div className='rounded-12 prt-0-bn border border-neutral-30 p-16 h-100 bg-neutral-10'>
                        <h6 className='text-neutral-900 fw-semibold mb-10'>Who this is for</h6>
                        <ul className='list-unstyled d-grid gap-10 m-0 text-neutral-700'>
                          {data.targetAudience.map((item, i) => (
                            <li key={`audience-${i}`}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                  {data?.prereqsList?.length > 0 && (
                    <div className='col-md-6'>
                      <div className='rounded-12 prt-0-bn border border-neutral-30 p-16 h-100 bg-neutral-10'>
                        <h6 className='text-neutral-900 fw-semibold mb-10'>Prerequisites</h6>
                        <ul className='list-unstyled d-grid gap-10 m-0 text-neutral-700'>
                          {data.prereqsList.map((item, i) => (
                            <li key={`prereq-${i}`}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className='rounded-16 border border-neutral-30 p-24 mb-12 bg-white'>
                <h4 className='mb-12'>Capstone Outcome</h4>
                <p className='text-neutral-700 mb-12'>{data?.capstone?.summary}</p>
                <ul className='list-unstyled d-grid gap-10 m-0 text-neutral-700'>
                  {(data?.capstone?.bullets || []).map((b, i) => (<li key={`cap-${i}`} className='d-flex align-items-start gap-10'><i className='ph-bold ph-check text-main-600 mt-1 d-inline-flex' />{b}</li>))}
                </ul>
              </div>

              <div className='row g-4 mb-16'>
                <div className='col-12 col-lg-6'>
                  <div className='rounded-16 border border-neutral-30 p-24 mb-12 bg-white h-100'>
                    <h4 className='mb-12'>Career Outcomes</h4>
                    <ul className='list-unstyled d-grid gap-10 m-0 text-neutral-700'>
                      {(data?.careerOutcomes || []).map((c, i) => (<li key={`career-${i}`} className='d-flex align-items-start gap-10'><i className='ph-bold ph-briefcase text-main-600 mt-1 d-inline-flex' />{c}</li>))}
                    </ul>
                  </div>
                </div>
                <div className='col-12 col-lg-6'>
                  <div className='rounded-16 p-20-15 border border-neutral-30 p-24 mb-12 bg-white h-100'>
                    <h4 className='mb-12'>Tools and Frameworks</h4>
                    <div className='d-flex flex-wrap gap-8'>
                      {(data?.toolsFrameworks || []).map((t, i) => (<span key={`tool-${i}`} className='chip chip--neutral'>{t}</span>))}
                    </div>
                  </div>
                </div>
              </div>

              <div className='row g-4'>
                <div className='col-12 col-lg-8'>
                  <div id='modules' className='rounded-16 p-20-15 border border-neutral-30 p-24 mb-12 bg-white'>
                    <h4 className='mb-8'>There are {modulesCount} modules in this course</h4>
                    <p className='text-neutral-700 mb-16'>Work through the curriculum at your own pace. Each module blends concise lessons with hands-on practice.</p>
                    <div className='accordion accordion-flush' id='course-modules-accordion'>
                      {(data?.modules || []).map((m, idx) => (
                        <div className='accordion-item' key={`mod-${idx}`}>
                          <h2 className='accordion-header' id={`h-${idx}`}>
                            <button className={`accordion-button ${idx === 0 ? '' : 'collapsed'}`} type='button' data-bs-toggle='collapse' data-bs-target={`#module-${idx}`} aria-expanded={idx === 0} aria-controls={`module-${idx}`}>
                              <span className='badge bg-main-25 text-main-600 me-8 rounded-pill px-12 py-6'>Module {idx + 1}</span>
                              <span className="module-label">{m.title}</span>
                            </button>
                          </h2>
                          <div id={`module-${idx}`} className={`accordion-collapse collapse ${idx === 0 ? 'show' : ''}`} aria-labelledby={`h-${idx}`} data-bs-parent='#course-modules-accordion'>
                            <div className='accordion-body'>
                              <div className='d-grid gap-16'>
                                <div className='text-neutral-700'><span className='fw-semibold'>Duration:</span> {m.weeksLabel}</div>
                                <div>
                                  <h6 className='fw-semibold text-neutral-900 mb-8'>Topics Covered</h6>
                                  <ul className='list-unstyled d-grid gap-10 mb-0'>
                                    {(m?.topics || []).map((t, ti) => (<li key={`mod-${idx}-t-${ti}`} className='d-flex align-items-start gap-10 text-neutral-700'><i className='ph-bold ph-circle-wavy-check text-main-600 mt-1 d-inline-flex' />{t}</li>))}
                                  </ul>
                                </div>
                                {m?.extras ? (
                                  <>
                                    {(m.extras.projectTitle || m.extras.projectDescription) ? (
                                      <div>
                                        <h6 className='fw-semibold text-neutral-900 mb-6'>{m.extras.projectTitle || 'Capstone Project'}</h6>
                                        {m.extras.projectDescription ? (<p className='text-neutral-700 mb-0'>{m.extras.projectDescription}</p>) : null}
                                      </div>
                                    ) : null}
                                    {(Array.isArray(m.extras.examples) && m.extras.examples.length) ? (
                                      <div>
                                        <h6 className='fw-semibold text-neutral-900 mb-6'>Example Projects</h6>
                                        <ul className='list-unstyled d-grid gap-10 mb-0'>
                                          {m.extras.examples.map((ex, ei) => (<li key={`ex-${ei}`} className='d-flex align-items-start gap-10 text-neutral-700'><i className='ph-bold ph-check text-main-600 mt-1 d-inline-flex' />{ex}</li>))}
                                        </ul>
                                      </div>
                                    ) : null}
                                    {(Array.isArray(m.extras.deliverables) && m.extras.deliverables.length) ? (
                                      <div>
                                        <h6 className='fw-semibold text-neutral-900 mb-6'>Deliverables</h6>
                                        <ul className='list-unstyled d-grid gap-10 mb-0'>
                                          {m.extras.deliverables.map((d, di) => (<li key={`del-${di}`} className='d-flex align-items-start gap-10 text-neutral-700'><i className='ph-bold ph-check text-main-600 mt-1 d-inline-flex' />{d}</li>))}
                                        </ul>
                                      </div>
                                    ) : null}
                                  </>
                                ) : null}
                                <div>
                                  <h6 className='fw-semibold text-neutral-900 mb-6'>Outcome</h6>
                                  <p className='text-neutral-700 mb-0'>{m?.outcome}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className='col-12 col-lg-4'>
                  <div className='rounded-16 border border-neutral-30 p-20 bg-white mb-16'>
                    <h6 className='text-neutral-800 mb-8'>Instructors</h6>
                    <div className='d-grid gap-10'>
                      {(data?.instructors || []).map((ins, i) => (
                        <div key={`ins-${i}`} className='d-flex align-items-start gap-10'>
                          <i className='ph-bold ph-user-circle text-main-600 d-inline-flex text-xl' />
                          <div>
                            <div className='fw-semibold text-neutral-900'>{ins?.name}</div>
                            <div className='text-neutral-600 text-sm'>{ins?.subtitle}</div>
                          </div>
                        </div>
                      ))}
                    </div>
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
}

export default ProgrammeCoursePage;
