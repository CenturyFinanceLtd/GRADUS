import Slider from "react-slick";

const BannerOne = () => {
  // Use five distinct banner images from public/assets/images/bg
  const images = [
    "/assets/images/bg/banner_1.png",
    "/assets/images/bg/banner_2.png",
    "/assets/images/bg/banner_3.png",
    "/assets/images/bg/banner_4.png",
    "/assets/images/bg/banner_5.png",
  ];
  const settings = {
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3500,
    speed: 600,
    arrows: false,
    dots: true,
    pauseOnHover: true,
    infinite: true,
  };

  return (
    <section className='banner banner--rounded banner--gutters position-relative overflow-hidden'>
      <Slider {...settings} className='only-image-slider'>
        {images.map((src, i) => (
          <div key={i} className='banner-image-slide'>
            <img src={src} alt='' className='banner-img-only' />
          </div>
        ))}
      </Slider>
    </section>
  );
};

export default BannerOne;
