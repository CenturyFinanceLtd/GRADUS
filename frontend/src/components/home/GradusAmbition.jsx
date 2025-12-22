const HIGHLIGHTS = [
  {
    title: "Paid Internships",
    description: "Immersive two-month remunerated internships deliver real-world exposure.",
    icon: "ph ph-briefcase",
  },
  {
    title: "Placement Assurance",
    description: "Structured placement pathways with prestigious organizations nationwide.",
    icon: "ph ph-medal-military",
  },
  {
    title: "178 Industry Partners",
    description: "Curriculum aligned with competencies employers demand today.",
    icon: "ph ph-buildings",
  },
  {
    title: "Distinguished Mentors",
    description: "Veteran trainers nurture critical thinking and professional resilience.",
    icon: "ph ph-users-three",
  },
];

const GradusAmbition = () => {
  return (
    <section className="gradus-ambition-section">
      <div className="container">
        <div className="gradus-ambition-card">
          <div className="gradus-ambition__left" data-aos="fade-right">
            <span className="gradus-ambition__tag">Know Gradus</span>
            <h2 className="gradus-ambition__title">Where Ambition Becomes Proven Expertise</h2>
            <p className="gradus-ambition__lead">
              Gradus, the career acceleration initiative by MDM MADHUBANI TECHNOLOGIES PRIVATE LIMITED, forges a decisive
              bridge between academic instruction and industry.
            </p>
            <p className="gradus-ambition__body">
              Backed by immersive internships, assured placement trajectories, and mentors rigorously
              selected for their experiential authority, Gradus elevates potential into measurable outcomes.
            </p>
          </div>
          <div className="gradus-ambition__right" data-aos="fade-left">
            <ul className="gradus-ambition__list">
              {HIGHLIGHTS.map(({ title, description, icon }) => (
                <li className="gradus-ambition__item" key={title}>
                  <div className="gradus-ambition__icon-wrap">
                    <div className="gradus-ambition__icon">
                      <i className={icon} aria-hidden="true" />
                    </div>
                  </div>
                  <div className="gradus-ambition__item-content">
                    <p className="gradus-ambition__item-title">{title}</p>
                    <p className="gradus-ambition__item-desc">{description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

export default GradusAmbition;
