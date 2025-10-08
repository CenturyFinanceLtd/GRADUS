import Slider from "react-slick";
import partners from "@shared/placementPartners.json";
import {
  createPartnerCatalogLookup,
  derivePartnerDisplayName,
  hydratePartnerDetails,
  resolvePartnerWebsite,
  sanitizePartnerKey,
} from "../utils/partners";

const catalogLookup = createPartnerCatalogLookup(partners);

const brandPartners = partners
  .map((partner, index) => {
    const hydratedPartner = hydratePartnerDetails(partner, catalogLookup);
    const logo =
      typeof hydratedPartner?.logo === "string" ? hydratedPartner.logo.trim() : "";

    if (!logo) {
      return null;
    }

    const href = resolvePartnerWebsite(hydratedPartner?.website);
    const displayName =
      derivePartnerDisplayName(hydratedPartner) ||
      derivePartnerDisplayName(partner) ||
      hydratedPartner?.name ||
      partner?.name ||
      "";

    const keyBase =
      sanitizePartnerKey(displayName) ||
      sanitizePartnerKey(hydratedPartner?.name) ||
      sanitizePartnerKey(partner?.name) ||
      `partner-${index}`;

    return {
      key: `${keyBase}-${index}`,
      href: href || "",
      logo,
      displayName,
    };
  })
  .filter(Boolean);

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
              {brandPartners.map(({ key, href, logo, displayName }) => {
                const Element = href ? "a" : "div";
                const elementProps = href
                  ? {
                      href,
                      target: "_blank",
                      rel: "noopener noreferrer",
                    }
                  : {};

                return (
                  <div className='brand-slider__item px-24' key={key}>
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


