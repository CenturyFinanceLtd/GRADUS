import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { PROGRAMMES } from "../data/programmes.js";
import { slugify } from "../utils/slugify.js";
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
    logout();
    navigate("/sign-in", { replace: true });
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
    if (windowWidth < 992) {
      setActiveSubmenu((prevIndex) => {
        const next = prevIndex === index ? null : index;
        // When switching/opening a top-level section, collapse any open programme groups under it
        if (next !== null) {
          setOpenMegaGroups((prev) => {
            const updated = { ...prev };
            Object.keys(updated).forEach((k) => {
              if (k.startsWith(`${next}-`)) delete updated[k];
            });
            return updated;
          });
        }
        return next;
      });
    }
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

  const formatCourseLabel = (text) => {
    try {
      const main = typeof text === 'string' ? text.replace(/\s*\([^)]*\)\s*/g, ' ').trim() : text;
      return <span className='nav-mega__text'>{main}</span>;
    } catch {
      return <span className='nav-mega__text'>{text}</span>;
    }
  };

  const menuItems = [
    {
      label: "Programmes",
      mega: PROGRAMMES.map((p) => ({
        title: p.title,
        anchor: p.anchor,
        items: p.courses,
      })),
      // Fallback links for mobile menu (simple list)
      links: [
        { to: "/our-courses?programme=gradusx", label: "GradusX" },
        { to: "/our-courses?programme=gradus-finlit", label: "Gradus Finlit" },
        { to: "/our-courses?programme=gradus-lead", label: "Gradus Lead" },
      ],
    },
    // Redirect to Our Courses with pre-applied filters
    { to: "/our-courses?programme=gradus-finlit", label: "Stock Market Courses" },
    { to: "/our-courses?programme=gradusx", label: "Tech Courses Placement" },
    { to: "/blogs", label: "Blogs" },
    { to: "/contact", label: "Contact us" },
  ];

  return (
    <>
      <div className={`side-overlay ${isMenuActive ? "show" : ""}`}></div>
      <header className={`header ${scroll ? "fixed-header" : ""}`}>
        <div className='container container--xl'>
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
                                <Link to={`/our-courses?programme=${slugify(group.title)}`} className='nav-mega__title'>
                                  {group.title}
                                </Link>
                                <ul className='nav-mega__list'>
                                  {group.items.map((course, cIdx) => (
                                    <li key={`mega-${gIdx}-${cIdx}`} className='nav-mega__item'>
                                      <Link
                                        to={`/${slugify(group.title)}/${slugify(course)}`}
                                        className='nav-mega__link'
                                      >
                                        {formatCourseLabel(course)}
                                      </Link>
                                    </li>
                                  ))}
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
                        <Link to={item.to} className='nav-menu__link'>
                          {item.label}
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

      <div className={`mobile-menu scroll-sm d-lg-none d-block ${isMenuActive ? "active" : ""}`}>
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
                      <ul className='nav-submenu scroll-sm'>
                        {item.mega && item.mega.map((group, gIdx) => {
                          const gKey = `${index}-${gIdx}`;
                          const gActive = !!openMegaGroups[gKey];
                          return (
                            <li
                              key={`m-${index}-g-${gIdx}`}
                              className={`nav-submenu__item has-submenu ${gActive ? 'activePage' : ''}`}
                            >
                              <button
                                type='button'
                                className='nav-submenu__link hover-bg-neutral-30 d-flex align-items-center justify-content-between'
                                aria-expanded={gActive}
                                aria-controls={`mega-group-${gKey}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleMegaGroup(index, gKey);
                                }}
                              >
                                <span>{group.title}</span>
                                <i className='ph ph-caret-down submenu-caret' aria-hidden='true' />
                              </button>
                              {/* Render items only when expanded */}
                              {gActive && (
                                <ul id={`mega-group-${gKey}`} className='nav-submenu'>
                                  {Array.isArray(group.items) &&
                                    group.items.map((course, cIdx) => (
                                      <li
                                        key={`m-${index}-g-${gIdx}-c-${cIdx}`}
                                        className='nav-submenu__item'
                                      >
                                        <span className='nav-submenu__link'>
                                          {formatCourseLabel(course)}
                                        </span>
                                      </li>
                                    ))}
                                </ul>
                              )}
                            </li>
                          )
                        })}
                        {/* On mobile, only show fallback links if no mega groups are defined */}
                        {!item.mega && item.links && item.links.map((link, linkIndex) => (
                          <li key={`m-${index}-l-${linkIndex}`} className='nav-submenu__item'>
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
                  <li className={`nav-menu__item ${pathname === item.to && "activePage"}`} key={index}>
                    <Link to={item.to} className='nav-menu__link'>
                      {item.label}
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









