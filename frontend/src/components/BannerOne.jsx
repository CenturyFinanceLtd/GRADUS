import Slider from "react-slick";

const BannerOne = () => {
  const images = new Array(5).fill("/assets/images/bg/banner%20top.png");
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
    <section className='banner banner--rounded position-relative overflow-hidden'>
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
