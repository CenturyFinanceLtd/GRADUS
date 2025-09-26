import Slider from "react-slick";
import { courseSeriesData, courseSeriesHeroContent } from "../../data/courseSeriesData";

const CourseSeriesOverview = () => {
  const { tagIcon, tagText, title, description } = courseSeriesHeroContent;

  const sliderSettings = {
    dots: true,
    arrows: false,
    infinite: true,
    speed: 600,
    slidesToShow: 1,
    slidesToScroll: 1,
    centerMode: true,
    centerPadding: "0px",
    autoplay: true,
    autoplaySpeed: 5000,
    cssEase: "cubic-bezier(0.45, 0, 0.15, 1)",
  };

  const renderCard = (course) => (
    <div
      className='p-32 h-100 bg-white border border-neutral-30 rounded-24 box-shadow-md position-relative overview-card mx-auto'
    >
      <div className='d-flex align-items-start gap-16 mb-20'>
        <span className='flex-shrink-0 w-52 h-52 rounded-circle bg-main-600 text-white flex-center text-xl fw-semibold'>
          {course.name.charAt(0)}
        </span>
        <div>
          <h4 className='mb-8 text-neutral-900'>{course.name}</h4>
          <p className='text-neutral-600 mb-0'>{course.subtitle}</p>
        </div>
      </div>
      <p className='text-neutral-500 mb-20'>{course.focus}</p>
      <ul className='list-unstyled d-grid gap-12 mb-24'>
        {course.approvals.map((item, index) => (
          <li
            className='d-flex align-items-start gap-12 text-neutral-600'
            key={`overview-${course.id}-approval-${index}`}
          >
            <i className='ph-bold ph-check-circle text-main-600 mt-2 d-inline-flex' />
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <div className='p-16 rounded-16 bg-main-25 text-neutral-700 fw-medium mb-24'>
        {course.placementRange}
      </div>
      <a href={`#${course.id}`} className='btn btn-main rounded-pill flex-align gap-8'>
        Explore Series
        <i className='ph-bold ph-arrow-up-right d-flex text-lg' />
      </a>
    </div>
  );

  return (
    <section
      className='our-courses-overview py-120 position-relative z-1'
    >
      <div className='container'>
        <div className='row justify-content-center text-center'>
          <div className='col-xl-8 col-lg-9'>
            <div className='d-inline-flex flex-align gap-8 px-24 py-8 rounded-pill bg-white text-main-600 text-md fw-medium'>
              <i className={`${tagIcon} d-inline-flex text-lg`} />
              {tagText}
            </div>
            <h2 className='mt-24 mb-16 text-white'>{title}</h2>
            <p className='hero-description mb-0'>{description}</p>
          </div>
        </div>

        <div className='our-courses-slider d-lg-none d-block mt-40 px-3'>
          <Slider {...sliderSettings}>
            {courseSeriesData.map((course) => (
              <div key={`overview-slide-${course.id}`} className='px-2'>
                {renderCard(course)}
              </div>
            ))}
          </Slider>
        </div>

        <div className='row gy-4 mt-40 d-none d-lg-flex'>
          {courseSeriesData.map((course) => (
            <div className='col-lg-4 col-md-6' key={`overview-grid-${course.id}`}>
              {renderCard(course)}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CourseSeriesOverview;






