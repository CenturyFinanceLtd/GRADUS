import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import privacyLinks from "../data/privacyLinks";
import { fetchCourseOptions } from "../services/courseService";

const companyLinks = [
  {
    label: "About us",
    to: "/about-us",
  },
  {
    label: "Courses",
    to: "/our-courses",
  },
  {
    label: "Instructor",
    to: null,
  },
  {
    label: "Blogs",
    to: "/blogs",
  },
];

const PROGRAMMES = [
  { title: "Gradus X", slug: "gradus-x" },
  { title: "Gradus Finlit", slug: "gradus-finlit" },
  { title: "Gradus Lead", slug: "gradus-lead" },
];

const COURSE_PREVIEW_LIMIT = 9;

const socialLinks = [
  {
    href: "https://www.facebook.com/people/Gradus/61583093960559/?sk=about",
    label: "Facebook",
    icon: "/assets/social/facebook.svg",
  },
  {
    href: "https://www.instagram.com/gradusindia.in",
    label: "Instagram",
    icon: "/assets/social/instagram.svg",
  },
  {
    href: "https://linkedin.com/company/gradusindia",
    label: "linkedIn",
    icon: "/assets/social/linkedin.svg",
  },
  {
    href: "https://www.youtube.com/@gradusindia/",
    label: "YouTube",
    icon: "/assets/social/youtube.svg",
  },
  {
    href: "https://wa.me/+918448429040",
    label: "WhatsApp",
    icon: "/assets/social/whatsapp.svg",
  },
];

const deriveProgrammeSlug = (course) => {
  if (!course) return "";
  const fromSlug = typeof course.slug === "string" ? course.slug.split("/")[0] : "";
  if (fromSlug) return fromSlug.trim().toLowerCase();
  if (typeof course.programme === "string") {
    return course.programme.trim().toLowerCase().replace(/\s+/g, "-");
  }
  return "";
};

const buildSectionState = (isExpanded) => {
  const initial = {
    company: isExpanded,
    privacy: isExpanded,
  };
  PROGRAMMES.forEach(({ slug }) => {
    initial[`programme-${slug}`] = isExpanded;
  });
  return initial;
};

const FooterOne = () => {
  const [programmeCourses, setProgrammeCourses] = useState(() => {
    const initial = {};
    PROGRAMMES.forEach(({ slug }) => {
      initial[slug] = [];
    });
    return initial;
  });
  const [programmeLoading, setProgrammeLoading] = useState(true);
  const [expandedCourseLists, setExpandedCourseLists] = useState(() => {
    const initial = {};
    PROGRAMMES.forEach(({ slug }) => {
      initial[slug] = false;
    });
    return initial;
  });
  const initialExpanded = typeof window !== "undefined" ? window.innerWidth > 767 : true;
  const [expandedSections, setExpandedSections] = useState(() => buildSectionState(initialExpanded));
  const [isMobile, setIsMobile] = useState(() => (typeof window !== "undefined" ? window.innerWidth <= 767 : false));

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 767;
      setIsMobile(mobile);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    setExpandedSections(buildSectionState(!isMobile));
  }, [isMobile]);

  useEffect(() => {
    let isMounted = true;

    const loadCourses = async () => {
      try {
        const response = await fetchCourseOptions();
        const items = Array.isArray(response?.items) ? response.items : [];
        const grouped = PROGRAMMES.reduce((acc, { slug }) => {
          acc[slug] = [];
          return acc;
        }, {});

        items.forEach((course) => {
          const programmeSlug = deriveProgrammeSlug(course);
          if (!grouped[programmeSlug] || !course?.name) return;
          grouped[programmeSlug].push({
            name: course.name,
            slug: course.slug || "",
          });
        });

        Object.keys(grouped).forEach((key) => {
          grouped[key] = grouped[key].sort((a, b) => a.name.localeCompare(b.name));
        });

        if (isMounted) {
          setProgrammeCourses((prev) => ({
            ...prev,
            ...grouped,
          }));
        }
      } catch (error) {
        console.error("Failed to load footer courses", error);
        if (isMounted) {
          const initial = {};
          PROGRAMMES.forEach(({ slug }) => {
            initial[slug] = [];
          });
          setProgrammeCourses(initial);
        }
      } finally {
        if (isMounted) {
          setProgrammeLoading(false);
        }
      }
    };

    loadCourses();
    return () => {
      isMounted = false;
    };
  }, []);

  const toggleSection = (section) => {
    if (!isMobile) return;
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const isSectionExpanded = (section) => (isMobile ? !!expandedSections[section] : true);

  const toggleCourseList = (programmeSlug) => {
    setExpandedCourseLists((prev) => ({
      ...prev,
      [programmeSlug]: !prev[programmeSlug],
    }));
  };

  return (
    <footer className='gradus-footer'>
      <style>{`
        @keyframes footerCourseSkeleton {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
      <div className='gradus-footer__body container container-two'>
        <div className='gradus-footer__primary'>
          <div className='gradus-footer__logo-row'>
            <Link to='/' className='gradus-footer__logo' aria-label='Gradus home'>
              <img src='/assets/images/logo/logo.png' alt='Gradus logo' />
            </Link>
          </div>
          <div className='gradus-footer__grid'>
            <div className='gradus-footer__column gradus-footer__column--company'>
              <div className={`gradus-footer__group ${isSectionExpanded("company") ? "is-open" : ""}`}>
                <button
                  type='button'
                  className='gradus-footer__accordion'
                  onClick={() => toggleSection("company")}
                  aria-expanded={isSectionExpanded("company")}
                >
                  <span>Company</span>
                  <i className='ph ph-caret-down' aria-hidden='true' />
                </button>
                <div className='gradus-footer__accordion-panel' hidden={!isSectionExpanded("company")}>
                  <ul className='gradus-footer__list'>
                    {companyLinks.map(({ label, to }) => (
                      <li key={label}>
                        {to ? (
                          <Link to={to} className='gradus-footer__link'>
                            {label}
                          </Link>
                        ) : (
                          <span className='gradus-footer__link gradus-footer__link--muted' aria-disabled='true'>
                            {label}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className={`gradus-footer__group ${isSectionExpanded("privacy") ? "is-open" : ""}`}>
                <button
                  type='button'
                  className='gradus-footer__accordion'
                  onClick={() => toggleSection("privacy")}
                  aria-expanded={isSectionExpanded("privacy")}
                >
                  <span>Privacy Statements</span>
                  <i className='ph ph-caret-down' aria-hidden='true' />
                </button>
                <div className='gradus-footer__accordion-panel' hidden={!isSectionExpanded("privacy")}>
                  <ul className='gradus-footer__list'>
                    {privacyLinks.map(({ label, to }) => (
                      <li key={label}>
                        <Link to={to} className='gradus-footer__link'>
                          {label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
            {PROGRAMMES.map(({ title, slug }) => {
              const links = programmeCourses[slug] || [];
              const hasDynamicLinks = links.length > 0;
              const showAllCourses = expandedCourseLists[slug];
              const displayCourses = showAllCourses ? links : links.slice(0, COURSE_PREVIEW_LIMIT);
              const hasMoreCourses = links.length > COURSE_PREVIEW_LIMIT;
              return (
                <div key={slug} className='gradus-footer__column'>
                  <div className={`gradus-footer__group ${isSectionExpanded(`programme-${slug}`) ? "is-open" : ""}`}>
                    <button
                      type='button'
                      className='gradus-footer__accordion'
                      onClick={() => toggleSection(`programme-${slug}`)}
                      aria-expanded={isSectionExpanded(`programme-${slug}`)}
                    >
                      <span>{title}</span>
                      <i className='ph ph-caret-down' aria-hidden='true' />
                    </button>
                    <div className='gradus-footer__accordion-panel' hidden={!isSectionExpanded(`programme-${slug}`)}>
                      <ul className='gradus-footer__list gradus-footer__list--courses'>
                        {programmeLoading ? (
                          Array.from({ length: 3 }).map((_, idx) => (
                            <li key={`${slug}-skeleton-${idx}`}>
                              <span
                                className='gradus-footer__link gradus-footer__link--muted'
                                style={{
                                  display: "inline-block",
                                  height: 14,
                                  width: `${70 - idx * 8}%`,
                                  background: "linear-gradient(120deg, #2a2f3d, #343a4a, #2a2f3d)",
                                  backgroundSize: "200% 100%",
                                  animation: "footerCourseSkeleton 1.4s ease-in-out infinite",
                                  borderRadius: 6,
                                }}
                              />
                            </li>
                          ))
                        ) : hasDynamicLinks ? (
                          <>
                            {displayCourses.map(({ name, slug: courseSlug }) => {
                              const path = courseSlug ? `/${courseSlug.replace(/^\//, "")}` : "/our-courses";
                              return (
                                <li key={`${slug}-${courseSlug || name}`}>
                                  <Link to={path} className='gradus-footer__link'>
                                    {name}
                                  </Link>
                                </li>
                              );
                            })}
                            {hasMoreCourses && (
                              <li className='gradus-footer__list-more'>
                                <button
                                  type='button'
                                  className='gradus-footer__link gradus-footer__link-button'
                                  onClick={() => toggleCourseList(slug)}
                                >
                                  {showAllCourses ? "Show less" : `Show more (${links.length - COURSE_PREVIEW_LIMIT})`}
                                </button>
                              </li>
                            )}
                          </>
                        ) : (
                          <li>
                            <span className='gradus-footer__link gradus-footer__link--muted'>
                              Courses coming soon
                            </span>
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className='gradus-footer__cta-row'>
          <div className='gradus-footer__newsletter'>
            <p className='gradus-footer__newsletter-text'>
              Submit your email to Stay up to date with the latest courses
            </p>
            <form action='#' className='gradus-footer__newsletter-form'>
              <input
                type='email'
                className='gradus-footer__newsletter-input'
                placeholder='Email'
              />
              <button type='submit' className='gradus-footer__newsletter-button'>
                Submit
              </button>
            </form>
          </div>
          <div className='gradus-footer__social gradus-footer__social--cta'>
            {socialLinks.map(({ href, label, icon, color }) => (
              <a
                key={`cta-${label}`}
                href={href}
                className='gradus-footer__social-link'
                style={{ "--icon-color": color }}
                target='_blank'
                rel='noopener noreferrer nofollow'
                aria-label={label}
              >
                <img src={icon} alt='' aria-hidden='true' />
              </a>
            ))}
          </div>
        </div>
      </div>
      <div className='gradus-footer__meta container container-two'>
        <p className='gradus-footer__copyright'>
          Copyright &copy; 2025 All Rights Reserved by Century finance limited
        </p>
        <div className='gradus-footer__bottom'>
          <div className='gradus-footer__legal'>
            <Link to='/privacy-policy' className='gradus-footer__link'>
              Privacy Policy
            </Link>
            <Link to='/terms-and-conditions' className='gradus-footer__link'>
              Terms and Conditions
            </Link>
            <Link to='/cancellation-refunds' className='gradus-footer__link'>
              Cancellation and Refunds
            </Link>
            <Link to='/visitor-policy' className='gradus-footer__link'>
              Visitor Policy
            </Link>
            <Link to='/vendors' className='gradus-footer__link'>
              Vendors
            </Link>
          </div>
        </div>
      </div>
    </footer>
);

};

export default FooterOne;
