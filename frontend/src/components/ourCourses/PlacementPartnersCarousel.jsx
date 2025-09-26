import Slider from 'react-slick';

const PlacementPartnersCarousel = ({ partners = [], carouselId }) => {
  if (!partners.length) {
    return null;
  }

  const sliderSettings = {
    dots: false,
    infinite: true,
    autoplay: true,
    autoplaySpeed: 2600,
    speed: 600,
    pauseOnHover: true,
    slidesToShow: Math.min(6, partners.length),
    slidesToScroll: 1,
    arrows: false,
    responsive: [
      {
        breakpoint: 1400,
        settings: { slidesToShow: Math.min(5, partners.length) },
      },
      {
        breakpoint: 1200,
        settings: { slidesToShow: Math.min(4, partners.length) },
      },
      {
        breakpoint: 992,
        settings: { slidesToShow: Math.min(3, partners.length) },
      },
      {
        breakpoint: 768,
        settings: { slidesToShow: Math.min(2, partners.length) },
      },
      {
        breakpoint: 480,
        settings: { slidesToShow: 1 },
      },
    ],
  };

  return (
    <div className='our-courses-partners mt-32'>
      <div className='our-courses-partners__slider' id={carouselId}>
        <Slider {...sliderSettings}>
          {partners.map((partner, index) => (
            <div className='our-courses-partner-card-wrapper px-2' key={`${carouselId}-partner-${index}`}>
              <div className='our-courses-partner-card'>
                <span className='our-courses-partner-card__index'>
                  {(index + 1).toString().padStart(2, '0')}
                </span>
                <span className='our-courses-partner-card__name'>{partner}</span>
              </div>
            </div>
          ))}
        </Slider>
      </div>
    </div>
  );
};

export default PlacementPartnersCarousel;
