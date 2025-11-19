import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { PROGRAMMES } from "../data/programmes.js";
import { API_BASE_URL } from "../services/apiClient";
import { slugify } from "../utils/slugify.js";
import isProtectedPath from "../utils/isProtectedPath.js";
const HeaderOne = () => {
  let { pathname } = useLocation();
  const [scroll, setScroll] = useState(false);
  const [isMenuActive, setIsMenuActive] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const y = window.pageYOffset || window.scrollY || 0;
      setScroll(y > 150);
    };
    // initialize once on mount and subscribe
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Removed course select and popup
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const profileLink = isAuthenticated ? "/profile" : "/sign-in";
  const fallbackName = user?.email ? user.email.split("@")[0] : "";
  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.name ||
    fallbackName ||
    "Account";
  const profileLabel = isAuthenticated
    ? `Open account menu (${displayName})`
    : "Sign in";
  const userMenuRef = useRef(null);

  const toggleMenu = () => {
    setIsMenuActive(!isMenuActive);
    if (!isMenuActive) {
      document.body.classList.add("scroll-hide-sm");
    } else {
      document.body.classList.remove("scroll-hide-sm");
    }
  };

  const closeMenu = () => {
    setIsMenuActive(false);
    // Reset all mobile menu expansions when closing
    setActiveSubmenu(null);
    setOpenMegaGroups({});
    document.body.classList.remove("scroll-hide-sm");
  };

  const toggleUserMenu = () => {
    setIsUserMenuOpen((prev) => !prev);
  };

  const closeUserMenu = () => setIsUserMenuOpen(false);

  // Course select removed

  useEffect(() => {
    if (!isAuthenticated) {
      setIsUserMenuOpen(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleLogout = () => {
    closeUserMenu();
    const currentPath = pathname || "/";
    const shouldRedirect = isProtectedPath(currentPath);
    logout();
    if (shouldRedirect) {
      navigate("/", { replace: true });
    }
  };

  const [activeSubmenu, setActiveSubmenu] = useState(null);
  const [openMegaGroups, setOpenMegaGroups] = useState({});
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 0
  );

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleSubmenuClick = (index) => {
    if (windowWidth >= 992) return;

    setActiveSubmenu((prevIndex) => {
      const isClosing = prevIndex === index;
      const nextIndex = isClosing ? null : index;

      setOpenMegaGroups((prev) => {
        if (!Object.keys(prev).length && isClosing) {
          return prev;
        }
        const updated = { ...prev };
        const parentsToReset = new Set([index]);
        if (prevIndex !== null && prevIndex !== index) {
          parentsToReset.add(prevIndex);
        }
        const prevKeys = Object.keys(prev);
        let changed = false;
        parentsToReset.forEach((parent) => {
          prevKeys.forEach((key) => {
            if (key.startsWith(`${parent}-`) && key in updated) {
              delete updated[key];
              changed = true;
            }
          });
        });
        return changed ? updated : prev;
      });

      return nextIndex;
    });
  };

  const toggleMegaGroup = (parentIndex, key) => {
    setOpenMegaGroups((prev) => {
      const currentlyOpen = !!prev[key];
      const next = { ...prev };
      Object.keys(next).forEach((k) => {
        if (k.startsWith(`${parentIndex}-`)) delete next[k];
      });
      if (!currentlyOpen) next[key] = true;
      return next;
    });
  };

  const getCourseMeta = (course) => {
    const isObject = course && typeof course === "object";
    const rawLabel = isObject
      ? course?.name || course?.title || course?.label || ""
      : typeof course === "string"
      ? course
      : "";
    const label = String(rawLabel || "").trim();
    const fallbackSlug = (isObject ? course?.slug : null) || (label ? slugify(label) : "");
    const slugValue = (fallbackSlug || "course").trim();
    return {
      label,
      slug: slugValue,
      flagship: Boolean(isObject && course?.flagship),
      tone: isObject && course?.flagshipTone ? course.flagshipTone : undefined,
    };
  };

  const formatCourseLabel = (input) => {
    const meta =
      typeof input === "string"
        ? { label: input, slug: slugify(input) }
        : input && typeof input === "object"
        ? input
        : { label: "" };
    const cleaned = meta.label
      ? meta.label.replace(/\s*\([^)]*\)\s*/g, " ").trim() || meta.label
      : "";
    const fallback = meta.slug ? meta.slug.replace(/-/g, " ") : "";
    const main = cleaned || fallback || meta.label || "";
    return (
      <span className={`nav-mega__text ${meta.flagship ? "is-flagship" : ""}`}>
        {main}
      </span>
    );
  };

  const normalizeIncomingCourse = (course, programmeSlug) => {
    if (!course) return course;
    const slug = String(course.slug || "").toLowerCase();
    const normalized = { ...course };
    if (programmeSlug === "gradus-x" && slug === "agentic-ai-engineering-program") {
      normalized.slug = "agentic-ai-engineering-flagship";
      normalized.title = "Agentic AI Engineering Flagship Program";
      normalized.flagship = true;
      normalized.flagshipTone = "tech";
    }
    return normalized;
  };

  const buildCourseLink = (programme, course) => {
    const programmeSlug = programme?.slug || slugify(programme?.title || '');
    const courseSlug =
      typeof course === 'string'
        ? slugify(course)
        : course?.slug || slugify(course?.name || course?.title || '');

    if (programmeSlug && courseSlug) {
      return `/${programmeSlug}/${courseSlug}`;
    }

    return programme?.anchor || '/our-courses';
  };

  const getCollapseStyle = (isOpen) => ({
    maxHeight: isOpen ? "2000px" : 0,
    opacity: isOpen ? 1 : 0,
    paddingTop: isOpen ? "10px" : 0,
    paddingBottom: isOpen ? "10px" : 0,
    visibility: isOpen ? "visible" : "hidden",
  });

  // Build initial static mega groups from local data
  const buildMegaFromProgrammes = () =>
    PROGRAMMES.map((p) => ({
      title: p.title,
      slug: p.slug || slugify(p.title),
      anchor: p.anchor,
      items: p.courses,
    }));

  const [programmeMega, setProgrammeMega] = useState(buildMegaFromProgrammes());

  // Enrich mega menu with backend courses
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await fetch(`${API_BASE_URL}/courses`, { credentials: 'include' });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        const items = Array.isArray(data?.items) ? data.items : [];

        const grouped = new Map();
        for (const it of items) {
          const full = String(it.slug || '').trim();
          const [progSlug, courseSlug] = full.split('/');
          if (!progSlug || !courseSlug) continue;
          const entry = normalizeIncomingCourse(
            { slug: courseSlug, title: it.name || courseSlug.replace(/-/g, ' ') },
            progSlug
          );
          if (!grouped.has(progSlug)) grouped.set(progSlug, []);
          grouped.get(progSlug).push(entry);
        }

        const updated = buildMegaFromProgrammes().map((group) => {
          const fromApi = grouped.get(group.slug) || [];
          const existing = Array.isArray(group.items) ? group.items : [];

          // Build a robust dedupe set using both explicit slugs and
          // normalized names so that minor slug differences don't duplicate.
          const seen = new Set();
          for (const e of existing) {
            const isString = typeof e === 'string';
            const s1 = isString ? slugify(e) : (e?.slug || '');
            const s2 = isString ? slugify(e) : slugify(e?.name || e?.title || '');
            if (s1) seen.add(s1);
            if (s2) seen.add(s2);
          }

          const filtered = [];
          for (const e of fromApi) {
            const cands = [e?.slug, slugify(e?.title || e?.name || '')].filter(Boolean);
            const isDup = cands.some((c) => seen.has(c));
            if (!isDup) {
              filtered.push(e);
              // guard against further duplicates within API list
              cands.forEach((c) => seen.add(c));
            }
          }

          const merged = existing.concat(filtered);
          return { ...group, items: merged };
        });

        if (!cancelled) setProgrammeMega(updated);
      } catch (e) {
        // keep static mega on failure
        console.warn('[Header] Failed to load programmes for menu:', e?.message || e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const renderNavLabel = (item) => (
    <>
      <span className='nav-menu__label'>{item.label}</span>
      {item.badge ? (
        <span className='nav-menu__badge' aria-hidden='true'>
          {item.badge}
        </span>
      ) : null}
    </>
  );

  const ourCoursesDropdown = {
    label: "Our courses",
    links: [
      { to: "/our-courses", label: "All courses" },
      { to: "/our-courses?programme=gradus-x", label: "Tech Courses" },
      { to: "/our-courses?programme=gradus-finlit", label: "Stock Market Courses" },
    ],
  };

  const menuItems = [
    {
      label: "Programmes",
      mega: programmeMega,
      // Fallback links for mobile menu (simple list)
      links: [
        { to: "/our-courses?programme=gradus-x", label: "GradusX" },
        { to: "/our-courses?programme=gradus-finlit", label: "Gradus Finlit" },
        { to: "/our-courses?programme=gradus-lead", label: "Gradus Lead" },
      ],
    },
    ourCoursesDropdown,
    { to: "/events", label: "Events", badge: "New" },
    { to: "/blogs", label: "Blogs" },
    { to: "/contact", label: "Contact us" },
  ];

  return (
    <>
      <div className={`side-overlay ${isMenuActive ? "show" : ""}`}></div>
      <header className={`header ${scroll ? "fixed-header" : ""}`}>
        <div className='container container--lg'>
          <nav className='header-inner flex-between gap-8'>
            <div className='header-content-wrapper flex-align flex-grow-1'>
              {/* Mobile menu toggle - left aligned like reference */}
              <button
                type='button'
                className='toggle-mobileMenu d-lg-none text-neutral-700 flex-center me-12'
                onClick={toggleMenu}
                aria-label='Open menu'
                title='Menu'
              >
                <i className='ph ph-list' />
              </button>
              {/* Logo Start */}
              <div className='logo'>
                <Link to='/' className='link'>
                  <img src='/assets/images/logo/logo.png' alt='Logo' />
                </Link>
              </div>
              {/* Logo End  */}
              {/* Course select removed */}
              {/* Menu Start  */}
              <div className='header-menu d-lg-block d-none'>
                <ul className='nav-menu flex-align'>
                  {menuItems.map((item, index) => {
                    if (item.mega) {
                      return (
                        <li key={`menu-item-${index}`} className='nav-menu__item has-submenu has-mega'>
                          <span className='nav-menu__link'>{item.label}</span>
                          <div className='nav-mega'>
                            {item.mega.map((group, gIdx) => (
                              <div className='nav-mega__col' key={`mega-col-${gIdx}`}>
                                <Link to={`/our-courses?programme=${group.slug || slugify(group.title)}`} className='nav-mega__title'>
                                  {group.title}
                                </Link>
                                <ul className='nav-mega__list'>
                                  {group.items.map((course, cIdx) => {
                                    const courseMeta = getCourseMeta(course);
                                    const toneAttr = courseMeta.flagship ? (courseMeta.tone || (group.slug === "gradus-finlit" ? "finlit" : "tech")) : undefined;
                                    return (
                                      <li key={`mega-${gIdx}-${cIdx}`} className='nav-mega__item'>
                                        <Link
                                          to={`/${group.slug || slugify(group.title)}/${courseMeta.slug}`}
                                          className={`nav-mega__link ${courseMeta.flagship ? "is-flagship" : ""}`}
                                          data-flagship-tone={toneAttr}
                                        >
                                          {formatCourseLabel(courseMeta)}
                                        </Link>
                                      </li>
                                    );
                                  })}
                                </ul>
                              </div>
                            ))}
                          </div>
                        </li>
                      );
                    }
                    if (item.links) {
                      return (
                        <li key={`menu-item-${index}`} className='nav-menu__item has-submenu'>
                          <span className='nav-menu__link'>{item.label}</span>
                          <ul className='nav-submenu scroll-sm'>
                            {item.links.map((link, linkIndex) => (
                              <li key={`submenu-item-${linkIndex}`} className={`nav-submenu__item ${pathname === link.to && "activePage"}`}>
                                <Link to={link.to} className='nav-submenu__link hover-bg-neutral-30'>
                                  {link.label}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </li>
                      );
                    }
                    return (
                      <li key={`menu-contact-${index}`} className={`nav-menu__item ${pathname === item.to && "activePage"}`}>
                        <Link
                          to={item.to}
                          className={`nav-menu__link ${item.badge ? "nav-menu__link--has-badge" : ""}`}
                        >
                          {renderNavLabel(item)}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
              {/* Menu End  */}
              {/* Header Right start */}
              <div className='header-right flex-align'>
              {/* Search removed */}
              {isAuthenticated ? (
                <div className='position-relative' ref={userMenuRef}>
                  {/* Desktop: icon + name in same pill */}
                  <button
                    type='button'
                    onClick={toggleUserMenu}
                    className='account-pill d-none d-lg-inline-flex'
                    title={profileLabel}
                    aria-label={profileLabel}
                    aria-haspopup='menu'
                    aria-expanded={isUserMenuOpen}
                  >
                    <span className='account-pill__icon'><i className='ph ph-user-circle' /></span>
                    <span className='account-pill__label'>{displayName}</span>
                    <i className='ph-bold ph-caret-down account-pill__caret' aria-hidden='true' />
                  </button>
                  {/* Mobile: keep compact icon button */}
                  <button
                    type='button'
                    onClick={toggleUserMenu}
                    className='info-action w-52 h-52 bg-main-25 hover-bg-main-600 border border-neutral-30 rounded-circle flex-center text-2xl text-neutral-500 hover-text-white hover-border-main-600 d-lg-none'
                    title={profileLabel}
                    aria-label={profileLabel}
                    aria-haspopup='menu'
                    aria-expanded={isUserMenuOpen}
                  >
                    <i className='ph ph-user-circle' />
                  </button>
                  {isUserMenuOpen && (
                    <div
                      className='header-user-menu position-absolute inset-inline-end-0 mt-12 bg-white border border-neutral-30 rounded-12 box-shadow-md py-12'
                      role='menu'
                      style={{ minWidth: "200px", zIndex: 1100 }}
                    >
                      <div className='d-flex flex-column'>
                        <Link
                          to='/profile'
                          onClick={closeUserMenu}
                          className='px-20 py-8 text-start text-md text-neutral-700 hover-bg-main-25 hover-text-main-600'
                          role='menuitem'
                        >
                          My Profile
                        </Link>
                        <Link
                          to='/my-courses'
                          onClick={closeUserMenu}
                          className='px-20 py-8 text-start text-md text-neutral-700 hover-bg-main-25 hover-text-main-600'
                          role='menuitem'
                        >
                          My Courses
                        </Link>
                        <button
                          type='button'
                          onClick={() => {
                            try {
                              window.dispatchEvent(new CustomEvent('gradus:help-open', { detail: { mode: 'support' } }));
                            } catch {
                              // intentionally ignoring errors
                            }
                            closeUserMenu();
                          }}
                          className='px-20 py-8 text-start text-md text-neutral-700 hover-bg-main-25 hover-text-main-600 border-0 bg-transparent w-100 text-inherit'
                          role='menuitem'
                        >
                          Customer Support
                        </button>
                        <button
                          type='button'
                          onClick={handleLogout}
                          className='px-20 py-8 text-start text-md text-neutral-700 hover-bg-main-25 hover-text-main-600 border-0 bg-transparent w-100 text-inherit'
                          role='menuitem'
                        >
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* Desktop: icon + label inside one pill */}
                  <Link
                    to={profileLink}
                    title={profileLabel}
                    aria-label={profileLabel}
                    className='account-pill d-none d-lg-inline-flex'
                  >
                    <span className='account-pill__icon'><i className='ph ph-user-circle' /></span>
                    <span className='account-pill__label'>Sign in</span>
                    <i className='ph-bold ph-arrow-up-right account-pill__caret' aria-hidden='true' />
                  </Link>
                  {/* Mobile/Tablet: compact icon button on the right */}
                  <Link
                    to={profileLink}
                    title={profileLabel}
                    aria-label={profileLabel}
                    className='info-action w-52 h-52 bg-main-25 hover-bg-main-600 border border-neutral-30 rounded-circle flex-center text-2xl text-neutral-500 hover-text-white hover-border-main-600 d-lg-none'
                  >
                    <i className='ph ph-user-circle' />
                  </Link>
                </>
              )}
              
              </div>
              {/* Header Right End  */}
            </div>
          </nav>
        </div>
      </header>

      <div className={`mobile-menu scroll-sm d-xl-none d-block ${isMenuActive ? "active" : ""}`}>
        <div className='mobile-menu__inner'>
          <div className='mobile-menu__header'>
            <Link to='/' className='mobile-menu__logo'>
              <img src='/assets/images/logo/logo.png' alt='Logo' />
            </Link>
            <div className='mobile-menu__actions'>
              <button type='button' className='close-button' onClick={closeMenu} aria-label='Close menu'>
                <i className='ph ph-x' />
              </button>
            </div>
          </div>
          <div className='mobile-menu__menu'>
            <ul className='nav-menu flex-align nav-menu--mobile'>
              {menuItems.map((item, index) => {
                const isActive = activeSubmenu === index;
                if (item.mega || item.links) {
                  return (
                    <li
                      key={`menu-item-${index}`}
                      className={`nav-menu__item has-submenu ${isActive ? "activePage" : ""}`}
                      onClick={() => handleSubmenuClick(index)}
                    >
                      <span className='nav-menu__link'>{item.label}</span>
                      <ul
                        className={`nav-submenu scroll-sm nav-submenu--collapsible ${
                          isActive ? "is-open" : ""
                        }`}
                        aria-hidden={!isActive}
                        style={getCollapseStyle(isActive)}
                      >
                        {item.mega &&
                          item.mega.map((group, gIdx) => {
                            const gKey = `${index}-${gIdx}`;
                            const gActive = !!openMegaGroups[gKey];
                            return (
                              <li
                                key={`m-${index}-g-${gIdx}`}
                                className={`nav-submenu__item has-submenu ${gActive ? "activePage" : ""}`}
                              >
                                <button
                                  type='button'
                                  className='nav-submenu__link hover-bg-neutral-30 d-flex align-items-center justify-content-between'
                                  aria-expanded={gActive}
                                  aria-controls={`mega-group-${gKey}`}
                                  tabIndex={isActive ? 0 : -1}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleMegaGroup(index, gKey);
                                  }}
                                >
                                  <span>{group.title}</span>
                                  <i className='ph ph-caret-down submenu-caret' aria-hidden='true' />
                                </button>
                                <ul
                                  id={`mega-group-${gKey}`}
                                  className={`nav-submenu nav-submenu--collapsible ${gActive ? "is-open" : ""}`}
                                  aria-hidden={!gActive}
                                  style={getCollapseStyle(gActive)}
                                >
                                  {Array.isArray(group.items) &&
                                    group.items.map((course, cIdx) => {
                                      const courseMeta = getCourseMeta(course);
                                      const toneAttr = courseMeta.flagship
                                        ? courseMeta.tone ||
                                          (group.slug === "gradus-finlit" ? "finlit" : "tech")
                                        : undefined;

                                      return (
                                        <li
                                          key={`m-${index}-g-${gIdx}-c-${cIdx}`}
                                          className='nav-submenu__item'
                                        >
                                          <Link
                                            to={buildCourseLink(group, courseMeta)}
                                            className={`nav-submenu__link hover-bg-neutral-30 ${
                                              courseMeta.flagship ? "is-flagship" : ""
                                            }`}
                                            data-flagship-tone={toneAttr}
                                            onClick={closeMenu}
                                            tabIndex={gActive ? 0 : -1}
                                          >
                                            {formatCourseLabel(courseMeta)}
                                          </Link>
                                        </li>
                                      );
                                    })}
                                </ul>
                              </li>
                            );
                          })}
                        {!item.mega &&
                          item.links &&
                          item.links.map((link, linkIndex) => (
                            <li key={`m-${index}-l-${linkIndex}`} className='nav-submenu__item'>
                              <Link
                                to={link.to}
                                className='nav-submenu__link hover-bg-neutral-30'
                                tabIndex={isActive ? 0 : -1}
                              >
                                {link.label}
                              </Link>
                            </li>
                          ))}
                      </ul>
                    </li>
                  );
                }
                return (
                  <li className={`nav-menu__item ${pathname === item.to && "activePage"}`} key={index}>
                    <Link
                      to={item.to}
                      className={`nav-menu__link ${item.badge ? "nav-menu__link--has-badge" : ""}`}
                    >
                      {renderNavLabel(item)}
                    </Link>
                  </li>
                );
              })}
            </ul>
            {/* Mobile course select removed */}
          </div>
        </div>
      </div>
    </>
  );
};

export default HeaderOne;








