import { Link } from "react-router-dom";
import privacyLinks from "../data/privacyLinks";

const FooterTwo = () => {
  return (
    <footer className='footer bg-neutral-900 position-relative z-1'>
      <img
        src='assets/images/shapes/shape2.png'
        alt=''
        className='shape five animation-scalation'
      />
      <img
        src='assets/images/shapes/shape6.png'
        alt=''
        className='shape one animation-scalation'
      />
      <div className='py-120 '>
        <div className='container container-two'>
          <div className='row gy-5'>
            <div
              className='col-lg-3 col-sm-6 col-xs-6'
              data-aos='fade-up'
              data-aos-duration={400}
            >
              <div className='footer-item'>
                <h4 className='footer-item__title fw-medium text-white mb-32'>
                  Quick Link
                </h4>
                <ul className='footer-menu'>
                  <li className='mb-16'>
                    <Link
                      to='/about-us'
                      className='text-white hover-text-main-600 hover-text-decoration-underline'
                    >
                      About us
                    </Link>
                  </li>
                  <li className='mb-16'>
                    <Link
                      to='/course-grid-view'
                      className='text-white hover-text-main-600 hover-text-decoration-underline'
                    >
                      Courses
                    </Link>
                  </li>
                  <li className='mb-16'>
                    <Link
                      to='/instructor'
                      className='text-white hover-text-main-600 hover-text-decoration-underline'
                    >
                      Instructor
                    </Link>
                  </li>
                  <li className='mb-16'>
                    <Link
                      to='/faq'
                      className='text-white hover-text-main-600 hover-text-decoration-underline'
                    >
                      FAQs
                    </Link>
                  </li>
                  <li className='mb-0'>
                    <Link
                      to='/blog'
                      className='text-white hover-text-main-600 hover-text-decoration-underline'
                    >
                      Blogs
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
            <div
              className='col-lg-3 col-sm-6 col-xs-6'
              data-aos='fade-up'
              data-aos-duration={600}
            >
              <div className='footer-item'>
                <h4 className='footer-item__title fw-medium text-white mb-32'>
                  Privacy Statements
                </h4>
                <ul className='footer-menu'>
                  {privacyLinks.map(({ to, label }, index) => (
                    <li
                      key={to}
                      className={`mb-${
                        index === privacyLinks.length - 1 ? "0" : "16"
                      }`}
                    >
                      <Link
                        to={to}
                        className='text-white hover-text-main-600 hover-text-decoration-underline'
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div
              className='col-lg-3 col-sm-6 col-xs-6'
              data-aos='fade-up'
              data-aos-duration={800}
            >
              <div className='footer-item'>
                <h4 className='footer-item__title fw-medium text-white mb-32'>
                  Resources
                </h4>
                <p className='text-neutral-200 mb-0'>Discover audience-specific privacy resources tailored for candidates, employees, partners, and more.</p>
              </div>
            </div>
            <div
              className='col-lg-3 col-sm-6 col-xs-6'
              data-aos='fade-up'
              data-aos-duration={1200}
            >
              <div className='footer-item'>
                <h4 className='footer-item__title fw-medium text-white mb-32'>
                  Subscribe Here
                </h4>
                <p className='text-white'>
                  Enter your email address to register to our newsletter
                  subscription
                </p>
                <form action='#' className='mt-24 position-relative'>
                  <input
                    type='email'
                    className='form-control bg-neutral-700 placeholder-white shadow-none border border-neutral-700 text-white rounded-pill h-52 ps-24 pe-48 focus-border-main-600'
                    placeholder='Email...'
                  />
                  <button
                    type='submit'
                    className='w-36 h-36 flex-center rounded-circle bg-main-600 text-white hover-bg-main-800 position-absolute top-50 translate-middle-y inset-inline-end-0 me-8'
                  >
                    <i className='ph ph-paper-plane-tilt' />
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className='container'>
        {/* bottom Footer */}
        <div className='bottom-footer border-top border-dashed border-neutral-600 border-0 py-32'>
          <div className='container container-two'>
            <div className='bottom-footer__inner flex-between gap-16 flex-wrap'>
              <div className='footer-item__logo mb-0' data-aos='zoom-in-right'>
                <Link to='/'>
                  {" "}
                  <img src='assets/images/logo/logo-white.png' alt='' />
                </Link>
              </div>
              <p
                className='text-white text-line-1 fw-normal'
                data-aos='zoom-in'
              >
                {" "}
                Copyright © 2025 <span className='fw-semibold'>
                  Gradus{" "}
                </span>{" "}
                All Rights Reserved.
              </p>
              <div className='footer-links d-flex flex-wrap gap-16 justify-content-center' data-aos='zoom-in'>
                <Link
                  to='/privacy-policy'
                  className='text-white hover-text-main-600 hover-text-decoration-underline'
                >
                  Privacy Policy
                </Link>
              </div>
              <ul
                className='social-list flex-align gap-24'
                data-aos='zoom-in-left'
              >
                <li className='social-list__item'>
                  <Link
                    to='https://www.facebook.com'
                    className='text-white text-2xl hover-text-main-two-600'
                  >
                    <i className='ph-bold ph-facebook-logo' />
                  </Link>
                </li>
                <li className='social-list__item'>
                  <Link
                    to='https://www.twitter.com'
                    className='text-white text-2xl hover-text-main-two-600'
                  >
                    <i className='ph-bold ph-twitter-logo' />
                  </Link>
                </li>
                <li className='social-list__item'>
                  <Link
                    to='https://www.linkedin.com'
                    className='text-white text-2xl hover-text-main-two-600'
                  >
                    <i className='ph-bold ph-instagram-logo' />
                  </Link>
                </li>
                <li className='social-list__item'>
                  <Link
                    to='https://www.pinterest.com'
                    className='text-white text-2xl hover-text-main-two-600'
                  >
                    <i className='ph-bold ph-pinterest-logo' />
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default FooterTwo;
