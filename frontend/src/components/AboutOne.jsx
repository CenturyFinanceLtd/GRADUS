import { useEffect, useRef, useState } from "react";
import CountUp from "react-countup";
import { useInView } from "react-intersection-observer";
import { Link } from "react-router-dom";

const AnimatedSpoiler = ({ isExpanded, children }) => {
  const innerRef = useRef(null);
  const [contentHeight, setContentHeight] = useState(0);

  useEffect(() => {
    if (innerRef.current) {
      setContentHeight(innerRef.current.scrollHeight);
    }
  }, [children, isExpanded]);

  return (
    <div
      style={{
        maxHeight: isExpanded ? contentHeight : 0,
        opacity: isExpanded ? 1 : 0,
        overflow: "hidden",
        transition: "max-height 0.45s ease, opacity 0.3s ease",
      }}
      aria-hidden={!isExpanded}
    >
      <div ref={innerRef}>{children}</div>
    </div>
  );
};

const AboutOne = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });
  return (
    <section className='about py-64 position-relative z-1 mash-bg-main mash-bg-main-two'>
      <img
        src='/assets/images/shapes/shape2.png'
        alt=''
        className='shape one animation-scalation'
      />
      <img
        src='/assets/images/shapes/shape6.png'
        alt=''
        className='shape four animation-scalation'
      />
      <div className='position-relative'>
        <div className='container'>
          <div className='row gy-xl-0 gy-5 flex-wrap-reverse align-items-center'>
            <div className='col-xl-6'>
              <div className='about-thumbs position-relative pe-lg-5'>
                <img
                  src='/assets/images/shapes/shape7.png'
                  alt=''
                  className='shape seven animation-scalation'
                />
                <div className='offer-message px-24 py-12 rounded-12 bg-main-two-50 fw-medium flex-align d-inline-flex gap-16 border border-neutral-30 animation-upDown'>
                  <span className='flex-shrink-0 w-48 h-48 bg-main-two-600 text-white text-2xl flex-center rounded-circle'>
                    <i className='ph ph-watch' />
                  </span>
                  <div>
                    <h6 className='mb-4'>20% OFF</h6>
                    <span className='text-neutral-500'>For All Courses</span>
                  </div>
                </div>
                <div className='row gy-4'>
                  <div className='col-sm-6'>
                    <img
                      src='/assets/images/thumbs/about-img1.png'
                      alt=''
                      className='rounded-12 w-100'
                      data-tilt=''
                      data-tilt-max={15}
                      data-tilt-speed={500}
                      data-tilt-perspective={5000}
                      data-tilt-full-page-listening=''
                    />
                  </div>
                  <div className='col-sm-6'>
                    <div className='flex-align gap-24 mb-24'>
                      <div
                        className='bg-main-600 rounded-12 text-center py-24 px-2 w-50-percent'
                        data-aos='fade-right'
                      >
                        <div ref={ref}>
                          {inView && (
                            <h1 className='mb-0 text-white counter'>
                              <CountUp end={16} />K
                            </h1>
                          )}
                        </div>
                        <span className='text-white'>Years of experience</span>
                      </div>
                      <div
                        className='bg-neutral-700 rounded-12 text-center py-24 px-2 w-50-percent'
                        data-aos='fade-left'
                      >
                        <div ref={ref}>
                          {inView && (
                            <h1 className='mb-0 text-white counter'>
                              <CountUp end={3} />K
                            </h1>
                          )}
                        </div>
                        <span className='text-white'>Years of experience</span>
                      </div>
                    </div>
                    <img
                      src='/assets/images/thumbs/about-img2.png'
                      alt=''
                      className='rounded-12 w-100'
                      data-tilt=''
                      data-tilt-max={20}
                      data-tilt-speed={500}
                      data-tilt-perspective={5000}
                      data-tilt-full-page-listening=''
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className='col-xl-6'>
              <div className='about-content'>
                <div className='mb-40'>
                  <div className='flex-align gap-8 mb-16 wow bounceInDown'>
                    <span className='w-8 h-8 bg-main-600 rounded-circle' />
                    <h5 className='text-main-600 mb-0 '>Know About Gradus</h5>
                  </div>
                  <h2 className='mb-24 wow bounceIn'>
                    Forging a Decisive Bridge Between Education and Industry
                  </h2>
                  <div className='wow bounceInUp'>
                    <p className='text-neutral-500 mb-16'>
                      Gradus, an ambitious initiative of
                      {" "}
                      <Link
                        to='/know-CFL'
                        className='text-main-600 fw-semibold hover-text-decoration-underline'
                      >
                        MDM MADHUBANI TECHNOLOGIES PRIVATE LIMITED
                      </Link>
                      , is conceived as a premier career accelerator that forges a decisive link between academic instruction and professional ascendancy. Every pathway is meticulously curated for management aspirants, engineering graduates, and finance enthusiasts, transforming theoretical acumen into demonstrable competence.
                    </p>
                    <AnimatedSpoiler isExpanded={isExpanded}>
                      <p className='text-neutral-500 mb-16'>
                        The Gradus paradigm is architected with a dual advantage: an immersive two-month remunerated internship, affording unmediated exposure to real-world complexities, and an assured placement trajectory with some of the nation's most prestigious organizations. This construct ensures that theoretical acumen is invariably transfigured into demonstrable competence.
                      </p>
                      <p className='text-neutral-500 mb-16'>
                        We operate on the conviction that careers are neither sustained by theory nor advanced by rote learning. They are instead fortified by practical immersion, empirical learning, and critical mentorship. Hence, every Gradus module is suffused with live projects, experiential tasks, and incisive guidance from erudite industry experts, professionals rigorously selected for their pedagogical depth and experiential authority.
                      </p>
                      <p className='text-neutral-500 mb-0'>
                        Endowed with the institutional credibility of MDM MADHUBANI TECHNOLOGIES PRIVATE LIMITED, Gradus is not merely an educational initiative but a transformative crucible wherein ambition is refined into expertise, and potential is inexorably elevated into accomplishment. For those who dare to aspire, Gradus does not merely offer training; it architects a definitive passage to professional eminence.
                      </p>
                    </AnimatedSpoiler>
                  </div>
                </div>
                <div
                  className='flex-align align-items-start gap-28 mb-32'
                  data-aos='fade-left'
                  data-aos-duration={200}
                >
                  <span className='w-80 h-80 bg-main-25 border border-neutral-30 flex-center rounded-circle flex-shrink-0'>
                    <img src='/assets/images/icons/about-img1.png' alt='' />
                  </span>
                  <div className='flex-grow-1'>
                    <h4 className='text-neutral-500 mb-12'>Our Mission</h4>
                    <div className='text-neutral-500'>
                      <p className='mb-16'>
                        At Gradus, our mission is to redefine the way careers are built by creating a seamless bridge between education and industry. We are committed to transforming ambitious learners into highly skilled professionals through rigorous, outcome-driven training programs that are meticulously aligned with the evolving demands of the corporate world.
                      </p>
                      <AnimatedSpoiler isExpanded={isExpanded}>
                        <p className='mb-16'>
                          Backed by strategic partnerships with 178 leading companies across India, every module, session, and experiential learning component at Gradus is designed in direct correlation with the skills, competencies, and behavioral attributes sought by employers. This ensures that our learners are not merely job-ready but industry-ready, equipped to excel, adapt, and lead in dynamic environments.
                        </p>
                        <p className='mb-0'>
                          Our training ecosystem is powered by excellence, driven by a distinguished faculty of trainers carefully handpicked through a stringent selection process. These mentors, with proven expertise in finance, management, engineering, and the financial markets, impart not only technical knowledge but also cultivate problem-solving abilities, critical thinking, and professional resilience.
                        </p>
                      </AnimatedSpoiler>
                    </div>
                  </div>
                </div>
                <div
                  className='flex-align align-items-start gap-28 mb-0'
                  data-aos='fade-left'
                  data-aos-duration={400}
                >
                  <span className='w-80 h-80 bg-main-25 border border-neutral-30 flex-center rounded-circle flex-shrink-0'>
                    <img src='/assets/images/icons/about-img2.png' alt='' />
                  </span>
                  <div className='flex-grow-1'>
                    <h4 className='text-neutral-500 mb-12'>Our Vision</h4>
                    <div className='text-neutral-500'>
                      <p className='mb-16'>
                        Gradus goes beyond conventional learning by integrating paid internships and assured placements into its framework, offering learners a pathway that is both experiential and assured. By merging academic rigor with practical exposure, we empower our students to evolve into professionals who are confident, competent, and committed to making meaningful contributions in their chosen fields.
                      </p>
                      <AnimatedSpoiler isExpanded={isExpanded}>
                        <p className='mb-0'>
                          Ultimately, our mission is to shape futures with certainty, to stand as a catalyst for career success, to democratize access to high-quality training and placement opportunities, and to establish Gradus as the most trusted platform where education transforms seamlessly into employment.
                        </p>
                      </AnimatedSpoiler>
                    </div>
                  </div>
                </div>
                <div
                  className='flex-align flex-wrap gap-32 pt-40 border-top border-neutral-50 mt-40 border-dashed border-0'
                  data-aos='fade-left'
                  data-aos-duration={600}
                >
                  <button
                    type='button'
                    className='btn btn-main rounded-pill flex-align d-inline-flex gap-8'
                    onClick={() => setIsExpanded((prev) => !prev)}
                    aria-expanded={isExpanded}
                  >
                    {isExpanded ? "Read Less" : "Know More"}
                    <i className='ph-bold ph-arrow-up-right d-flex text-lg' />
                  </button>
                  {/* <div className='flex-align gap-20'>
                    <img
                      src='/assets/images/thumbs/ceo-img.png'
                      alt=''
                      className='w-52 h-52 rounded-circle object-fit-cover flex-shrink-0'
                    />
                    <div className='flex-grow-1'>
                      <span className='mb-4'>
                        <img src='/assets/images/thumbs/signature.png' alt='' />
                      </span>
                      <span className='text-sm d-block'>CEO Of Company</span>
                    </div>
                  </div> */}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutOne;
