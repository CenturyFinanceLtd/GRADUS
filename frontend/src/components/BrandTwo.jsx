import { useMemo } from "react";
import Slider from "react-slick";
import usePartnerLogos from "../hooks/usePartnerLogos";
import { buildPartnerDisplayItems } from "../utils/partners";

const BrandTwo = () => {
  const { partners } = usePartnerLogos();
  const brandPartners = useMemo(
    () => buildPartnerDisplayItems(partners),
    [partners]
  );
  const loopPartners = useMemo(() => {
    if (!brandPartners.length) return [];
    return brandPartners.concat(brandPartners, brandPartners);
  }, [brandPartners]);

  if (!brandPartners.length) {
    return null;
  }

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
            <Slider {...settings} className='brand-slider brand-slider--marquee'>
              {loopPartners.map(({ key, href, logo, displayName }, idx) => {
                const Element = href ? "a" : "div";
                const elementProps = href
                  ? {
                      href,
                      target: "_blank",
                      rel: "noopener noreferrer",
                    }
                  : {};

                return (
                  <div className='brand-slider__item px-24' key={`${key}-${idx}`}>
                    <Element {...elementProps}>
                      <img
                        src={logo}
                        alt={displayName || "Strategic partner logo"}
                      />
                    </Element>
                  </div>
                );
              })}
            </Slider>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrandTwo;


