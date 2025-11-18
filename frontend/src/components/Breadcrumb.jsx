import { Link } from "react-router-dom";
import { slugify } from "../utils/slugify.js";

// Compact breadcrumb with optional programme link in the trail
// Props:
// - title: current page/course title (last crumb)
// - programme: optional programme name to show between Home and title
const Breadcrumb = ({ title, programme }) => {
  return (
    <section className='breadcrumb py-40 bg-main-25 position-relative z-1 mb-0'>
      <div className='container-fluid'>
        <div className='row justify-content-center'>
          <div className='col-lg-8'>
            <div className='breadcrumb__wrapper'>
              <h1 className='breadcrumb__title display-4 fw-semibold text-center'>
                {title}
              </h1>
              <ul className='breadcrumb__list d-flex align-items-center justify-content-center gap-4'>
                <li className='breadcrumb__item'>
                  <Link
                    to='/'
                    className='breadcrumb__link text-neutral-500 hover-text-main-600 fw-medium'
                  >
                    <i className='text-lg d-inline-flex ph-bold ph-house' /> Home
                  </Link>
                </li>
                {programme ? (
                  <>
                    <li className='breadcrumb__item '>
                      <i className='text-neutral-500 d-flex ph-bold ph-caret-right' />
                    </li>
                    <li className='breadcrumb__item'>
                      <Link
                        to={`/our-courses?programme=${slugify(programme)}`}
                        className='breadcrumb__link text-neutral-500 hover-text-main-600 fw-medium'
                      >
                        {programme}
                      </Link>
                    </li>
                  </>
                ) : null}
                <li className='breadcrumb__item '>
                  <i className='text-neutral-500 d-flex ph-bold ph-caret-right' />
                </li>
                <li className='breadcrumb__item'>
                  <span className='text-main-two-600'>{" "}{title}{" "}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Breadcrumb;
