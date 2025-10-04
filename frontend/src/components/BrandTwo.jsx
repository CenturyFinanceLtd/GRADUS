import Slider from "react-slick";
import partners from "@shared/placementPartners.json";

const bankingPartners = partners
  .map(({ name, website, logo }) => ({
    name,
    href: website,
    image: logo,
  }))
  .filter(({ image, href }) => image && href);

const BrandTwo = () => {
  const settings = {
    slidesToShow: 7,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 2000,
    speed: 900,
    dots: false,
    pauseOnHover: true,
    arrows: false,
    draggable: true,
    infinite: true,
    responsive: [
      {
        breakpoint: 1399,
        settings: {
          slidesToShow: 6,
          arrows: false,
        },
      },
      {
        breakpoint: 992,
        settings: {
          slidesToShow: 5,
          arrows: false,
        },
      },
      {
        breakpoint: 767,
        settings: {
          slidesToShow: 2,
          arrows: false,
        },
      },
      {
        breakpoint: 424,
        settings: {
          slidesToShow: 2,
          arrows: false,
        },
      },
      {
        breakpoint: 359,
        settings: {
          slidesToShow: 2,
          arrows: false,
        },
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
        <div className='brand-box py-80 px-16 '>
          <h5 className='mb-40 text-center text-neutral-500'>
           178+ Strategic Industry Partners
          </h5>
          <div className='container'>
            <Slider {...settings} className='brand-slider'>
              {bankingPartners.map(({ name, href, image }) => (
                <div className='brand-slider__item px-24' key={name}>
                  <a href={href} target='_blank' rel='noopener noreferrer'>
                    <img src={image} alt={name} />
                  </a>
                </div>
              ))}
            </Slider>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrandTwo;


