import { Link } from "react-router-dom";
import privacyLinks from "../data/privacyLinks";

const FooterFive = () => {
  return (
    <section className='bg-white z-5'>
      <div className='pb-120'>
        <div className='container max-w-1536-px'>
          <div className='row row-cols-xxl-5 row-cols-lg-3 row-cols-sm-2 row-cols-1 gy-4'>
            <div className='col' data-aos='fade-up' data-aos-duration={600}>
              <img src='/assets/images/logo/logo.png' alt='' className='mb-24' />
              <div>
                <p className='text-neutral-700 text-14 fw-normal mb-24 max-w-240-px'>
                  Gradus exceeded all my expectations! The instructors were not
                  only experts.
                </p>
                <ul className='d-flex align-items-center gap-12'>
                  <li>
                    <a
                      href='https://www.facebook.com'
                      className='w-32 h-32 border-main-600 border rounded-circle text-16 hover-bg-main-600 hover-text-white transition-04 align-items-center justify-content-center d-flex'
                    >
                      <i className='ph ph-facebook-logo' />
                    </a>
                  </li>
                  <li>
                    <a
                      href='https://www.pinterest.com'
                      className='w-32 h-32 border-main-600 border rounded-circle text-16 hover-bg-main-600 hover-text-white transition-04 align-items-center justify-content-center d-flex'
                    >
                      <i className='ph ph-pinterest-logo' />
                    </a>
                  </li>
                  <li>
                    <a
                      href='https://www.twitch.com'
                      className='w-32 h-32 border-main-600 border rounded-circle text-16 hover-bg-main-600 hover-text-white transition-04 align-items-center justify-content-center d-flex'
                    >
                      <i className='ph ph-twitch-logo' />
                    </a>
                  </li>
                  <li>
                    <a
                      href='https://www.skype.com'
                      className='w-32 h-32 border-main-600 border rounded-circle text-16 hover-bg-main-600 hover-text-white transition-04 align-items-center justify-content-center d-flex'
                    >
                      <i className='ph ph-skype-logo' />
                    </a>
                  </li>
                </ul>
              </div>
            </div>
            <div className='col' data-aos='fade-up' data-aos-duration={700}>
              <h4 className='text-black mb-24'>Quick Link</h4>
              <div>
                <ul>
                  <li className='item-hover position-relative mb-16'>
                    <Link
                      to='/about-us'
                      className='hover-margin-left d-flex align-items-center text-neutral-700 text-16 fw-normal hover-text-warning-600'
                    >
                      <span className='position-absolute top-50 start-0 translate-middle w-8 h-8 bg-warning-600 rounded-circle transition-03 hidden group-hover-visible' />
                      About us
                    </Link>
                  </li>
                  <li className='item-hover position-relative mb-16'>
                    <Link
                      to='/course-grid-view'
                      className='hover-margin-left d-flex align-items-center text-neutral-700 text-16 fw-normal hover-text-warning-600'
                    >
                      <span className='position-absolute top-50 start-0 translate-middle w-8 h-8 bg-warning-600 rounded-circle transition-03 hidden group-hover-visible' />
                      Courses
                    </Link>
                  </li>
                  <li className='item-hover position-relative mb-16'>
                    <Link
                      to='/instructor'
                      className='hover-margin-left d-flex align-items-center text-neutral-700 text-16 fw-normal hover-text-warning-600'
                    >
                      <span className='position-absolute top-50 start-0 translate-middle w-8 h-8 bg-warning-600 rounded-circle transition-03 hidden group-hover-visible' />
                      Instructor
                    </Link>
                  </li>
                  <li className='item-hover position-relative mb-16'>
                    <Link
                      to='/faqs'
                      className='hover-margin-left d-flex align-items-center text-neutral-700 text-16 fw-normal hover-text-warning-600'
                    >
                      <span className='position-absolute top-50 start-0 translate-middle w-8 h-8 bg-warning-600 rounded-circle transition-03 hidden group-hover-visible' />
                      FAQs
                    </Link>
                  </li>
                  <li className='item-hover position-relative'>
                    <Link
                      to='/blogs'
                      className='hover-margin-left d-flex align-items-center text-neutral-700 text-16 fw-normal hover-text-warning-600'
                    >
                      <span className='position-absolute top-50 start-0 translate-middle w-8 h-8 bg-warning-600 rounded-circle transition-03 hidden group-hover-visible' />
                      Blog
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
            <div className='col' data-aos='fade-up' data-aos-duration={800}>
              <h4 className='text-black mb-24'>Privacy Statements</h4>
              <div>
                <ul>
                  {privacyLinks.map(({ to, label }, index) => (
                    <li
                      key={to}
                      className={`item-hover position-relative mb-${
                        index === privacyLinks.length - 1 ? "0" : "16"
                      }`}
                    >
                      <Link
                        to={to}
                        className='hover-margin-left d-flex align-items-center text-neutral-700 text-16 fw-normal hover-text-warning-600'
                      >
                        <span className='position-absolute top-50 start-0 translate-middle w-8 h-8 bg-warning-600 rounded-circle transition-03 hidden group-hover-visible' />
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className='col' data-aos='fade-up' data-aos-duration={900}>
              <h4 className='text-black mb-24 text-24 fw-semibold'>
                Newsletter
              </h4>
              <p className='text-neutral-700 text-16 fw-normal mb-32'>
                Subscribe our newsletter to get our latest update &amp; news
              </p>
              <div>
                <form action='#' className='position-relative'>
                  <input
                    type='email'
                    className='text-14 text-neutral-700 py-20 ps-24 pe-104 bg-white border-main-600 border rounded-pill w-100 h-64 focus-border-main-500 focus-visible-outline'
                    placeholder='Email address'
                  />
                  <button
                    type='button'
                    className='w-72 h-48 bg-main-600 rounded-pill justify-content-center align-items-center d-flex text-white position-absolute top-50-percent translate-middle-y inset-inline-end-0-px me-8'
                  >
                    <i className='ph-bold ph-paper-plane-tilt' />
                  </button>
                </form>
              </div>
            </div>
            <div className='col' data-aos='fade-up' data-aos-duration={1000}>
              <h4 className='text-black mb-24'>Resources</h4>
              <p className='text-neutral-700 text-16 fw-normal mb-0'>Use the links in this footer to navigate to the privacy statements relevant to you.</p>
            </div>
          </div>
        </div>
      </div>
      {/* ========footer bottom section start ===========*/}
      <div className='container max-w-1536-px position-relative z-2'>
        <div className='py-32 border-top border-white'>
          <div className='d-flex flex-column gap-16 align-items-center'>
            <p className='text-16 fw-semibold text-neutral-700 text-center mb-0'>
              Copyright ©2025 Gradus. Designed By Wowtheme7
            </p>
            <div className='footer-links d-flex flex-wrap gap-16 justify-content-center'>
              <Link
                to='/privacy-policy'
                className='text-neutral-700 hover-text-warning-800'
              >
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
      {/* ========footer bottom section end============= */}
      <div className='position-absolute bottom-0 start-0 w-100 z-1'>
        <img
          src='/assets/images/shapes/cloud-shap-img5.png'
          alt=''
          className='w-100'
        />
      </div>
    </section>
  );
};

export default FooterFive;
