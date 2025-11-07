import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import FooterOne from "../components/FooterOne";
import HeaderOne from "../components/HeaderOne";
import Animation from "../helper/Animation";
import Preloader from "../helper/Preloader";

function ProgrammeCoursePage() {
  const { programme, course } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const combinedSlug = `${(programme || '').trim().toLowerCase()}/${(course || '').trim().toLowerCase()}`;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const base = (import.meta?.env?.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/$/, '');
        const headers = new Headers();
        if (token) headers.set('Authorization', `Bearer ${token}`);
        const api = await fetch(`${base}/courses/${encodeURIComponent(programme || '')}/${encodeURIComponent(course || '')}`, { credentials: 'include', headers });
        if (api.ok) {
          const payload = await api.json();
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
          const offeredBy = c.offeredBy && typeof c.offeredBy === 'object' ? c.offeredBy : { name: 'Gradus India', subtitle: 'A subsidiary of Century Finance Limited', logo: '/assets/images/cfl.png' };

          if (!cancelled) setData({
            name: c.name || '',
            hero: { subtitle: c.subtitle || hero.subtitle || '', priceINR: priceNum, enrolledText: hero.enrolledText || '' },
            stats: { modules: modules.length, mode: c.mode || stats.mode || '', level: c.level || stats.level || '', duration: c.duration || stats.duration || '' },
            aboutProgram,
            learn,
            skills,
            details: { effort: details.effort || '', language: details.language || '', prerequisites: details.prerequisites || '' },
            capstone: { summary: capstoneSummary, bullets: capstoneBullets },
            careerOutcomes,
            toolsFrameworks,
            modules,
            instructors,
            offeredBy,
            isEnrolled: Boolean(c.isEnrolled),
          });
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
  }, [programme, course]);

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
  const learnLeft = useMemo(() => { const l = data?.learn || []; return l.slice(0, Math.ceil(l.length/2)); }, [data?.learn]);
  const learnRight = useMemo(() => { const l = data?.learn || []; return l.slice(Math.ceil(l.length/2)); }, [data?.learn]);

  if (loading) {
    return (
      <>
        <Preloader />
        <Animation />
        <HeaderOne />
        <section className='py-120'><div className='container'><p className='text-center text-neutral-600'>Loading course…</p></div></section>
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

  return (
    <>
      <Preloader />
      <Animation />
      <HeaderOne />

      <section className='py-40 bg-main-25 border-bottom border-neutral-40'>
        <div className='container'>
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
                      <li><Link to='/our-courses' className='link'>Browse</Link></li>
                      <li className='text-neutral-500'><i className='ph-bold ph-caret-right' /></li>
                      <li><Link to={`/our-courses?programme=${programmeQuery}`} className='link'>{programmeTitle}</Link></li>
                      <li className='text-neutral-500'><i className='ph-bold ph-caret-right' /></li>
                      <li className='text-neutral-700 fw-medium'>{courseTitle}</li>
                    </ol>
                  </nav>
                );
              })()}
              <h1 className='mb-12 text-neutral-900'>{data?.name || ((course || '').split('-').map((w)=>w.charAt(0).toUpperCase()+w.slice(1)).join(' '))}</h1>
              <p className='text-neutral-600 mb-0'>{data?.hero?.subtitle}</p>
            </div>
            <div className='d-flex flex-column gap-12'>
              <div className='text-end'>
                {data?.isEnrolled ? (
                  <div className='fw-semibold text-success-600 text-lg'>Already enrolled</div>
                ) : (
                  <div className='fw-semibold text-neutral-900 text-lg'>
                    {priceINR} <span className='text-sm text-neutral-600'>(+ 18% GST)</span>
                  </div>
                )}
              </div>
              {data?.isEnrolled ? (
                <Link to='/my-courses' className='btn btn-main w-100'>Go to Course</Link>
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
                  Enroll Now
                </Link>
              )}
              <span className='text-center text-sm text-neutral-600'>{data?.hero?.enrolledText || '176,437 already enrolled'}</span>
            </div>
          </div>
        </div>
      </section>

      <section className='py-0'>
        <div className='container'>
          <div className='rounded-16 bg-white border border-neutral-40 box-shadow-md p-16' style={{ marginTop: -28, position: 'relative', zIndex: 2 }}>
            <div className='d-grid' style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              <div className='flex-align gap-10 px-16 py-12 rounded-12 bg-white border border-neutral-30'>
                <i className='ph-bold ph-list-bullets d-inline-flex text-main-600' />
                <div className='d-flex flex-column'>
                  <span className='fw-semibold text-neutral-900'>{modulesCount} modules</span>
                  <span className='text-neutral-600 text-sm'>Hands-on projects included</span>
                </div>
              </div>
              <div className='flex-align gap-10 px-16 py-12 rounded-12 bg-white border border-neutral-30'>
                <i className='ph-bold ph-desktop d-inline-flex text-main-600' />
                <div className='d-flex flex-column'>
                  <span className='fw-semibold text-neutral-900'>Mode</span>
                  <span className='text-neutral-600 text-sm'>{data?.stats?.mode || '-'}</span>
                </div>
              </div>
              <div className='flex-align gap-10 px-16 py-12 rounded-12 bg-white border border-neutral-30'>
                <i className='ph-bold ph-rocket-launch d-inline-flex text-main-600' />
                <div className='d-flex flex-column'>
                  <span className='fw-semibold text-neutral-900'>Level</span>
                  <span className='text-neutral-600 text-sm'>{data?.stats?.level || '-'}</span>
                </div>
              </div>
              <div className='flex-align gap-10 px-16 py-12 rounded-12 bg-white border border-neutral-30'>
                <i className='ph-bold ph-clock d-inline-flex text-main-600' />
                <div className='d-flex flex-column'>
                  <span className='fw-semibold text-neutral-900'>Duration</span>
                  <span className='text-neutral-600 text-sm'>{data?.stats?.duration || '-'}</span>
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
                        <i className='ph-bold ph-hourglass text-neutral-800 d-inline-flex text-xl' />
                        <div>
                          <div className='fw-semibold text-neutral-900'>Effort</div>
                          <div className='text-neutral-600'>{data?.details?.effort || '8-10 hours per week'}</div>
                        </div>
                      </div>
                    </div>
                    <div className='col-md-4'>
                      <div className='d-flex align-items-start gap-12'>
                        <i className='ph-bold ph-translate text-neutral-800 d-inline-flex text-xl' />
                        <div>
                          <div className='fw-semibold text-neutral-900'>Language</div>
                          <div className='text-neutral-600'>{data?.details?.language || 'English'}</div>
                        </div>
                      </div>
                    </div>
                    <div className='col-md-4'>
                      <div className='d-flex align-items-start gap-12'>
                        <i className='ph-bold ph-book-bookmark text-neutral-800 d-inline-flex text-xl' />
                        <div>
                          <div className='fw-semibold text-neutral-900'>Prerequisites</div>
                          <div className='text-neutral-600'>{data?.details?.prerequisites || 'Basic HTML/CSS/JS (covered in Module 1)'}</div>
                        </div>
                      </div>
                    </div>
                  </div>
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
                  <div className='rounded-16 border border-neutral-30 p-24 mb-12 bg-white h-100'>
                    <h4 className='mb-12'>Tools and Frameworks</h4>
                    <ul className='list-unstyled d-grid gap-10 m-0 text-neutral-700'>
                      {(data?.toolsFrameworks || []).map((t, i) => (<li key={`tool-${i}`} className='d-flex align-items-start gap-10'><i className='ph-bold ph-wrench text-main-600 mt-1 d-inline-flex' />{t}</li>))}
                    </ul>
                  </div>
                </div>
              </div>

              <div className='row g-4'>
                <div className='col-12 col-lg-8'>
                  <div id='modules' className='rounded-16 border border-neutral-30 p-24 mb-12 bg-white'>
                    <h4 className='mb-8'>There are {modulesCount} modules in this course</h4>
                    <p className='text-neutral-700 mb-16'>Work through the curriculum at your own pace. Each module blends concise lessons with hands-on practice.</p>
                    <div className='accordion accordion-flush' id='course-modules-accordion'>
                      {(data?.modules || []).map((m, idx) => (
                        <div className='accordion-item' key={`mod-${idx}`}>
                          <h2 className='accordion-header' id={`h-${idx}`}>
                            <button className={`accordion-button ${idx === 0 ? '' : 'collapsed'}`} type='button' data-bs-toggle='collapse' data-bs-target={`#module-${idx}`} aria-expanded={idx === 0} aria-controls={`module-${idx}`}>
                              <span className='badge bg-main-25 text-main-600 me-8 rounded-pill px-12 py-6'>Module {idx + 1}</span>
                              <span>{m.title}</span>
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
                  <div className='rounded-16 border border-neutral-30 p-20 bg-white'>
                    <h6 className='text-neutral-800 mb-8'>Offered by</h6>
                    <div className='d-flex align-items-center gap-12'>
                      <img src={data?.offeredBy?.logo || '/assets/images/cfl.png'} alt='' style={{ width: 36, height: 36 }} className='rounded-8' />
                      <div>
                        <div className='fw-semibold text-neutral-900'>{data?.offeredBy?.name || 'Gradus India'}</div>
                        <div className='text-neutral-600 text-sm'>{data?.offeredBy?.subtitle || 'A subsidiary of Century Finance Limited'}</div>
                      </div>
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
