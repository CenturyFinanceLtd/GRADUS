import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import Select from "react-select";
import { useAuth } from "../context/AuthContext.jsx";
const HeaderOne = () => {
  let { pathname } = useLocation();
  const [scroll, setScroll] = useState(false);
  const [isMenuActive, setIsMenuActive] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  useEffect(() => {
    window.onscroll = () => {
      if (window.pageYOffset < 150) {
        setScroll(false);
      } else if (window.pageYOffset > 150) {
        setScroll(true);
      }
      return () => (window.onscroll = null);
    };
  }, []);

  const options = [
    { value: "gradusquity", label: "GradusQuity" },
    { value: "gradusx", label: "GradusX" },
    { value: "graduslead", label: "GradusLead" },
  ];

  const [selectedOption, setSelectedOption] = useState(null);

  // Course summaries to show in the popup
  const courseSummaries = {
    GradusQuity:
      "Capital markets mastery designed for future-ready equity, debt, and derivative professionals.",
    GradusX:
      "Full‑stack technology, AI, and digital growth curriculum uniting software engineering with data storytelling.",
    GradusLead:
      "Business and leadership journey that cultivates emerging CXOs with finance, strategy, and people excellence.",
  };

  const [showCoursePopup, setShowCoursePopup] = useState(false);
  const [popupCourse, setPopupCourse] = useState({ title: "", summary: "" });
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const profileLink = isAuthenticated ? "/profile" : "/sign-in";
  const profileLabel = isAuthenticated
    ? `Open account menu (${user?.firstName || user?.email || "account"})`
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
    document.body.classList.remove("scroll-hide-sm");
  };

  const toggleUserMenu = () => {
    setIsUserMenuOpen((prev) => !prev);
  };

  const closeUserMenu = () => setIsUserMenuOpen(false);

  // When a course is selected, show popup with short summary
  const handleCourseChange = (option) => {
    setSelectedOption(option);
    const title = option?.label ?? "";
    const summary = courseSummaries[title] ?? "";
    if (title && summary) {
      setPopupCourse({ title, summary });
      setShowCoursePopup(true);
    }
  };

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
      setActiveSubmenu((prevIndex) => (prevIndex === index ? null : index));
    }
  };

  const menuItems = [
    { to: "/", label: "Home" },
    { to: "/about-us", label: "Know Gradus" },
    { to: "/our-courses", label: "Our Courses" },
    
    // {
    //   label: "Pages",
    //   links: [
    //     { to: "/about-us", label: "About" },
    //     { to: "/about-two", label: "About Two" },
    //     { to: "/about-three", label: "About Three" },
    //     { to: "/about-four", label: "About Four" },
    //     { to: "/product", label: "Product" },
    //     { to: "/product-details", label: "Product Details" },
    //     { to: "/cart", label: "Cart" },
    //     { to: "/checkout", label: "Checkout" },
    //     { to: "/pricing-plan", label: "Pricing Plan" },
    //     { to: "/instructor", label: "Instructor" },
    //     { to: "/instructor-two", label: "Instructor Two" },
    //     { to: "/instructor-details", label: "Instructor Details" },
    //     { to: "/tutor", label: "Premium Tutors" },
    //     { to: "/tutor-details", label: "Premium Tutors Details" },
    //     { to: "/faq", label: "FAQ" },
    //     { to: "/tuition-jobs", label: "Tuition Jobs" },
    //     { to: "/events", label: "Events" },
    //     { to: "/event-details", label: "Event Details" },
    //     { to: "/apply-admission", label: "Apply Admission" },
    //     { to: "/gallery", label: "Gallery" },
    //     { to: "/privacy-policy", label: "Privacy Policy" },
    //     { to: "/my-courses", label: "My Courses" },
    //     { to: "/find-tutors", label: "Find Best Tutors" },
    //     { to: "/book-online-class", label: "Book Online Class" },
    //     { to: "/index-2", label: "Home Online Course" },
    //     { to: "/index-3", label: "Home LMS" },
    //     { to: "/index-4", label: "Home Tutor" },
    //     { to: "/index-5", label: "Home Kindergarten" },
    //     { to: "/index-6", label: " Home Kindergarten two" },
    //     { to: "/course-grid-view", label: "Course Grid View" },
    //     { to: "/course-list-view", label: "Course List View" },
    //     { to: "/course-details", label: "Course Details" },
    //     { to: "/lesson-details", label: "Lesson Details" },
    //   ],
    // },

   
    { to: "/blogs", label: "Blogs" },
    { to: "/contact", label: "Contact Us" },
  ];

  return (
    <>
      <div className={`side-overlay ${isMenuActive ? "show" : ""}`}></div>
      <header className={`header ${scroll ? "fixed-header" : ""}`}>
        <div className='container container--xl'>
          <nav className='header-inner flex-between gap-8'>
            <div className='header-content-wrapper flex-align flex-grow-1'>
              {/* Logo Start */}
              <div className='logo'>
                <Link to='/' className='link'>
                  <img src='/assets/images/logo/logo.png' alt='Logo' />
                </Link>
              </div>
              {/* Logo End  */}
              {/* Select Start */}
              <div className='d-sm-block d-none'>
                <div className='header-select   rounded-pill position-relative'>
                  <div className='custom__select'>
                    <Select
                      classNames={{
                        control: (state) =>
                          state.isFocused
                            ? " border-focus"
                            : "border-neutral-30",
                      }}
                      placeholder='Choose Course'
                      value={selectedOption}
                      onChange={handleCourseChange}
                      options={options}
                    />
                  </div>
                  {showCoursePopup && (
                    <div
                      className='course-popup'
                      key={popupCourse.title}
                      role='dialog'
                      aria-live='polite'
                      aria-label={`${popupCourse.title} summary`}
                    >
                      <button
                        type='button'
                        className='course-popup__close'
                        aria-label='Close'
                        onClick={() => setShowCoursePopup(false)}
                      >
                        <i className='ph ph-x'></i>
                      </button>
                      <div className='course-popup__content'>
                        <div className='course-popup__title'>{popupCourse.title}</div>
                        <div className='course-popup__text'>{popupCourse.summary}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Select End */}
              {/* Menu Start  */}
              <div className='header-menu d-lg-block d-none'>
                <ul className='nav-menu flex-align'>
                  {menuItems.map((item, index) =>
                    item.links ? (
                      <li
                        key={`menu-item-${index}`}
                        className='nav-menu__item has-submenu'
                      >
                        <span to='#' className='nav-menu__link'>
                          {item.label}
                        </span>
                        <ul className={`nav-submenu scroll-sm`}>
                          {item.links.map((link, linkIndex) => (
                            <li
                              key={`submenu-item-${linkIndex}`}
                              className={`nav-submenu__item ${
                                pathname === link.to && "activePage"
                              }`}
                            >
                              <Link
                                to={link.to}
                                className='nav-submenu__link hover-bg-neutral-30'
                              >
                                {link.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </li>
                    ) : (
                      <li
                        key={`menu-contact-${index}`}
                        className={`nav-menu__item ${
                          pathname === item.to && "activePage"
                        }`}
                      >
                        <Link to={item.to} className='nav-menu__link'>
                          {item.label}
                        </Link>
                      </li>
                    )
                  )}
                </ul>
              </div>
              {/* Menu End  */}
            </div>
            {/* Header Right start */}
            <div className='header-right flex-align'>
              <form
                action='#'
                className='search-form position-relative d-xl-block d-none'
              >
                <input
                  type='text'
                  className='common-input rounded-pill bg-main-25 pe-48 border-neutral-30'
                  placeholder='Search...'
                />
                <button
                  type='submit'
                  className='w-36 h-36 bg-main-600 hover-bg-main-700 rounded-circle flex-center text-md text-white position-absolute top-50 translate-middle-y inset-inline-end-0 me-8'
                >
                  <i className='ph-bold ph-magnifying-glass' />
                </button>
              </form>
              {isAuthenticated ? (
                <div className='position-relative' ref={userMenuRef}>
                  <button
                    type='button'
                    onClick={toggleUserMenu}
                    className='info-action w-52 h-52 bg-main-25 hover-bg-main-600 border border-neutral-30 rounded-circle flex-center text-2xl text-neutral-500 hover-text-white hover-border-main-600'
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
                <Link
                  to={profileLink}
                  title={profileLabel}
                  aria-label={profileLabel}
                  className='info-action w-52 h-52 bg-main-25 hover-bg-main-600 border border-neutral-30 rounded-circle flex-center text-2xl text-neutral-500 hover-text-white hover-border-main-600'
                >
                  <i className='ph ph-user-circle' />
                </Link>
              )}
              <button
                type='button'
                className='toggle-mobileMenu d-lg-none text-neutral-200 flex-center'
                onClick={toggleMenu}
              >
                <i className='ph ph-list' />
              </button>
            </div>
            {/* Header Right End  */}
          </nav>
        </div>
      </header>

      <div
        className={`mobile-menu scroll-sm d-lg-none d-block ${
          isMenuActive ? "active" : ""
        }`}
      >
        <button type='button' className='close-button' onClick={closeMenu}>
          <i className='ph ph-x' />{" "}
        </button>
        <div className='mobile-menu__inner'>
          <Link to='/' className='mobile-menu__logo'>
            <img src='/assets/images/logo/logo.png' alt='Logo' />
          </Link>
          <div className='mobile-menu__menu'>
            <ul className='nav-menu flex-align nav-menu--mobile'>
              {menuItems.map((item, index) =>
                item.links ? (
                  <li
                    key={`menu-item-${index}`}
                    className={`nav-menu__item has-submenu ${
                      activeSubmenu === index ? "activePage" : ""
                    }`}
                    onClick={() => handleSubmenuClick(index)}
                  >
                    <span className='nav-menu__link'>{item.label}</span>
                    <ul className={`nav-submenu scroll-sm`}>
                      {item.links.map((link, linkIndex) => (
                        <li key={linkIndex} className='nav-submenu__item'>
                          <Link
                            to={link.to}
                            className='nav-submenu__link hover-bg-neutral-30'
                          >
                            {link.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </li>
                ) : (
                  <li
                    className={`nav-menu__item ${
                      pathname === item.to && "activePage"
                    }`}
                    key={index}
                  >
                    <Link to={item.to} className='nav-menu__link'>
                      {item.label}
                    </Link>
                  </li>
                )
              )}
            </ul>
            <div className='d-sm-none d-block mt-24'>
              <div className='header-select mobile  rounded-pill position-relative'>
                <div className='custom__select'>
                  <Select
                    classNames={{
                      control: (state) =>
                        state.isFocused ? " border-focus" : "border-neutral-30",
                    }}
                    placeholder='Choose Course'
                    value={selectedOption}
                    onChange={handleCourseChange}
                    options={options}
                  />
                </div>
                {showCoursePopup && (
                  <div
                    className='course-popup'
                    key={popupCourse.title}
                    role='dialog'
                    aria-live='polite'
                    aria-label={`${popupCourse.title} summary`}
                  >
                    <button
                      type='button'
                      className='course-popup__close'
                      aria-label='Close'
                      onClick={() => setShowCoursePopup(false)}
                    >
                      <i className='ph ph-x'></i>
                    </button>
                    <div className='course-popup__content'>
                      <div className='course-popup__title'>{popupCourse.title}</div>
                      <div className='course-popup__text'>{popupCourse.summary}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default HeaderOne;









