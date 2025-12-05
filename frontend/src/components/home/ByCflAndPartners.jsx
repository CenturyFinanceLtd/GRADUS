import { useMemo } from "react";
import Slider from "react-slick";
import usePartnerLogos from "../../hooks/usePartnerLogos";
import { buildPartnerDisplayItems } from "../../utils/partners";

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

const prioritizePartners = (items) => {
  if (!items?.length) return [];
  const priority = [];
  const itPartners = [];
  const rest = [];

  items.forEach((item) => {
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
};

const buildLoopRow = (row, visibleSlides) => {
  if (!row?.length) return [];

  const minItems = Math.max(visibleSlides * 4, row.length * 3);
  const repeatCount = Math.ceil(minItems / row.length);

  return Array.from({ length: repeatCount }, () => row).flat();
};

const ByCflAndPartners = () => {
  const { partners, loading, error } = usePartnerLogos();
  const partnerItems = useMemo(
    () => buildPartnerDisplayItems(partners),
    [partners]
  );
  const prioritizedPartners = useMemo(
    () => prioritizePartners(partnerItems),
    [partnerItems]
  );
  // Split partners into 3 independent rows
  const rows = useMemo(() => {
    const rowBuckets = [[], [], []];
    prioritizedPartners.forEach((item, idx) => rowBuckets[idx % 3].push(item));
    return rowBuckets;
  }, [prioritizedPartners]);

  const showSkeleton = loading || error || !partnerItems.length;

  const skeletonRows = [0, 1, 2];
  const skeletonItems = new Array(7).fill(null);
  const skeletonStyle = {
    background: "linear-gradient(90deg, #f1f4f9 25%, #e6ebf2 50%, #f1f4f9 75%)",
    backgroundSize: "200% 100%",
    animation: "partner-skeleton 1.4s ease-in-out infinite",
    borderRadius: 12,
    height: 70,
    width: 160,
    margin: "10px auto",
  };
  const skeletonKeyframes = `
    @keyframes partner-skeleton {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `;

  const baseSettings = {
    slidesToShow: 4,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 0, // continuous movement with no pause
    speed: 13000, // steady, uniform pace across all rows
    cssEase: "linear",
    dots: false,
    pauseOnHover: false,
    pauseOnFocus: false,
    arrows: false,
    infinite: true,
    swipeToSlide: true,
    responsive: [
      { breakpoint: 1399, settings: { slidesToShow: 4 } },
      { breakpoint: 1200, settings: { slidesToShow: 4 } },
      { breakpoint: 992, settings: { slidesToShow: 3 } },
      { breakpoint: 768, settings: { slidesToShow: 3 } },
      { breakpoint: 520, settings: { slidesToShow: 2 } },
    ],
  };

  const rowConfigs = [
    { direction: "ltr" },
    { direction: "rtl" },
    { direction: "ltr" },
  ];

  return (
    <section className="bycfl-section py-40 position-relative z-1 bg-white overflow-hidden">
      <style>{skeletonKeyframes}</style>
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

        <div
          className="brand-box py-24 px-8"
          style={{
            minHeight: 320,
            background: showSkeleton ? "#f7f9fc" : "transparent",
            border: "none",
            padding: "16px 12px",
          }}
        >
          <div className="container">
            {showSkeleton ? (
              skeletonRows.map((rowKey) => (
                <div key={`skeleton-row-${rowKey}`} style={{ marginBottom: rowKey === skeletonRows.length - 1 ? 0 : 12 }}>
                  <div className="d-flex" style={{ gap: 12, justifyContent: "center" }}>
                    {skeletonItems.map((_, idx) => (
                      <div key={`skeleton-${rowKey}-${idx}`} style={{ padding: "0 8px" }}>
                        <div style={skeletonStyle} />
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              rows.map((row, i) => {
                const rowLength = row.length;
                const desktopSlides = Math.min(
                  baseSettings.slidesToShow,
                  Math.max(rowLength, 3)
                );
                const loopRow = buildLoopRow(row, desktopSlides);
                if (!loopRow.length) {
                  return null;
                }

                const responsive = baseSettings.responsive.map((entry) => ({
                  ...entry,
                  settings: {
                    ...entry.settings,
                    slidesToShow: Math.min(
                      entry.settings.slidesToShow,
                      Math.max(rowLength, 2)
                    ),
                  },
                }));

                const sliderSettings = {
                  ...baseSettings,
                  slidesToShow: desktopSlides,
                  infinite: loopRow.length > desktopSlides,
                  rtl: rowConfigs[i]?.direction === "rtl", // alternate row direction for a calmer feel
                  speed: baseSettings.speed,
                  initialSlide: 0,
                  centerMode: false,
                  variableWidth: false,
                  slidesToScroll: 1,
                  waitForAnimate: true,
                  responsive,
                };
                return (
                  <div key={`partner-row-${i}`} style={{ marginBottom: i === rows.length - 1 ? 0 : 18 }}>
                    <Slider {...sliderSettings} className="brand-slider bycfl-slider">
                      {loopRow.map(({ key, logo, displayName }, idx) => (
                        <div className="brand-slider__item" key={`${key}-${idx}`} style={{ padding: "10px 12px" }}>
                          <div>
                            <img
                              src={logo}
                              alt={displayName || "Partner logo"}
                              style={{ maxHeight: 48, width: "auto", display: "block", margin: "0 auto" }}
                            />
                          </div>
                        </div>
                      ))}
                    </Slider>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ByCflAndPartners;
