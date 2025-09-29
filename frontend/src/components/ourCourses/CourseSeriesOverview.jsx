
import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Slider from 'react-slick';

const CourseSeriesOverview = ({ heroContent, courses = [], variant = 'dark' }) => {
  const safeCourses = useMemo(
    () => (Array.isArray(courses) ? courses.filter((course) => course?.name) : []),
    [courses]
  );

  const hero = heroContent || {};
  const { tagIcon, tagText, title, description } = hero;
  const hasHeroContent = Boolean(tagIcon || tagText || title || description);
  const shouldRender = hasHeroContent || safeCourses.length > 0;
  const sectionClassName = `our-courses-overview py-120 position-relative z-1${
    variant === 'light' ? ' our-courses-overview--light' : ''
  }`;
  const titleClassName = `mt-24 mb-16 ${variant === 'light' ? 'text-neutral-900' : 'text-white'}`;
  const descriptionClassName = `hero-description mb-0${
    variant === 'light' ? ' text-neutral-600' : ''
  }`;

  const navigate = useNavigate();

  const handleExploreClick = useCallback(
    (courseId, event) => {
      if (!courseId) {
        return;
      }

      if (event?.preventDefault) {
        event.preventDefault();
      }

      if (typeof window !== 'undefined') {
        const target = document.getElementById(courseId);
        if (target) {
          const scrollTarget = target.getBoundingClientRect().top + window.pageYOffset - 96;
          window.scrollTo({ top: Math.max(scrollTarget, 0), behavior: 'smooth' });
          return;
        }
      }

      navigate(`/our-courses#${courseId}`);
    },
    [navigate]
  );

  if (!shouldRender) {
    return null;
  }
  const sliderSettings = {
    dots: true,
    arrows: false,
    infinite: true,
    speed: 700,
    slidesToShow: 1,
    slidesToScroll: 1,
    centerMode: true,
    centerPadding: '0px',
    autoplay: true,
    autoplaySpeed: 6200,
    cssEase: 'cubic-bezier(0.45, 0, 0.15, 1)',
  };

  const renderCard = (course) => {
    const approvals = Array.isArray(course.approvals) ? course.approvals : [];
    const placementRange = course.placementRange;
    const courseId = course.id || course.slug;
    const nameInitial = (course.name || '?').charAt(0).toUpperCase();
    const price = course.price;

    return (
      <div
        className='p-32 h-100 bg-white border border-neutral-30 rounded-24 box-shadow-md position-relative overview-card mx-auto'
      >
        <div className='d-flex align-items-start gap-16 mb-20'>
          <span className='flex-shrink-0 w-52 h-52 rounded-circle bg-main-600 text-white flex-center text-xl fw-semibold'>
            {nameInitial}
          </span>
          <div>
            <h4 className='mb-8 text-neutral-900'>{course.name}</h4>
            {course.subtitle ? <p className='text-neutral-600 mb-0'>{course.subtitle}</p> : null}
          </div>
        </div>
        {course.focus ? <p className='text-neutral-500 mb-20'>{course.focus}</p> : null}
        {price ? (
          <p className='text-neutral-800 fw-semibold mb-20'>
            Program Fee: <span className='text-main-600'>{price}</span>
          </p>
        ) : null}
        {approvals.length ? (
          <ul className='list-unstyled d-grid gap-12 mb-24'>
            {approvals.map((item, index) => (
              <li
                className='d-flex align-items-start gap-12 text-neutral-600'
                key={`overview-${courseId}-approval-${index}`}
              >
                <i className='ph-bold ph-check-circle text-main-600 mt-2 d-inline-flex' />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ) : null}
        {placementRange ? (
          <div className='p-16 rounded-16 bg-main-25 text-neutral-700 fw-medium mb-24'>{placementRange}</div>
        ) : null}
        {courseId ? (
          <button
            type='button'
            onClick={(event) => handleExploreClick(courseId, event)}
            className='btn btn-main rounded-pill flex-align gap-8'
          >
            Explore Series
            <i className='ph-bold ph-arrow-up-right d-flex text-lg' />
          </button>
        ) : null}
      </div>
    );
  };

  return (
    <section className={sectionClassName}>
     
      <div className='container'>
        {hasHeroContent ? (
          <div className='row justify-content-center text-center'>
            <div className='col-xl-8 col-lg-9'>
              {tagIcon || tagText ? (
                <div className='d-inline-flex flex-align gap-8 px-24 py-8 rounded-pill bg-white text-main-600 text-md fw-medium'>
                  {tagIcon ? <i className={`${tagIcon} d-inline-flex text-lg`} /> : null}
                  {tagText}
                </div>
              ) : null}
              {title ? <h2 className={titleClassName}>{title}</h2> : null}
              {description ? <p className={descriptionClassName}>{description}</p> : null}
            </div>
          </div>
        ) : null}

        {safeCourses.length ? (
          <>
            <div className='our-courses-slider d-lg-none d-block mt-40 px-3'>
              <Slider {...sliderSettings}>
                {safeCourses.map((course) => {
                  const courseId = course.id || course.slug || course.name;
                  return (
                    <div key={`overview-slide-${courseId}`} className='px-2'>
                      {renderCard(course)}
                    </div>
                  );
                })}
              </Slider>
            </div>

            <div className='row gy-4 mt-40 d-none d-lg-flex'>
              {safeCourses.map((course) => {
                const courseId = course.id || course.slug || course.name;
                return (
                  <div className='col-lg-4 col-md-6' key={`overview-grid-${courseId}`}>
                    {renderCard(course)}
                  </div>
                );
              })}
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
};

export default CourseSeriesOverview;
