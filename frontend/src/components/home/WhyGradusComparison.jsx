import { useEffect, useRef, useState } from "react";

const FEATURES = [
  "Job Guarantee",
  "Paid Internship",
  "Industry Level Projects",
  "Top Industry Mentors",
  "Hands on learning with tools",
  "Outcome Driven Curriculam",
  "Teach Job ready skills",
  "Live + Practical Learning",
];

const CheckIcon = () => (
  <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
    <circle cx="18" cy="18" r="16.5" fill="#E9F8F2" stroke="#2CA06C" strokeWidth="1.5" />
    <path d="M11.5 18L16.25 22.5L24.5 13.5" stroke="#118A52" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CrossIcon = () => (
  <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
    <circle cx="18" cy="18" r="16.5" fill="#FDEBEE" stroke="#E03F3F" strokeWidth="1.5" />
    <path d="M23 13L13 23M13 13L23 23" stroke="#CA2020" strokeWidth="2.4" strokeLinecap="round" />
  </svg>
);

const WhyGradusComparison = () => {
  const featureHeaderRef = useRef(null);
  const compareHeaderRef = useRef(null);
  const [metrics, setMetrics] = useState({ feature: 0, compare: 0 });

  useEffect(() => {
    const featureHeader = featureHeaderRef.current;
    const compareHeader = compareHeaderRef.current;
    if (!featureHeader || !compareHeader) {
      return undefined;
    }

    const calculateOffsets = () => {
      const featureHeight = featureHeader.offsetHeight;
      const compareHeight = compareHeader.offsetHeight;
      setMetrics({
        feature: Math.max(compareHeight - featureHeight, 0),
        compare: Math.max(featureHeight - compareHeight, 0),
      });
    };

    calculateOffsets();

    const resizeObserver =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(calculateOffsets) : null;
    resizeObserver?.observe(featureHeader);
    resizeObserver?.observe(compareHeader);

    window.addEventListener("resize", calculateOffsets);

    return () => {
      window.removeEventListener("resize", calculateOffsets);
      resizeObserver?.disconnect();
    };
  }, []);

  return (
    <section className="why-gradus-section py-64">
      <div className="container">
        <div className="why-gradus-heading text-center">
          <h2>
            Why <span>Gradus</span> not Others?
          </h2>
        </div>

        <div className="why-gradus-cards">
          <article className="why-gradus-card feature-card" data-aos="fade-up" data-aos-duration="350">
            <p className="feature-card__eyebrow" ref={featureHeaderRef}>
              Features
            </p>
            <ul
              className="feature-card__list"
              style={{ "--feature-offset": `${metrics.feature}px` }}
            >
              {FEATURES.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
          </article>

          <article className="why-gradus-card compare-card" data-aos="fade-up" data-aos-duration="450">
            <div className="compare-card__header" ref={compareHeaderRef}>
              <div className="compare-card__brand">
                <span className="compare-card__brand-name" aria-hidden="true">
                  Gradus
                </span>
                <span className="visually-hidden">Gradus</span>
              </div>
              <div className="compare-card__other">Other Platform</div>
            </div>

            <ul
              className="compare-card__body"
              style={{ "--compare-offset": `${metrics.compare}px` }}
            >
              {FEATURES.map((feature) => (
                <li className="compare-card__row" key={`compare-${feature}`}>
                  <span className="visually-hidden">{feature}</span>
                  <span className="compare-card__icon is-positive" aria-label={`Gradus offers ${feature}`}>
                    <CheckIcon />
                  </span>
                  <span className="compare-card__icon is-negative" aria-label={`Other platforms lack ${feature}`}>
                    <CrossIcon />
                  </span>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </div>
    </section>
  );
};

export default WhyGradusComparison;
