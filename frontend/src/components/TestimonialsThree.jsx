import { useRef } from "react";
import Slider from "react-slick";

const testimonials = [
  {
    id: "aditi-sharma",
    name: "Aditi Sharma",
    role: "GradusQuity Scholar",
    // avatar: "/assets/images/thumbs/testimonials-three-img2.png",
    quote:
      "GradusQuity turned macroeconomics into boardroom-ready conversations. The market labs and mentor reviews helped me ace the research analyst interview at HDFC Securities within weeks of the placement drive.",
  },
  {
    id: "rahul-mehta",
    name: "Rahul Mehta",
    role: "GradusX Learner",
    // avatar: "/assets/images/thumbs/testimonials-three-img1.png",
    quote:
      "From Python to product analytics, GradusX stitched every module around live startup problems. I now lead growth experiments at a Bengaluru fintech and still lean on the alumni forum for feedback.",
  },
  {
    id: "neha-iyer",
    name: "Neha Iyer",
    role: "GradusLead Fellow",
    // avatar: "/assets/images/thumbs/testimonials-three-img3.png",
    quote:
      "The GradusLead journey paired leadership coaching with hands-on consulting sprints. My capstone with MDM MADHUBANI TECHNOLOGIES PRIVATE LIMITED sharpened my strategy toolkit and resulted in a management trainee offer.",
  },
  {
    id: "sanjay-patel",
    name: "Sanjay Patel",
    role: "Parent of GradusQuity Alum",
    // avatar: "/assets/images/thumbs/testimonials-three-img3.png",
    quote:
      "Watching my daughter transform into a confident financial advisor has been incredible. Gradus India's faculty ensured she mastered markets and communication before stepping into Kotak's market analysis role.",
  },
];

const TestimonialsThree = () => {
  const sliderRef = useRef(null);
  const settings = {
    slidesToShow: 3,
    slidesToScroll: 1,
    autoplay: false,
    autoplaySpeed: 2000,
    speed: 900,
    dots: false,
    pauseOnHover: true,
    arrows: false,
    draggable: false,
    infinite: true,
    centerMode: true,
    centerPadding: "0px",

    responsive: [
      {
        breakpoint: 767,
        settings: {
          slidesToShow: 2,
          arrows: false,
        },
      },
      {
        breakpoint: 575,
        settings: {
          slidesToShow: 1,
          arrows: false,
        },
      },
    ],
  };
  return (
    <section className='testimonials-three py-64 bg-main-25 position-relative z-1 overflow-hidden'>
      <img
        src='/assets/images/shapes/shape2.png'
        alt=''
        className='shape two animation-scalation'
      />
      <img
        src='/assets/images/shapes/shape6.png'
        alt=''
        className='shape four animation-scalation'
      />
      <img
        src='/assets/images/shapes/shape4.png'
        alt=''
        className='shape one animation-scalation'
      />
      <div className='container'>
        <div className='row gy-4 align-items-center flex-wrap-reverse'>
          <div className='col-xl-7'>
            <Slider ref={sliderRef} {...settings} className='testimonials-three-slider'>
              {testimonials.map((testimonial) => (
                <div
                  key={testimonial.id}
                  className='testimonials-three-item bg-white p-24 rounded-12 box-shadow-md'
                >

                  <p className='text-neutral-500 my-24'>{testimonial.quote}</p>
                  <ul className='flex-align gap-8 mb-16'>
                    <li className='text-warning-600 text-xl d-flex'>
                      <i className='ph-fill ph-star' />
                    </li>
                    <li className='text-warning-600 text-xl d-flex'>
                      <i className='ph-fill ph-star' />
                    </li>
                    <li className='text-warning-600 text-xl d-flex'>
                      <i className='ph-fill ph-star' />
                    </li>
                    <li className='text-warning-600 text-xl d-flex'>
                      <i className='ph-fill ph-star' />
                    </li>
                    <li className='text-warning-600 text-xl d-flex'>
                      <i className='ph-fill ph-star-half' />
                    </li>
                  </ul>
                  <h4 className='mb-16 text-lg'>{testimonial.name}</h4>
                  <span className='text-neutral-500'>{testimonial.role}</span>
                </div>
              ))}
            </Slider>
          </div>
          <div className='col-xl-5 ps-xl-5'>
            <div className='flex-align d-inline-flex gap-8 mb-16 wow bounceInDown'>
              <span className='text-main-600 text-2xl d-flex'>
                <i className='ph-bold ph-book-open' />
              </span>
              <h5 className='text-main-600 mb-0'>Testimonials</h5>
            </div>
            <h2 className='mb-24 wow bounceInRight'>What Our Community Says</h2>
            <p className='text-neutral-500 text-line-4 wow bounceInUp'>
              Hear from learners, alumni, and families who trusted Gradus India
              to accelerate careers through GradusQuity, GradusX, and
              GradusLead. Every story reflects our promise of mentor-led
              learning, national placements, and lifelong community support.
            </p>
            <div className='flex-align gap-16 mt-40'>
              <button
                type='button'
                onClick={() => sliderRef.current.slickPrev()}
                className='testimonials-three-arrow flex-center text-main-600 hover-text-white hover-bg-main-600 border border-main-600 rounded-circle w-48 h-48 transition-1'
              >
                <i className='ph-bold ph-arrow-left' />
              </button>
              <button
                type='button'
                onClick={() => sliderRef.current.slickNext()}
                className='testimonials-three-arrow flex-center text-main-600 hover-text-white hover-bg-main-600 border border-main-600 rounded-circle w-48 h-48 transition-1'
              >
                <i className='ph-bold ph-arrow-right' />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsThree;
