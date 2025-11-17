import Slider from "react-slick";
import partners from "@shared/placementPartners.json";
import {
  createPartnerCatalogLookup,
  derivePartnerDisplayName,
  hydratePartnerDetails,
  resolvePartnerWebsite,
  sanitizePartnerKey,
} from "../../utils/partners";

// Build a normalized list of partners with logo + href
const catalogLookup = createPartnerCatalogLookup(partners);
const partnerItems = partners
  .map((partner, index) => {
    const hydrated = hydratePartnerDetails(partner, catalogLookup);
    const logo = typeof hydrated?.logo === "string" ? hydrated.logo.trim() : "";
    if (!logo) return null;

    const href = resolvePartnerWebsite(hydrated?.website);
    const displayName =
      derivePartnerDisplayName(hydrated) ||
      derivePartnerDisplayName(partner) ||
      hydrated?.name ||
      partner?.name ||
      "";

    const keyBase =
      sanitizePartnerKey(displayName) ||
      sanitizePartnerKey(hydrated?.name) ||
      sanitizePartnerKey(partner?.name) ||
      `partner-${index}`;

    const programs =
      (Array.isArray(hydrated?.programs) && hydrated.programs.length
        ? hydrated.programs
        : Array.isArray(partner?.programs)
        ? partner.programs
        : []) || [];

    return {
      key: `${keyBase}-${index}`,
      href: href || "",
      logo,
      displayName,
      programs,
    };
  })
  .filter(Boolean);

const preferredPartnerNames = ["century finance"];
const itProgramKeys = ["gradusx"];
const itNameKeywords = [
  " tech",
  "tech ",
  "technology",
  "technologies",
  "software",
  "solutions",
  "digital",
  "infotech",
  "systems",
  "labs",
  "analytics",
  "cloud",
  "ai ",
  " ai",
];

const shufflePartners = (items) => {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

// Keep preferred partners (e.g., CFL) at the front, shuffle everything else.
const prioritizedPartners = (() => {
  const priority = [];
  const itPartners = [];
  const rest = [];

  partnerItems.forEach((item) => {
    const name = (item.displayName || "").toLowerCase();
    const programs = Array.isArray(item.programs)
      ? item.programs.map((p) => (p || "").toLowerCase())
      : [];

    if (preferredPartnerNames.some((preferred) => name.includes(preferred))) {
      priority.push(item);
    } else if (
      programs.some((program) => itProgramKeys.includes(program)) ||
      itNameKeywords.some((kw) => name.includes(kw))
    ) {
      itPartners.push(item);
    } else {
      rest.push(item);
    }
  });

  const shuffledIt = shufflePartners(itPartners);
  const shuffledRest = shufflePartners(rest);

  // Interleave IT partners with 3-4 non-IT partners so IT still leads.
  const weavePartners = () => {
    const result = [...priority];
    let itIndex = 0;
    let restIndex = 0;
    while (itIndex < shuffledIt.length || restIndex < shuffledRest.length) {
      if (itIndex < shuffledIt.length) {
        result.push(shuffledIt[itIndex]);
        itIndex += 1;
      }

      const batchSize = 3 + Math.floor(Math.random() * 2); // 3 or 4
      for (let count = 0; count < batchSize && restIndex < shuffledRest.length; count += 1) {
        result.push(shuffledRest[restIndex]);
        restIndex += 1;
      }
    }
    return result;
  };

  return weavePartners();
})();

const ByCflAndPartners = () => {
  // Split partners into 3 independent rows
  const rows = [[], [], []];
  prioritizedPartners.forEach((item, idx) => rows[idx % 3].push(item));

  const baseSettings = {
    slidesToShow: 7,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 1800,
    speed: 800,
    dots: false,
    pauseOnHover: true,
    arrows: false,
    infinite: true,
    responsive: [
      { breakpoint: 1399, settings: { slidesToShow: 6 } },
      { breakpoint: 1200, settings: { slidesToShow: 5 } },
      { breakpoint: 992, settings: { slidesToShow: 4 } },
      { breakpoint: 768, settings: { slidesToShow: 3 } },
      { breakpoint: 520, settings: { slidesToShow: 2 } },
    ],
  };

  const rowSettings = [
    baseSettings,
    { ...baseSettings, autoplaySpeed: 2000 },
    { ...baseSettings, autoplaySpeed: 2200 },
  ];

  return (
    <section className="bycfl-section py-64 position-relative z-1 bg-white overflow-hidden">
      <div className="container container--lg">
        <div className="text-center mb-32">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              marginBottom: 12,
            }}
          >
            
          </div>
          <img
            src="/assets/images/cfl.png"
            alt="CFL Logo"
            style={{ maxHeight: 56, width: "auto" }}
          />
         
        </div>

        <div className="brand-box py-24 px-8">
          <div className="container">
            {rows.map((row, i) => (
              <div key={`partner-row-${i}`} style={{ marginBottom: i === rows.length - 1 ? 0 : 12 }}>
                <Slider {...rowSettings[i]} className="brand-slider bycfl-slider">
                  {row.map(({ key, logo, displayName }) => (
                    <div
                      className="brand-slider__item"
                      key={key}
                      style={{ paddingLeft: 8, paddingRight: 8 }}
                    >
                      <div>
                        <img
                          src={logo}
                          alt={displayName || "Partner logo"}
                          style={{ maxHeight: 44, width: "auto", display: "block", margin: "0 auto" }}
                        />
                      </div>
                    </div>
                  ))}
                </Slider>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ByCflAndPartners;
