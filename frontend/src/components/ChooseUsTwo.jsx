import { Link } from "react-router-dom";

const ChooseUsTwo = () => {
  return (
    <section className='choose-us-two pt-64 bg-main-25'>
      <div className='container'>
        <div className='row align-items-end'>
          <div className='col-lg-7 pe-xl-5'>
            <div className='pb-80 mb-lg-5 me-lg-5'>
              <div className='flex-align d-inline-flex gap-8 mb-16 wow bounceInDown'>
                <span className='text-main-600 text-2xl d-flex'>
                  <i className='ph-bold ph-book-open' />
                </span>
                <h5 className='text-main-600 mb-0'>Why Gradus</h5>
              </div>
              <h2 className='mb-24 wow bounceIn'>
                Career Acceleration Powered by Industry Insight
              </h2>
              <p className='text-neutral-500 text-line-2 wow bounceInUp'>
                Gradus compresses the journey from classroom to boardroom with paid internships and assured placements crafted in partnership with Century Finance Limited.
              </p>
              <p className='text-neutral-500 text-line-2 mt-24 wow bounceInUp'>
                Each outcome-driven module is co-designed with 178 hiring partners and delivered by veteran mentors who instill critical thinking and professional resilience.
              </p>
              <Link
                to='/about-us'
                className='btn btn-main rounded-pill flex-align d-inline-flex gap-8 mt-40'
              >
                Explore Gradus
                <i className='ph-bold ph-arrow-up-right d-flex text-lg' />
              </Link>
            </div>
          </div>
          <div className='col-lg-5'>
            <div
              className='pt-40 pb-90 px-60 bg-neutral-900 rounded-top-4'
              data-aos='fade-up-left'
            >
              <h4 className='mb-28 pb-28 border-bottom border-top-0 border-start-0 border-end-0 border-opacity-25 border-white border-dashed text-white'>
                Quick Highlights
              </h4>
              <ul>
                <li className='mb-24'>
                  <Link
                    to='/our-courses'
                    className='flex-align gap-12 text-white hover-text-decoration-underline'
                  >
                    Paid internship pathway
                    <i className='text-main-two-600 ph-bold ph-arrow-right d-flex text-xl' />
                  </Link>
                </li>
                <li className='mb-24'>
                  <Link
                    to='/our-courses'
                    className='flex-align gap-12 text-white hover-text-decoration-underline'
                  >
                    Guaranteed placement support
                    <i className='text-main-two-600 ph-bold ph-arrow-right d-flex text-xl' />
                  </Link>
                </li>
                <li className='mb-24'>
                  <Link
                    to='/our-courses'
                    className='flex-align gap-12 text-white hover-text-decoration-underline'
                  >
                    178 strategic industry alliances
                    <i className='text-main-two-600 ph-bold ph-arrow-right d-flex text-xl' />
                  </Link>
                </li>
                <li className='mb-24'>
                  <Link
                    to='/our-courses'
                    className='flex-align gap-12 text-white hover-text-decoration-underline'
                  >
                    Mentor-led experiential learning
                    <i className='text-main-two-600 ph-bold ph-arrow-right d-flex text-xl' />
                  </Link>
                </li>
                <li className='mb-24'>
                  <Link
                    to='/our-courses'
                    className='flex-align gap-12 text-white hover-text-decoration-underline'
                  >
                    Industry-calibrated curriculum
                    <i className='text-main-two-600 ph-bold ph-arrow-right d-flex text-xl' />
                  </Link>
                </li>
                <li className='mb-0'>
                  <Link
                    to='/our-courses'
                    className='flex-align gap-12 text-white hover-text-decoration-underline'
                  >
                    Nationwide recruiter network
                    <i className='text-main-two-600 ph-bold ph-arrow-right d-flex text-xl' />
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ChooseUsTwo;

