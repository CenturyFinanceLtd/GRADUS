import { useMemo, useRef } from "react";
import { Link } from "react-router-dom";

// Curated list for the "Popular Courses" ribbon
// Matches the items shared in the reference screenshots with proper URLs
const POPULAR = [
  {
    title: "Full Stack Development Mastery (MERN)",
    to: "/gradus-x/full-stack-development-mastery-mern",
  },
  {
    title: "AI Engineering Program",
    to: "/gradus-x/agentic-ai-engineering-program",
  },
  {
    title: "Quantum Computing Basics Program",
    to: "/gradus-x/quantum-computing-basics-program",
  },
  {
    title: "Complete Trading & Investment Mastery Program",
    to: "/gradus-finlit/complete-trading-and-investment-mastery-program",
  },
  {
    title: "Mobile App Development Mastery (React Native)",
    to: "/gradus-x/mobile-app-development-react-native",
  },
];

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
        <div className='home-courses-surface bg-white box-shadow-md rounded-16 p-24'>
          <div className='d-flex align-items-center justify-content-between mb-20'>
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
                <span className='course-icon'>
                  <img src={`/assets/images/icons/category-icon${(idx % 4) + 1}.png`} alt='' />
                </span>
                <span className='course-title'>{item.title}</span>
               
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default InfoTwo;
