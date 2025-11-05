import { useMemo, useRef } from "react";

const COURSES = [
  // Requested Popular (will be shown since we slice top 5)
  "commodity trading",
  "Artificial Intelligence & Machine Learning",
  "Python Programming",
  "Technical analysis",
  "Full Stack Development",
  // Rest of catalog
  "Data Structures & Algorithms",
  "Full Stack Development",
  "Mobile App Development (Android / iOS)",
  "Database Management (SQL, MongoDB)",
  "Cybersecurity & Ethical Hacking",
  "Cloud Computing (AWS, Azure, Google Cloud)",
  "Data Science & Analytics",
  "DevOps & CI/CD",
  "Blockchain Development",
  "Quantum Computing Basics",
  "Tableau / Power BI for Data Visualization",
  "Swing Trading & Investing",
  "NISM Certification",
  "Scalping & Intraday",
  "Futures and Options",
  "Mutual Funds and SIPs",
];

const InfoTwo = () => {
  const items = useMemo(() => COURSES, []);
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
            {items.slice(0, 5).map((title, idx) => (
              <a
                key={idx}
                className='course-card'
                href='#'
                onClick={(e) => e.preventDefault()}
              >
                <span className='course-icon'>
                  <img src={`/assets/images/icons/category-icon${(idx % 4) + 1}.png`} alt='' />
                </span>
                <span className='course-title'>{title}</span>
                <span className='course-arrow'>{">"}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default InfoTwo;
