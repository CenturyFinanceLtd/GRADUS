import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Slider from 'react-slick';
import PlacementPartnersCarousel from './PlacementPartnersCarousel';

const VISIBLE_WEEKS = 2;

const CourseSeriesDetailSection = ({ course, isAltBackground = false }) => {
  const activeCourse = course && course.name ? course : null;

  const courseId = activeCourse?.id || activeCourse?.slug || activeCourse?._id || '';
  const subtitle = activeCourse?.subtitle;
  const focus = activeCourse?.focus;
  const approvals = useMemo(
    () => (Array.isArray(activeCourse?.approvals) ? activeCourse.approvals.filter(Boolean) : []),
    [activeCourse?.approvals]
  );
  const placementRange = activeCourse?.placementRange;
  const price = activeCourse?.price;
  const outcomeSummary = activeCourse?.outcomeSummary;
  const deliverables = useMemo(
    () => (Array.isArray(activeCourse?.deliverables) ? activeCourse.deliverables.filter(Boolean) : []),
    [activeCourse?.deliverables]
  );
  const outcomes = useMemo(
    () => (Array.isArray(activeCourse?.outcomes) ? activeCourse.outcomes.filter(Boolean) : []),
    [activeCourse?.outcomes]
  );
  const certifications = useMemo(
    () => (Array.isArray(activeCourse?.certifications) ? activeCourse.certifications : []),
    [activeCourse?.certifications]
  );
  const partners = useMemo(
    () => (Array.isArray(activeCourse?.partners) ? activeCourse.partners.filter(Boolean) : []),
    [activeCourse?.partners]
  );
  const weeks = useMemo(
    () =>
      Array.isArray(activeCourse?.weeks)
        ? activeCourse.weeks
            .map((week) => ({
              title: week?.title,
              points: Array.isArray(week?.points) ? week.points.filter(Boolean) : [],
            }))
            .filter((week) => week.title || week.points.length)
        : [],
    [activeCourse?.weeks]
  );

  const sectionClass = `py-120 ${isAltBackground ? "bg-main-25" : "bg-white"} position-relative z-1`;
  const [showAllWeeks, setShowAllWeeks] = useState(false);
  const weekCardRefs = useRef([]);
  const [collapsedHeight, setCollapsedHeight] = useState(null);

  const certificationCount = certifications.length;
  const mobileCertificationSettings = {
    dots: certificationCount > 1,
    arrows: false,
    infinite: certificationCount > 1,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    adaptiveHeight: true,
  };

  const hasOverflowWeeks = weeks.length > VISIBLE_WEEKS;

  const measureCollapsedHeight = useCallback(() => {
    if (!hasOverflowWeeks) {
      setCollapsedHeight(null);
      return;
    }
    const nodes = weekCardRefs.current.slice(0, VISIBLE_WEEKS).filter(Boolean);
    if (!nodes.length) {
      return;
    }
    const gapBetweenCards = 24;
    const totalHeight = nodes.reduce((sum, node) => sum + node.offsetHeight, 0);
    const totalGap = gapBetweenCards * Math.max(0, nodes.length - 1);
    setCollapsedHeight(totalHeight + totalGap + 36);
  }, [hasOverflowWeeks]);

  useEffect(() => {
    measureCollapsedHeight();
  }, [measureCollapsedHeight, courseId, weeks.length]);

  useEffect(() => {
    const handleResize = () => {
      measureCollapsedHeight();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [measureCollapsedHeight]);

  useEffect(() => {
    setShowAllWeeks(false);
  }, [courseId]);

  useEffect(() => {
    if (!showAllWeeks) {
      measureCollapsedHeight();
    }
  }, [showAllWeeks, measureCollapsedHeight]);

  weekCardRefs.current.length = weeks.length;

  if (!activeCourse) {
    return null;
  }

  const renderCertificationCard = (cert, certIndex) => (
    <div className='our-courses-cert-card h-100'>
      <span className='d-inline-flex flex-center gap-8 px-16 py-6 rounded-pill bg-main-600 text-white text-md mb-12'>
        {cert.level}
      </span>
      <h5 className='text-neutral-900 mb-12'>{cert.certificateName}</h5>
      <ul className='list-unstyled d-grid gap-10 mb-16'>
        {cert.coverage.map((item, coverageIndex) => (
          <li
            className='d-flex align-items-start gap-10 text-neutral-600'
            key={`course-${courseId}-cert-${certIndex}-coverage-${coverageIndex}`}
          >
            <i className='ph-bold ph-check-circle text-main-500 mt-1 d-inline-flex' />
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <p className='text-neutral-600 mb-0'>
        <span className='fw-semibold text-neutral-800'>Outcome:</span> {cert.outcome}
      </p>
    </div>
  );

  return (
    <section id={courseId} className={sectionClass}>
      <div className='container'>
        <div className='row gy-5 align-items-start'>
          <div className='col-lg-4'>
            <div className='pe-xl-5'>
              {subtitle ? (
                <span className='text-main-600 text-md fw-semibold d-inline-block mb-8'>
                  {subtitle}
                </span>
              ) : null}
              <h2 className='mb-16 text-neutral-900'>{activeCourse.name} Learning Journey</h2>
              {focus ? <p className='text-neutral-500 mb-24'>{focus}</p> : null}
              {approvals.length ? (
                <div className='mb-24'>
                  <h6 className='text-neutral-800 text-lg fw-semibold mb-12'>Credibility and Promise</h6>
                  <ul className='list-unstyled d-grid gap-12 mb-0'>
                    {approvals.map((item, approvalIndex) => (
                      <li
                        className='d-flex align-items-start gap-12 text-neutral-600'
                        key={`course-${courseId}-approval-${approvalIndex}`}
                      >
                        <i className='ph-bold ph-shield-check text-main-600 mt-2 d-inline-flex' />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {placementRange ? (
                <div className='p-24 rounded-20 bg-main-25 border border-main-100 mb-24'>
                  <h6 className='text-neutral-800 text-lg fw-semibold mb-8'>Guaranteed Placement Pathway</h6>
                  <p className='text-neutral-600 mb-0'>{placementRange}</p>
                </div>
              ) : null}
              {outcomeSummary ? (
                <div className='p-24 rounded-20 bg-white border border-neutral-30'>
                  <h6 className='text-neutral-800 text-lg fw-semibold mb-8'>Outcome Snapshot</h6>
                  <p className='text-neutral-600 mb-0'>{outcomeSummary}</p>
                </div>
              ) : null}
              <div className='mt-24'>
                {price ? (
                  <div className='p-24 rounded-20 bg-main-600 text-white mb-16'>
                    <h6 className='text-lg fw-semibold mb-8'>Program Fee</h6>
                    <p className='mb-0 text-md'>
                      <span className='fw-bold text-xl d-block'>{price}</span>
                      Invest in your future with our industry-aligned curriculum.
                    </p>
                  </div>
                ) : null}
                <Link to='/contact' className='btn btn-main rounded-pill flex-align gap-8'>
                  Enroll Now
                  <i className='ph-bold ph-arrow-up-right d-flex text-lg' />
                </Link>
              </div>
            </div>
          </div>
          <div className='col-lg-8'>
            {weeks.length ? (
              <div className='rounded-24 bg-white border border-neutral-30 p-32 box-shadow-md'>
                <div className='flex-align gap-12 flex-wrap'>
                  <h3 className='mb-0 text-neutral-900'>12-Week Immersive Curriculum</h3>
                  <span className='d-inline-flex flex-center gap-8 px-16 py-6 rounded-pill bg-main-600 text-white text-md'>
                    Projects and Case Studies
                  </span>
                </div>
                <div
                  id={`${courseId}-week-list`}
                  className={`our-courses-week-cards d-grid gap-24 mt-32 ${
                    showAllWeeks ? 'our-courses-week-cards--expanded' : 'our-courses-week-cards--collapsed'
                  } ${hasOverflowWeeks ? 'our-courses-week-cards--interactive' : ''}`}
                  style={!showAllWeeks && collapsedHeight ? { maxHeight: `${collapsedHeight}px` } : undefined}
                >
                  {weeks.map((week, weekIndex) => {
                    const isOverflow = hasOverflowWeeks && weekIndex >= VISIBLE_WEEKS;
                    const overflowClasses = isOverflow
                      ? 'our-courses-week-card--overflow'
                      : 'our-courses-week-card--base';

                    return (
                      <div
                        ref={(el) => {
                          weekCardRefs.current[weekIndex] = el;
                        }}
                        className={`our-courses-week-card p-24 rounded-20 ${overflowClasses}`}
                        style={isOverflow ? { '--stack-index': `${Math.max(1, weekIndex - VISIBLE_WEEKS + 1)}` } : undefined}
                        key={`course-${courseId}-week-${weekIndex}`}
                      >
                        <div className='d-flex align-items-start gap-16'>
                          <span className='flex-shrink-0 w-52 h-52 rounded-16 bg-main-600 text-white flex-center text-lg fw-semibold'>
                            {weekIndex + 1 < 10 ? `0${weekIndex + 1}` : weekIndex + 1}
                          </span>
                          <div>
                            <h5 className='mb-12 text-neutral-900'>{week.title}</h5>
                            {week.points.length ? (
                              <ul className='list-unstyled d-grid gap-10 mb-0'>
                                {week.points.map((point, pointIndex) => (
                                  <li
                                    className='d-flex align-items-start gap-10 text-neutral-600'
                                    key={`course-${courseId}-week-${weekIndex}-point-${pointIndex}`}
                                  >
                                    <i className='ph-bold ph-circle-wavy-check text-main-500 mt-1 d-inline-flex' />
                                    <span>{point}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {hasOverflowWeeks ? (
                  <div className='text-center mt-28'>
                    <button
                      type='button'
                      className='our-courses-week-toggle rounded-pill fw-semibold text-md d-inline-flex align-items-center gap-8'
                      onClick={() => setShowAllWeeks((prev) => !prev)}
                      aria-expanded={showAllWeeks}
                      aria-controls={`${courseId}-week-list`}
                    >
                      {showAllWeeks ? 'View Less Weeks' : `View All ${weeks.length} Weeks`}
                      <i className={`ph-bold ${showAllWeeks ? 'ph-arrow-up-right' : 'ph-arrow-down'} d-inline-flex`} />
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
        <div className='mt-40'>
          {deliverables.length ? (
            <div className='rounded-24 border border-neutral-30 p-32 bg-white mb-32'>
              <h4 className='text-neutral-900 mb-20'>Student Deliverables</h4>
              <ul className='list-unstyled d-grid gap-12 mb-0'>
                {deliverables.map((item, itemIndex) => (
                  <li
                    className='d-flex align-items-start gap-12 text-neutral-600'
                    key={`course-${courseId}-deliverable-${itemIndex}`}
                  >
                    <i className='ph-bold ph-gift text-main-500 mt-2 d-inline-flex' />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {outcomes.length ? (
            <div className='rounded-24 border border-neutral-30 p-32 bg-main-25 mb-32'>
              <h4 className='text-neutral-900 mb-20'>Graduate Outcomes</h4>
              <ul className='list-unstyled d-grid gap-12 mb-0'>
                {outcomes.map((item, outcomeIndex) => (
                  <li
                    className='d-flex align-items-start gap-12 text-neutral-600'
                    key={`course-${courseId}-outcome-${outcomeIndex}`}
                  >
                    <i className='ph-bold ph-target text-main-500 mt-2 d-inline-flex' />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {certifications.length ? (
            <div className='rounded-24 border border-neutral-30 p-32 bg-white mb-32'>
              <div className='d-flex flex-wrap justify-content-between align-items-start gap-16 mb-16'>
                <h4 className='text-neutral-900 mb-0'>Certification Framework</h4>
                <span className='text-neutral-500 text-md'>
                  Layered credentials that build momentum every four weeks
                </span>
              </div>
              <div className='row gy-4 d-none d-lg-flex'>
                {certifications.map((cert, certIndex) => (
                  <div className='col-xl-4 col-md-6' key={`course-${courseId}-cert-${certIndex}`}>
                    {renderCertificationCard(cert, certIndex)}
                  </div>
                ))}
              </div>
              <div className='d-lg-none'>
                <Slider {...mobileCertificationSettings} className='our-courses-cert-slider'>
                  {certifications.map((cert, certIndex) => (
                    <div className='px-1' key={`course-${courseId}-cert-slide-${certIndex}`}>
                      {renderCertificationCard(cert, certIndex)}
                    </div>
                  ))}
                </Slider>
              </div>
            </div>
          ) : null}

          {activeCourse.finalAward ? (
            <div className='rounded-24 border border-main-100 bg-main-600 p-32 text-white mb-32'>
              <h4 className='mb-12'>Final Award</h4>
              <p className='mb-0'>{activeCourse.finalAward}</p>
            </div>
          ) : null}

          {partners.length ? (
            <div className='rounded-24 border border-neutral-30 p-32 bg-white'>
              <div className='d-flex flex-wrap justify-content-between align-items-start gap-16 mb-24'>
                <h4 className='text-neutral-900 mb-0'>Placement Partners</h4>
                <span className='text-neutral-500 text-md'>
                  Guaranteed access to {partners.length} leading organizations
                </span>
              </div>
              <PlacementPartnersCarousel partners={partners} carouselId={`${courseId}-partners`} />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
};

export default CourseSeriesDetailSection;
