import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
// react-select removed (course selector not used)
import { useAuth } from "../context/AuthContext.jsx";

const HeaderTwo = () => {
  let { pathname } = useLocation();
  const [scroll, setScroll] = useState(false);
  const [isMenuActive, setIsMenuActive] = useState(false);
  const [activeMenuAnchor, setActiveMenuAnchor] = useState(null);
  const topUserMenuRef = useRef(null);
  const navUserMenuRef = useRef(null);

  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();

  const fallbackName = user?.email ? user.email.split("@")[0] : "";
  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.name ||
    fallbackName ||
    "Learner";
  const greetingName = displayName || "Learner";
  const profileLabel = isAuthenticated
    ? `Open account menu for ${displayName}`
    : "Sign in";

  const fallbackAvatar = "/assets/images/thumbs/user-two-img1.png";
  const avatarSrc =
    user?.avatarUrl ||
    user?.avatar ||
    user?.profileImage ||
    user?.profilePhoto ||
    user?.photo ||
    user?.image ||
    fallbackAvatar;

  const isTopMenuOpen = activeMenuAnchor === "top";
  const isNavMenuOpen = activeMenuAnchor === "nav";

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

  // Course select removed

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

  const toggleUserMenu = (anchor) => {
    setActiveMenuAnchor((prev) => (prev === anchor ? null : anchor));
  };

  const closeUserMenu = () => setActiveMenuAnchor(null);

  const handleLogout = () => {
    closeUserMenu();
    logout();
    navigate("/sign-in", { replace: true });
  };

  const renderUserMenuDropdown = () => (
    <div
      className='header-user-menu position-absolute inset-inline-end-0 mt-12 bg-white border border-neutral-30 rounded-12 box-shadow-md py-12'
      role='menu'
      style={{ minWidth: "220px", zIndex: 1100, top: "100%" }}
    >
      <div className='d-flex flex-column'>
        <Link
          to='/profile'
          onClick={closeUserMenu}
          className='px-20 py-10 flex-align gap-12 text-md text-neutral-700 hover-bg-main-25 hover-text-main-600'
          role='menuitem'
        >
          <span className='flex-shrink-0 text-neutral-500'>
            <svg
              width='20'
              height='20'
              viewBox='0 0 24 24'
              fill='none'
              xmlns='http://www.w3.org/2000/svg'
              aria-hidden='true'
            >
              <circle cx='12' cy='7' r='4' stroke='currentColor' strokeWidth='2' />
              <path
                d='M4 20c0-3.5 4.5-6 8-6s8 2.5 8 6'
                stroke='currentColor'
                strokeWidth='2'
                strokeLinecap='round'
              />
            </svg>
          </span>
          <span>My Profile</span>
        </Link>
        <Link
          to='/my-courses'
          onClick={closeUserMenu}
          className='px-20 py-10 flex-align gap-12 text-md text-neutral-700 hover-bg-main-25 hover-text-main-600'
          role='menuitem'
        >
          <span className='flex-shrink-0 text-neutral-500'>
            <svg
              width='20'
              height='20'
              viewBox='0 0 24 24'
              fill='none'
              xmlns='http://www.w3.org/2000/svg'
              aria-hidden='true'
            >
              <path
                d='M12 4H7.5C5.57 4 4 5.57 4 7.5V19c.8-1.2 2.2-2 3.7-2H12V4z'
                stroke='currentColor'
                strokeWidth='2'
                fill='none'
              />
              <path
                d='M12 4h4.5C18.43 4 20 5.57 20 7.5V19c-.8-1.2-2.2-2-3.7-2H12V4z'
                stroke='currentColor'
                strokeWidth='2'
                fill='none'
              />
            </svg>
          </span>
          <span>My Courses</span>
        </Link>
        <button
          type='button'
          onClick={handleLogout}
          className='px-20 py-10 flex-align gap-12 text-md text-neutral-700 hover-bg-main-25 hover-text-main-600 border-0 bg-transparent text-start w-100'
          role='menuitem'
        >
          <span className='flex-shrink-0 text-neutral-500'>
            <svg
              width='20'
              height='20'
              viewBox='0 0 24 24'
              fill='none'
              xmlns='http://www.w3.org/2000/svg'
              aria-hidden='true'
            >
              <path d='M3 12h9' stroke='currentColor' strokeWidth='2' />
              <path
                d='M12 8l4 4-4 4'
                stroke='currentColor'
                strokeWidth='2'
                strokeLinecap='round'
                strokeLinejoin='round'
              />
              <path d='M15 3h6v18h-6' stroke='currentColor' strokeWidth='2' />
            </svg>
          </span>
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  useEffect(() => {
    if (!isAuthenticated) {
      setActiveMenuAnchor(null);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        (topUserMenuRef.current &&
          topUserMenuRef.current.contains(event.target)) ||
        (navUserMenuRef.current && navUserMenuRef.current.contains(event.target))
      ) {
        return;
      }
      setActiveMenuAnchor(null);
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setActiveMenuAnchor(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

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
    { to: "/our-courses", label: "Our Courses" },
    // Redirect to Our Courses with pre-applied filters
    { to: "/our-courses?programme=gradus-finlit", label: "Stock Market Courses" },
    { to: "/our-courses?programme=gradus-x", label: "Tech Courses Placement" },
    { to: "/blogs", label: "Blogs" },
    { to: "/contact", label: "Contact us" },
  ];

  return (
    <>
      <div className={`side-overlay ${isMenuActive ? "show" : ""}`}></div>

      {/* header top */}
      <div className='header-top bg-main-25 border-bottom border-neutral-20'>
        <div className='container'>
          <div className='flex-between gap-24'>
            {/* Logo Start */}
            <div className='logo'>
              <Link to='/' className='link'>
                <img src='/assets/images/logo/logo.png' alt='Logo' />
              </Link>
            </div>
            {/* Logo End  */}
            {/* Search removed */}
            {/* Account Actions Start */}
            {isAuthenticated ? (
              <div
                className='header-user position-relative flex-shrink-0 d-none d-lg-flex'
                ref={topUserMenuRef}
              >
                <button
                  type='button'
                  onClick={() => toggleUserMenu("top")}
                  className='header-user__toggle flex-align gap-12 bg-white border border-neutral-30 rounded-pill ps-16 pe-20 py-8 box-shadow-md transition-2'
                  title={profileLabel}
                  aria-label={profileLabel}
                  aria-haspopup='menu'
                  aria-expanded={isTopMenuOpen}
                >
                  <span className='header-user__avatar w-44 h-44 rounded-circle overflow-hidden flex-center bg-main-25 text-main-600'>
                    <img
                      src={avatarSrc}
                      alt={`${displayName} avatar`}
                      className='w-100 h-100 object-fit-cover'
                    />
                  </span>
                  <span className='d-none d-xl-flex flex-column align-items-start text-start lh-1'>
                    <span className='text-xs text-neutral-500'>Hi,</span>
                    <span className='text-md text-neutral-900 fw-semibold mt-4'>
                      {greetingName}
                    </span>
                  </span>
                  <i className='ph-bold ph-caret-down text-neutral-500 d-none d-xl-flex text-lg' />
                </button>
                {isTopMenuOpen && renderUserMenuDropdown()}
              </div>
            ) : (
              <>
                <div className='d-lg-flex d-none flex-align flex-md-nowrap flex-wrap gap-16 flex-shrink-0'>
                  <Link
                    to='/sign-in'
                    className='btn btn-outline-main rounded-pill flex-align gap-8'
                  >
                    Login
                    <i className='ph-bold ph-arrow-up-right d-flex text-lg' />
                  </Link>
                  <Link
                    to='/sign-up'
                    className='btn btn-main rounded-pill flex-align gap-8'
                  >
                    Sign Up
                    <i className='ph-bold ph-arrow-up-right d-flex text-lg' />
                  </Link>
                </div>
                <Link
                  to='/sign-in'
                  className='d-lg-none flex-shrink-0 w-52 h-52 bg-white hover-bg-main-600 border border-neutral-30 rounded-circle flex-center text-2xl text-neutral-500 hover-text-white hover-border-main-600'
                >
                  <i className='ph ph-user-circle' />
                </Link>
              </>
            )}
            {/* Account Actions End */}
          </div>
        </div>
      </div>

      {/* header */}
      <header
        className={`header border-bottom-0 bg-white ${
          scroll ? "fixed-header" : ""
        }`}
      >
        <div className='container'>
          <nav className='header-inner flex-between gap-8'>
            {/* Course select removed */}
            {/* Menu Start  */}
            <div className='header-menu d-lg-block d-none'>
              <ul className='nav-menu flex-align'>
                {menuItems.map((item, index) =>
                  item.links ? (
                    <li
                      key={`menu-item-${index}`}
                      className='nav-menu__item has-submenu'
                    >
                      <Link to='#' className='nav-menu__link'>
                        {item.label}
                      </Link>
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
                      key={`menu-item-${index}`}
                      className='nav-menu__item active'
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
            {/* Header Right start */}
            <div className='header-right flex-align'>
              <Link
                to='#'
                className='info-action w-44 h-44 bg-main-25 hover-bg-main-600 rounded-circle flex-center text-xl text-neutral-500 hover-text-white position-relative me-6'
              >
                <i className='ph-bold ph-heart' />
                <span className='w-22 h-22 flex-center rounded-circle bg-main-two-600 text-white text-xs position-absolute top-n6 end-n4'>
                  5
                </span>
              </Link>
              <Link
                to='#'
                className='info-action w-44 h-44 bg-main-25 hover-bg-main-600 rounded-circle flex-center text-xl text-neutral-500 hover-text-white position-relative me-6'
              >
                <i className='ph-bold ph-shopping-cart-simple' />
                <span className='w-22 h-22 flex-center rounded-circle bg-main-two-600 text-white text-xs position-absolute top-n6 end-n4'>
                  3
                </span>
              </Link>
              {isAuthenticated ? (
                <div
                  className={`header-user position-relative flex-shrink-0 me-6 ${
                    scroll ? "d-flex" : "d-flex d-lg-none"
                  }`}
                  ref={navUserMenuRef}
                >
                  <button
                    type='button'
                    onClick={() => toggleUserMenu("nav")}
                    className='header-user__toggle flex-align gap-12 bg-white border border-neutral-30 rounded-pill ps-12 pe-16 py-8 box-shadow-md transition-2'
                    title={profileLabel}
                    aria-label={profileLabel}
                    aria-haspopup='menu'
                    aria-expanded={isNavMenuOpen}
                  >
                    <span className='header-user__avatar w-40 h-40 rounded-circle overflow-hidden flex-center bg-main-25 text-main-600'>
                      <img
                        src={avatarSrc}
                        alt={`${displayName} avatar`}
                        className='w-100 h-100 object-fit-cover'
                      />
                    </span>
                    <span className='d-none d-lg-flex flex-column align-items-start text-start lh-1'>
                      <span className='text-xs text-neutral-500'>Hi,</span>
                      <span className='text-md text-neutral-900 fw-semibold mt-4'>
                        {greetingName}
                      </span>
                    </span>
                    <i className='ph-bold ph-caret-down text-neutral-500 d-none d-lg-flex text-lg' />
                  </button>
                  {isNavMenuOpen && renderUserMenuDropdown()}
                </div>
              ) : (
                <Link
                  to='/sign-in'
                  className='info-action w-44 h-44 bg-main-25 hover-bg-main-600 rounded-circle flex-center text-xl text-neutral-500 hover-text-white position-relative me-6 d-lg-none'
                  title={profileLabel}
                  aria-label={profileLabel}
                >
                  <i className='ph ph-user-circle' />
                </Link>
              )}
              <button
                type='button'
                onClick={toggleMenu}
                className='toggle-mobileMenu d-lg-none text-neutral-200 flex-center'
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
                  <li className='nav-menu__item' key={index}>
                    <Link to={item.to} className='nav-menu__link'>
                      {item.label}
                    </Link>
                  </li>
                )
              )}
            </ul>
            {/* Mobile course select removed */}
          </div>
        </div>
      </div>
    </>
  );
};

export default HeaderTwo;
