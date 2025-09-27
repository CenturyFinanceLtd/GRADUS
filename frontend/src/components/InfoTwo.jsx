const InfoTwo = () => {
  return (
    <section className='info-two half-bg'>
      <div className='container'>
        <div className='bg-white box-shadow-md rounded-16 p-16'>
          <div className='row gy-4 justify-content-center'>
            <div
              className='col-xl-4 col-sm-6'
              data-aos='fade-up'
              data-aos-duration={400}
            >
              <div className='info-two-item flex-align animation-item h-100 gap-28 border border-neutral-30 rounded-12 bg-main-25'>
                <span className='flex-shrink-0'>
                  <img
                    src='/assets/images/icons/info-two-icon1.png'
                    className='animate__heartBeat'
                    alt='Placement support icon'
                  />
                </span>
                <div>
                  <h4 className='mb-12'>Placement Track</h4>
                  <p className='text-neutral-700 mb-0'>Dedicated placement cell with interview mentoring, hiring drives, and employer partnerships to secure your first role.</p>
                </div>
              </div>
            </div>
            <div
              className='col-xl-4 col-sm-6'
              data-aos='fade-up'
              data-aos-duration={600}
            >
              <div className='info-two-item flex-align animation-item h-100 gap-28 border border-neutral-30 rounded-12 bg-main-two-25'>
                <span className='flex-shrink-0'>
                  <img
                    src='/assets/images/icons/info-two-icon2.png'
                    className='animate__heartBeat'
                    alt='Certified courses icon'
                  />
                </span>
                <div>
                  <h4 className='mb-12'>Certified Mentors</h4>
                  <p className='text-neutral-700 mb-0'>Earn industry-recognised credentials from SEBI-certified mentors with rigorous assessments and project-based evaluations.</p>
                </div>
              </div>
            </div>
            <div
              className='col-xl-4 col-sm-6'
              data-aos='fade-up'
              data-aos-duration={800}
            >
              <div className='info-two-item flex-align animation-item h-100 gap-28 border border-neutral-30 rounded-12 bg-main-three-25'>
                <span className='flex-shrink-0'>
                  <img
                    src='/assets/images/icons/info-two-icon3.png'
                    className='animate__heartBeat'
                    alt='Skills development icon'
                  />
                </span>
                <div>
                  <h4 className='mb-12'>Ready Skills</h4>
                  <p className='text-neutral-700 mb-0'>Hands-on trading simulations, soft-skill mastery, and portfolio storytelling so you walk into interviews with confidence.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default InfoTwo;