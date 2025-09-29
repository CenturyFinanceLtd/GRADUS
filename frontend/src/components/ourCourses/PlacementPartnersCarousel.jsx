import { useMemo } from 'react';
import Slider from 'react-slick';
import {
  derivePartnerDisplayName,
  normalizePartnerEntries,
  resolvePartnerWebsite,
} from '../../utils/partners';

const PlacementPartnersCarousel = ({ partners = [], carouselId }) => {
  const normalizedPartners = useMemo(() => normalizePartnerEntries(partners), [partners]);

  if (!normalizedPartners.length) {
    return null;
  }

  const sliderSettings = {
    dots: false,
    infinite: true,
    autoplay: true,
    autoplaySpeed: 2600,
    speed: 600,
    pauseOnHover: true,
    slidesToShow: Math.min(6, normalizedPartners.length),
    slidesToScroll: 1,
    arrows: false,
    responsive: [
      {
        breakpoint: 1400,
        settings: { slidesToShow: Math.min(5, normalizedPartners.length) },
      },
      {
        breakpoint: 1200,
        settings: { slidesToShow: Math.min(4, normalizedPartners.length) },
      },
      {
        breakpoint: 992,
        settings: { slidesToShow: Math.min(3, normalizedPartners.length) },
      },
      {
        breakpoint: 768,
        settings: { slidesToShow: Math.min(2, normalizedPartners.length) },
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
          {normalizedPartners.map((partner, index) => {
            const websiteHref = resolvePartnerWebsite(partner.website);
            const cardComponentProps = websiteHref
              ? {
                  href: websiteHref,
                  target: '_blank',
                  rel: 'noreferrer noopener',
                }
              : {};

            const CardComponent = websiteHref ? 'a' : 'div';
            const displayName = derivePartnerDisplayName(partner);

            return (
              <div className='our-courses-partner-card-wrapper px-2' key={`${carouselId}-partner-${index}`}>
                <CardComponent
                  className='our-courses-partner-card'
                  aria-label={websiteHref ? `Visit ${displayName || 'placement partner'} website` : undefined}
                  {...cardComponentProps}
                >
                  <span className='our-courses-partner-card__index'>
                    {(index + 1).toString().padStart(2, '0')}
                  </span>
                  {partner.logo ? (
                    <div className='our-courses-partner-card__logo-wrapper'>
                      <img
                        src={partner.logo}
                        alt={displayName ? `${displayName} logo` : 'Placement partner logo'}
                        className='our-courses-partner-card__logo'
                        loading='lazy'
                      />
                    </div>
                  ) : null}
                  {displayName ? (
                    <span className='our-courses-partner-card__name'>{displayName}</span>
                  ) : null}
                </CardComponent>
              </div>
            );
          })}
        </Slider>
      </div>
    </div>
  );
};

export default PlacementPartnersCarousel;
