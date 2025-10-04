import { useMemo } from "react";
import Slider from "react-slick";
import partnersCatalog from "@shared/placementPartners.json";
import {
  derivePartnerDisplayName,
  normalizePartnerEntries,
  resolvePartnerWebsite,
} from "../../utils/partners";

const sanitizePartnerKey = (value) => {
  if (!value) {
    return "";
  }

  return value
    .toString()
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/&/g, " and ")
    .replace(/@/g, "")
    .replace(/[^a-z0-9]+/g, "");
};

const buildCandidateKeys = (value) => {
  if (!value) {
    return [];
  }

  const values = Array.isArray(value) ? value : [value];
  const keys = new Set();

  values.forEach((entry) => {
    if (!entry) {
      return;
    }

    const stringValue = entry.toString();
    const sanitizedFull = sanitizePartnerKey(stringValue);
    if (sanitizedFull) {
      keys.add(sanitizedFull);
    }

    stringValue
      .split(/[\/|,&]/)
      .map((segment) => sanitizePartnerKey(segment))
      .filter(Boolean)
      .forEach((key) => keys.add(key));
  });

  return Array.from(keys);
};

const extractHostname = (value) => {
  if (!value) {
    return "";
  }

  try {
    const candidate = /^https?:/i.test(value) ? value : `https://${value}`;
    return new URL(candidate).hostname.replace(/^www\./i, "");
  } catch {
    return value.toString().replace(/^https?:\/\//i, "").replace(/^www\./i, "");
  }
};

const catalogLookup = (() => {
  const lookup = new Map();

  partnersCatalog.forEach((partner) => {
    const keys = new Set([
      ...buildCandidateKeys(partner?.name),
      ...buildCandidateKeys(Array.isArray(partner?.aliases) ? partner.aliases : []),
    ]);

    if (partner?.website) {
      const hostname = extractHostname(partner.website);
      buildCandidateKeys(hostname).forEach((key) => keys.add(key));
    }

    keys.forEach((key) => {
      if (key && !lookup.has(key)) {
        lookup.set(key, partner);
      }
    });
  });

  return lookup;
})();

const hydratePartnerDetails = (partner) => {
  if (!partner) {
    return partner;
  }

  const candidateKeys = new Set([
    ...buildCandidateKeys(partner.name),
    ...buildCandidateKeys(extractHostname(partner.website)),
  ]);

  let matchedPartner = null;
  for (const key of candidateKeys) {
    if (key && catalogLookup.has(key)) {
      matchedPartner = catalogLookup.get(key);
      break;
    }
  }

  if (!matchedPartner && partner.name) {
    const fallbackKey = sanitizePartnerKey(partner.name);
    if (catalogLookup.has(fallbackKey)) {
      matchedPartner = catalogLookup.get(fallbackKey);
    }
  }

  if (matchedPartner) {
    return {
      ...partner,
      name: matchedPartner.name || partner.name || "",
      logo: partner.logo || matchedPartner.logo || "",
      website: partner.website || matchedPartner.website || "",
    };
  }

  return partner;
};

const PlacementPartnersCarousel = ({ partners = [], carouselId }) => {
  const normalizedPartners = useMemo(() => {
    const normalized = normalizePartnerEntries(partners);
    return normalized
      .map((partner) => hydratePartnerDetails(partner))
      .filter((partner) => partner && (partner.name || partner.logo || partner.website));
  }, [partners]);

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

