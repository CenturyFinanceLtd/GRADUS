import { useMemo, useRef } from "react";
import { Link } from "react-router-dom";

// Curated list for the "Popular Courses" ribbon
// Matches the items shared in the reference screenshots with proper URLs
const POPULAR = [
  {
    title: "Full Stack Development Mastery (MERN)",
    to: "/gradus-x/full-stack-development-mastery-mern",
    category: "",
    focus: "",
    description: "Hands-on MERN mastery",
    badge: "",
    action: "Enroll",
    primaryTag: "Career",
    accent: "linear-gradient(135deg, #e0e4ff, #c8d3ff)",
  },
  {
    title: "Agentic AI Engineering Flagship Program",
    to: "/gradus-x/agentic-ai-engineering-flagship",
    category: "",
    focus: "",
    description: "Autonomous AI projects",
    badge: "",
    action: "Enroll",
    primaryTag: "Advanced",
    accent: "linear-gradient(135deg, #ffe6f3, #ffd6e6)",
  },
  {
    title: "Quantum Computing Basics Program",
    to: "/gradus-x/quantum-computing-basics",
    category: "",
    focus: "",
    description: "Qubits and gates made-easy",
    badge: "",
    action: "Enroll",
    primaryTag: "Concepts",
    accent: "linear-gradient(135deg, #ddf7f0, #c6efe3)",
  },
  {
    title: "Complete Market & Finance Mastery Program",
    to: "/gradus-finlit/complete-market-and-finance-mastery-program",
    category: "",
    focus: "",
    description: "Real market strategies..",
    badge: "",
    action: "Enroll",
    primaryTag: "Cohort",
    accent: "linear-gradient(135deg, #fff3d6, #ffe3a6)",
  },
  {
    title: "Mobile App Development Mastery (React Native)",
    to: "/gradus-x/mobile-app-development-mastery-react-native",
    category: "",
    focus: "",
    description: "Launch Android & iOS.",
    badge: "",
    action: "Enroll",
    primaryTag: "Launch",
    accent: "linear-gradient(135deg, #e6f0ff, #d1e2ff)",
  },
];

const CHIP_COLORS = {
  tech: { background: "#D4F6E6", color: "#0B5E3D" },
  ai: { background: "#E5E4FF", color: "#3E2DB5" },
  quantum: { background: "#DAF2FF", color: "#083B6F" },
  finance: { background: "#FFEAD6", color: "#7A3A00" },
  apps: { background: "#E6F0FF", color: "#0B3E8A" },
  business: { background: "#EDEDED", color: "#2D2D2D" },
  design: { background: "#FFE5BF", color: "#7A3E00" },
  development: { background: "#DCEEFE", color: "#0A4373" },
  innovation: { background: "#FFE1F0", color: "#A01363" },
  foundations: { background: "#E4F3FF", color: "#0A4266" },
  markets: { background: "#FFF2DA", color: "#7A5200" },
  "build-launch": { background: "#E9F7EF", color: "#0B5C3D" },
  "career-track": { background: "#E3EEFF", color: "#1A3F91" },
  advanced: { background: "#EAE3FF", color: "#4A1DB0" },
  concepts: { background: "#EAF7FB", color: "#0A566C" },
  "live-cohort": { background: "#FFE6EC", color: "#9E183A" },
};

const getChipStyle = (label) => {
  if (!label) return {};
  const key = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return CHIP_COLORS[key] || { background: "#EDF1F7", color: "#1F2A37" };
};

const InfoTwo = () => {
  const items = useMemo(() => POPULAR, []);
  const scrollerRef = useRef(null);

  const scrollByCards = (direction = 1) => {
    const container = scrollerRef.current;
    if (!container) return;
    const card = container.querySelector(".course-card");
    if (!card) return;
    const perView = 5; // show 5 at a time
    const scrollAmount = card.offsetWidth * perView + 16; // include gap
    container.scrollBy({ left: direction * scrollAmount, behavior: "smooth" });
  };

  return (
    <section className='info-two home-courses-overlap half-bg half-bg__70'>
      <div className='container'>
        <div className='home-courses-surface bg-white box-shadow-md rounded-16 p-8'>
          <div className='d-flex align-items-center justify-content-between mb-5'>
            <div className='d-flex align-items-center gap-12'>
              <span className='badge-popular-courses'>Popular Courses</span>
            </div>
            <div className='d-flex gap-8'>
              <button
                type='button'
                aria-label='Scroll left'
                className='courses-nav-btn'
                onClick={() => scrollByCards(-1)}
              >
                {"<"}
              </button>
              <button
                type='button'
                aria-label='Scroll right'
                className='courses-nav-btn'
                onClick={() => scrollByCards(1)}
              >
                {">"}
              </button>
            </div>
          </div>

          <div
            ref={scrollerRef}
            className='courses-scroller'
            data-aos='fade-up'
            data-aos-duration={600}
          >
            {items.slice(0, 5).map((item, idx) => (
              <Link
                key={idx}
                className='course-card'
                to={item.to}
                title={item.title}
              >
                <div className='course-card__desktop'>
                  <span className='course-icon'>
                    <img src={`/assets/images/icons/category-icon${(idx % 4) + 1}.png`} alt='' />
                  </span>
                  <span className='course-title'>{item.title}</span>
                </div>

                <div className='course-card__mobile'>
                  <div
                    className='course-card__figure'
                    style={{ background: item.accent }}
                  >
                    <img
                      src={`/assets/images/icons/category-icon${(idx % 4) + 1}.png`}
                      alt=''
                      loading='lazy'
                    />
                    {item.badge && (
                      <span className='course-card__badge'>{item.badge}</span>
                    )}
                  </div>
                  <div className='course-card__body'>
                    <div className='course-card__pill-row'>
                      {item.category && (
                        <span
                          className='course-card__pill'
                          style={getChipStyle(item.category)}
                        >
                          {item.category}
                        </span>
                      )}
                      {item.focus && (
                        <span
                          className='course-card__pill course-card__pill--muted'
                          style={getChipStyle(item.focus)}
                        >
                          {item.focus}
                        </span>
                      )}
                    </div>
                    <h5 className='course-card__title'>{item.title}</h5>
                    {item.description && (
                      <p className='course-card__desc'>{item.description}</p>
                    )}
                    <div className='course-card__meta'>
                      {item.primaryTag && (
                        <span
                          className='course-card__chip'
                          style={getChipStyle(item.primaryTag)}
                        >
                          {item.primaryTag}
                        </span>
                      )}
                      <span className='course-card__chip course-card__chip--cta'>
                        {item.action || "Enroll"}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default InfoTwo;
