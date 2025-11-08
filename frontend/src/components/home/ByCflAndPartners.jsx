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

    return {
      key: `${keyBase}-${index}`,
      href: href || "",
      logo,
      displayName,
    };
  })
  .filter(Boolean);

const ByCflAndPartners = () => {
  // Split partners into 3 independent rows
  const rows = [[], [], []];
  partnerItems.forEach((item, idx) => rows[idx % 3].push(item));

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
    <section className="py-64 position-relative z-1 bg-main-25 overflow-hidden">
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
