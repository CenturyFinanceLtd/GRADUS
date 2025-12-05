import Slider from "react-slick";

const BrandOne = () => {
  const logos = [
    "/assets/images/thumbs/brand-img1.png",
    "/assets/images/thumbs/brand-img2.png",
    "/assets/images/thumbs/brand-img3.png",
    "/assets/images/thumbs/brand-img4.png",
    "/assets/images/thumbs/brand-img5.png",
    "/assets/images/thumbs/brand-img6.png",
    "/assets/images/thumbs/brand-img7.png",
    "/assets/images/thumbs/brand-img3.png",
  ];

  const loopLogos = [...logos, ...logos, ...logos]; // duplicate to avoid gaps when looping

  const settings = {
    slidesToShow: 7,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 0,
    speed: 9000,
    cssEase: "linear",
    dots: false,
    pauseOnHover: false,
    pauseOnFocus: false,
    arrows: false,
    infinite: true,
    responsive: [
      {
        breakpoint: 1399,
        settings: { slidesToShow: 6, arrows: false },
      },
      {
        breakpoint: 992,
        settings: { slidesToShow: 5, arrows: false },
      },
      {
        breakpoint: 767,
        settings: { slidesToShow: 4, arrows: false },
      },
      {
        breakpoint: 424,
        settings: { slidesToShow: 2, arrows: false },
      },
      {
        breakpoint: 359,
        settings: { slidesToShow: 2, arrows: false },
      },
    ],
  };
  return (
    <div
      className='brand wow fadeInUpBig'
      data-wow-duration='1s'
      data-wow-delay='.5s'
    >
      <div className='container container--lg'>
        <Slider {...settings} className='brand-slider brand-slider--marquee'>
          {loopLogos.map((src, idx) => (
            <div className='brand-slider__item px-24' key={`brand-one-${idx}`}>
              <img src={src} alt='' />
            </div>
          ))}
        </Slider>
      </div>
    </div>
  );
};

export default BrandOne;
