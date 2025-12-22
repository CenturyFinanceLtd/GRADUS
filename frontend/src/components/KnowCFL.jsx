import { Link } from "react-router-dom";

const serviceHighlights = [
  {
    icon: "ph-trend-up",
    title: "Equity Markets",
    description:
      "Seamless access to equity and derivative markets powered by intuitive, high-performance market platforms.",
  },
  {
    icon: "ph-brain",
    title: "Quantitative Computing-Based Analysis",
    description:
      "Advanced algorithms, AI, and data analytics converge to craft precision-led, scientific analysis strategies.",
  },
  {
    icon: "ph-shield-check",
    title: "Insurance Services",
    description:
      "Robust, customised protection blueprints that safeguard individuals, families, and enterprises alike.",
  },
  {
    icon: "ph-chart-pie",
    title: "Mutual Funds",
    description:
      "Balanced, diversified holdings that harmonise safety, liquidity, and growth for every financial aspiration.",
  },
  {
    icon: "ph-briefcase",
    title: "Assets Management Services (AMS)",
    description:
      "Exclusive, insight-driven wealth strategies curated for discerning investors seeking sustained excellence.",
  },
];

const socialInitiatives = [
  {
    icon: "ph-books",
    title: "Education",
    description:
      "Empowering underprivileged children with equitable access to progressive and purposeful learning.",
  },
  {
    icon: "ph-heartbeat",
    title: "Healthcare",
    description:
      "Delivering medical aid, awareness, and wellness outreach to communities that need it the most.",
  },
  {
    icon: "ph-hands-clapping",
    title: "Social Upliftment",
    description:
      "Cultivating dignity, inclusion, and sustainable development through grassroot initiatives across India.",
  },
];

const differentiators = [
  "52 Years of Excellence – An unbroken record of reliability and results.",
  "1.45 Million Customers – A vibrant community of investors who trust MDM MADHUBANI TECHNOLOGIES PRIVATE LIMITED.",
  "Innovation at Core – Among the first NBFCs to harness quantitative computing for market analysis.",
  "Holistic Financial Ecosystem – Comprehensive wealth and protection services under one roof.",
  "Strong Governance – Regulated by India's most respected financial institutions: RBI, SEBI, NSE, BSE, and CDSL.",
  "Social Stewardship – Meaningful contributions to society through Satyam Sri and ABSS Foundation.",
];

const KnowCFL = () => {
  return (
    <>
      <section className='know-cfl-hero py-120 position-relative z-1 overflow-hidden'>
        <img
          src='/assets/images/shapes/shape2.png'
          alt='Decorative gradient shape'
          className='position-absolute start-0 top-0 opacity-25'
        />
        <img
          src='/assets/images/shapes/shape6.png'
          alt='Decorative gradient shape'
          className='position-absolute end-0 bottom-0 opacity-25'
        />
        <div className='container position-relative'>
          <div className='row gy-5 align-items-center'>
            <div className='col-lg-6'>
              <div className='pe-xl-5'>
                <div className='flex-align gap-8 mb-16'>
                  <span className='w-8 h-8 bg-main-600 rounded-circle' />
                  <p className='mb-0 text-main-600 fw-semibold text-uppercase letter-spacing-2'>Know MDM MADHUBANI TECHNOLOGIES PRIVATE LIMITED</p>
                </div>
                <h2 className='mb-24 text-neutral-900'>MDM MADHUBANI TECHNOLOGIES PRIVATE LIMITED  — Where Legacy Meets Leadership</h2>
                <p className='text-neutral-500 mb-16'>
                  Since its inception in 1974, MDM MADHUBANI TECHNOLOGIES PRIVATE LIMITED  has remained synonymous with credibility, foresight,
                  and excellence in India's financial services ecosystem. As a licensed NBFC regulated by the Reserve Bank of India
                  and registered with the Ministry of Corporate Affairs, MDM MADHUBANI TECHNOLOGIES PRIVATE LIMITED blends integrity with innovation to empower
                  generations of investors.
                </p>
                <p className='text-neutral-500 mb-0'>
                  What began as a modest financial enterprise more than five decades ago has evolved into a pioneering institution
                  that has guided financial journeys for over 1.45 million clients. Our 52-year legacy is a living promise of trust,
                  consistency, and financial empowerment.
                </p>
              </div>
            </div>
            <div className='col-lg-6'>
              <div className='bg-main-two-50 border border-neutral-30 rounded-16 px-32 py-40 position-relative overflow-hidden'>
                <span className='position-absolute top-0 end-0 w-120 h-120 bg-main-200 rounded-circle opacity-25 translate-middle-y' />
                <div className='d-flex flex-column gap-24'>
                  <div>
                    <p className='text-sm text-main-600 fw-semibold mb-8 text-uppercase'>Legacy in Numbers</p>
                    <h3 className='mb-0 text-neutral-900'>A powerhouse of financial stewardship</h3>
                  </div>
                  <div className='row g-4'>
                    <div className='col-sm-4'>
                      <div className='rounded-12 bg-white px-20 py-24 text-center h-100 shadow-sm'>
                        <h3 className='text-main-600 mb-8'>52+</h3>
                        <p className='text-neutral-500 mb-0 text-sm'>Years of excellence</p>
                      </div>
                    </div>
                    <div className='col-sm-4'>
                      <div className='rounded-12 bg-white px-20 py-24 text-center h-100 shadow-sm'>
                        <h3 className='text-main-600 mb-8'>1.45M</h3>
                        <p className='text-neutral-500 mb-0 text-sm'>Clients empowered</p>
                      </div>
                    </div>
                    <div className='col-sm-4'>
                      <div className='rounded-12 bg-white px-20 py-24 text-center h-100 shadow-sm'>
                        <h3 className='text-main-600 mb-8'>1974</h3>
                        <p className='text-neutral-500 mb-0 text-sm'>Established</p>
                      </div>
                    </div>
                  </div>
                  <div className='bg-white rounded-12 px-24 py-20 d-flex flex-column flex-sm-row gap-16 align-items-start align-items-sm-center shadow-sm'>
                    <div className='flex-shrink-0 w-56 h-56 rounded-circle bg-main-600 text-white flex-center'>
                      <i className='ph ph-seal-check text-xl' />
                    </div>
                    <div>
                      <p className='text-neutral-500 mb-0'>
                        Licensed by RBI, registered with MCA/ROC, and operating with unwavering compliance under SEBI, CDSL, BSE,
                        and NSE.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className='py-120 bg-main-25 position-relative overflow-hidden'>
        <div className='container'>
          <div className='text-center mb-56 mx-auto col-xl-8'>
            <p className='text-main-600 fw-semibold text-uppercase letter-spacing-2 mb-12'>Our Service Offerings</p>
            <h2 className='mb-16 text-neutral-900'>Comprehensive, Innovative, Trusted</h2>
            <p className='text-neutral-500 mb-0'>
              MDM MADHUBANI TECHNOLOGIES PRIVATE LIMITED is a one-stop destination for a wide spectrum of financial solutions that balance future-ready innovation with
              steadfast governance. Discover the pillars that power our clients' success.
            </p>
          </div>
          <div className='row g-4'>
            {serviceHighlights.map((service) => (
              <div className='col-lg-4 col-md-6' key={service.title}>
                <div className='h-100 bg-white border border-neutral-30 rounded-16 px-32 py-32 transition-3 hover-border-main-600 shadow-sm'>
                  <span className='w-64 h-64 rounded-circle bg-main-50 text-main-600 flex-center text-2xl mb-24'>
                    <i className={`ph ${service.icon}`} />
                  </span>
                  <h4 className='mb-16 text-neutral-900'>{service.title}</h4>
                  <p className='text-neutral-500 mb-0'>{service.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className='py-120 position-relative z-1 overflow-hidden'>
        <div className='container'>
          <div className='row gy-5 align-items-start'>
            <div className='col-lg-6'>
              <div className='pe-xl-5'>
                <p className='text-main-600 fw-semibold text-uppercase letter-spacing-2 mb-12'>Our Social Footprint</p>
                <h2 className='mb-16 text-neutral-900'>Finance with a Heart</h2>
                <p className='text-neutral-500 mb-24'>
                  Growth holds meaning only when it enriches society. Through our in-house NGOs — Satyam Sri and ABSS Foundation —
                  we ignite purposeful change in communities nationwide.
                </p>
                <div className='d-flex flex-column gap-16'>
                  {socialInitiatives.map((item) => (
                    <div
                      className='d-flex gap-20 align-items-start bg-main-25 border border-neutral-30 rounded-16 px-28 py-24'
                      key={item.title}
                    >
                      <span className='w-56 h-56 rounded-circle bg-white text-main-600 flex-center text-2xl shadow-sm'>
                        <i className={`ph ${item.icon}`} />
                      </span>
                      <div>
                        <h5 className='mb-8 text-neutral-900'>{item.title}</h5>
                        <p className='text-neutral-500 mb-0'>{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className='col-lg-6'>
              <div className='bg-main-two-50 border border-neutral-30 rounded-16 px-32 py-40 h-100'>
                <p className='text-main-600 fw-semibold text-uppercase letter-spacing-2 mb-16'>Why MDM MADHUBANI TECHNOLOGIES PRIVATE LIMITED Stands Apart</p>
                <h3 className='mb-24 text-neutral-900'>A vision guided by purpose and precision</h3>
                <ul className='list-unstyled d-flex flex-column gap-16 mb-32'>
                  {differentiators.map((point) => (
                    <li className='d-flex gap-16 align-items-start text-neutral-500' key={point}>
                      <span className='w-32 h-32 rounded-circle bg-white text-main-600 flex-center mt-2 shadow-sm'>
                        <i className='ph ph-check-bold' />
                      </span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
                <div className='bg-white rounded-16 px-28 py-24 shadow-sm'>
                  <h4 className='mb-16 text-neutral-900'>Our Vision and Philosophy</h4>
                  <p className='text-neutral-500 mb-16'>
                    To remain at the forefront of financial innovation while safeguarding the trust, transparency, and
                    accountability that define us. MDM MADHUBANI TECHNOLOGIES PRIVATE LIMITED envisions finance as a catalyst for inclusive growth — empowering
                    individuals, businesses, and communities to prosper together.
                  </p>
                  <p className='text-main-600 fw-semibold mb-0'>
                    “We don’t just manage wealth — we nurture it, grow it, and align it with purpose.”
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className='py-100 bg-main-two-600 position-relative z-1 overflow-hidden'>
        <div className='container'>
          <div className='row justify-content-center text-center'>
            <div className='col-xl-8'>
              <h2 className='text-white mb-16'>A Message of Assurance</h2>
              <p className='text-white-75 mb-32'>
                MDM MADHUBANI TECHNOLOGIES PRIVATE LIMITED is a trusted partner for generations of investors, a trailblazer in modern finance, and a
                torchbearer of social responsibility. With every service rendered and every life touched, we reaffirm our promise
                to protect, grow, and empower — today, tomorrow, and for every century to come.
              </p>
              <Link
                to='/contact'
                className='btn btn-main text-white px-32 py-16 rounded-pill fw-semibold hover-bg-white hover-text-main-600'
              >
                Connect with Us
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default KnowCFL;
