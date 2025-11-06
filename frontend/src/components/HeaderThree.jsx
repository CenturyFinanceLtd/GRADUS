import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
// react-select removed (course selector not used)
import { useAuth } from "../context/AuthContext.jsx";

const HeaderThree = () => {
  let { pathname } = useLocation();
  const [scroll, setScroll] = useState(false);
  const [isMenuActive, setIsMenuActive] = useState(false);

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
  const { isAuthenticated, user } = useAuth();
  const profileLink = isAuthenticated ? "/profile" : "/sign-in";
  const fallbackName = user?.email ? user.email.split("@")[0] : "";
  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.name ||
    fallbackName ||
    "Account";
  const profileLabel = isAuthenticated
    ? `Open profile (${displayName})`
    : "Sign in";

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
      <header
        className={`header position-absolute z-2 w-100 top-0 ${
          scroll ? "fixed-header" : ""
        }`}
      >
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
              {/* Search removed */}
              {isAuthenticated ? (
                <>
                  <Link
                    to='#'
                    className='info-action w-44 h-44 bg-white hover-bg-main-600 rounded-circle flex-center text-xl text-neutral-500 hover-text-white position-relative me-6 d-none d-lg-flex'
                  >
                    <i className='ph-bold ph-shopping-cart-simple' />
                    <span className='w-22 h-22 flex-center rounded-circle bg-main-two-600 text-white text-xs position-absolute top-n6 end-n4'>
                      1
                    </span>
                  </Link>
                  <Link
                    to={profileLink}
                    className='account-pill d-none d-lg-inline-flex'
                    title={profileLabel}
                    aria-label={profileLabel}
                  >
                    <span className='account-pill__icon'><i className='ph ph-user-circle' /></span>
                    <span className='account-pill__label'>{displayName}</span>
                  </Link>
                  {/* Mobile compact icon */}
                  <Link
                    to={profileLink}
                    title={profileLabel}
                    aria-label={profileLabel}
                    className='info-action w-52 h-52 bg-white hover-bg-main-600 border border-neutral-30 rounded-circle flex-center text-2xl text-neutral-500 hover-text-white hover-border-main-600 d-lg-none'
                  >
                    <i className='ph ph-user-circle' />
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to='/sign-in'
                    className='account-pill d-none d-lg-inline-flex'
                    title={profileLabel}
                    aria-label={profileLabel}
                  >
                    <span className='account-pill__icon'><i className='ph ph-user-circle' /></span>
                    <span className='account-pill__label'>Sign in</span>
                  </Link>
                  <Link
                    to={profileLink}
                    title={profileLabel}
                    aria-label={profileLabel}
                    className='info-action w-52 h-52 bg-white hover-bg-main-600 border border-neutral-30 rounded-circle flex-center text-2xl text-neutral-500 hover-text-white hover-border-main-600 d-lg-none'
                  >
                    <i className='ph ph-user-circle' />
                  </Link>
                </>
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
              <div className='header-select mobile   rounded-pill position-relative'>
                <div className='custom__select'>
                  <Select
                    classNames={{
                      control: (state) =>
                        state.isFocused ? " border-focus" : "border-neutral-30",
                    }}
                    value={selectedOption}
                    onChange={setSelectedOption}
                    options={options}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default HeaderThree;





