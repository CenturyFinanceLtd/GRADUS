import FooterOne from "../components/FooterOne";
import HeaderOne from "../components/HeaderOne";
import Animation from "../helper/Animation";
import Preloader from "../helper/Preloader";

const AboutPage = () => {
  return (
    <>
      <Preloader />
      <Animation />
      <HeaderOne />
      <main className='about-new'>
        <section className='about-hero'>
          <div className='container container--lg'>
            <div className='about-hero__grid'>
              <div>
                <p className='about-hero__eyebrow'>About Gradus</p>
                <h1 className='about-hero__title text-line-3'>
                  We build market-ready talent with outcome-first learning.
                </h1>
                <p className='about-hero__copy'>
                  Gradus blends expert-led cohorts, live practice, and hiring-grade projects so learners graduate
                  with proof of skill, not just certificates. We are obsessed with the gap between learning and
                  landing—every module is designed to close it.
                </p>
                <div className='about-hero__stats'>
                  <div className='about-chip'>
                    <span className='about-chip__value'>250K+</span>
                    <span className='about-chip__label'>Learner community</span>
                  </div>
                  <div className='about-chip'>
                    <span className='about-chip__value'>178+</span>
                    <span className='about-chip__label'>Hiring partners</span>
                  </div>
                  <div className='about-chip'>
                    <span className='about-chip__value'>96%</span>
                    <span className='about-chip__label'>Project completion</span>
                  </div>
                </div>
              </div>
              <div className='about-hero__panel'>
                <div className='about-hero__badge'>Best in the market</div>
                <h3 className='about-hero__panel-title'>Outcomes, not promises.</h3>
                <ul className='about-hero__list'>
                  <li>Live, mentor-led sessions tuned to employer rubrics</li>
                  <li>Portfolio-grade projects vetted by industry reviewers</li>
                  <li>Interview prep sprints aligned to real hiring loops</li>
                  <li>Career pods with weekly feedback and referrals</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className='about-best'>
          <div className='container container--lg'>
            <div className='about-section-head'>
              <p className='about-section-tag'>Best in the market</p>
              <h2>What makes Gradus different</h2>
              <p className='about-section-sub'>
                We engineered every part of the learner journey around proof of work, speed to skill, and hiring signal.
              </p>
            </div>
            <div className='about-best__grid'>
              <article className='about-card'>
                <div className='about-card__icon'>⏱️</div>
                <h3>Speed to skill</h3>
                <p>
                  Structured 6–12 week pathways that move from fundamentals to job-ready in the shortest possible time,
                  with weekly checkpoints to keep momentum.
                </p>
              </article>
              <article className='about-card'>
                <div className='about-card__icon'>🧠</div>
                <h3>Proof over theory</h3>
                <p>
                  Capstone projects mapped to real product specs and reviewed by industry mentors so you graduate with
                  artifacts that speak louder than resumes.
                </p>
              </article>
              <article className='about-card'>
                <div className='about-card__icon'>🤝</div>
                <h3>Hiring embedded</h3>
                <p>
                  Career pods, mock loops, and direct partner showcases ensure you are seen by the right hiring teams at
                  the right time.
                </p>
              </article>
              <article className='about-card'>
                <div className='about-card__icon'>📊</div>
                <h3>Data-backed guidance</h3>
                <p>
                  Progress telemetry, personalized nudges, and mentor interventions keep learners on track and prevent
                  drop-offs.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className='about-proof'>
          <div className='container container--lg'>
            <div className='about-proof__grid'>
              <div>
                <p className='about-section-tag'>Impact</p>
                <h2 className='mb-12'>Results our partners trust</h2>
                <p className='about-section-sub'>
                  From top tech employers to leading financial institutions, Gradus alumni ship faster, ramp quicker,
                  and stay longer.
                </p>
                <div className='about-proof__stats'>
                  <div className='about-proof__stat'>
                    <span className='about-proof__value'>42%</span>
                    <span className='about-proof__label'>Faster ramp to productivity</span>
                  </div>
                  <div className='about-proof__stat'>
                    <span className='about-proof__value'>3.4x</span>
                    <span className='about-proof__label'>Interview pass-rate uplift</span>
                  </div>
                  <div className='about-proof__stat'>
                    <span className='about-proof__value'>72</span>
                    <span className='about-proof__label'>Cities with placed alumni</span>
                  </div>
                </div>
              </div>
              <div className='about-proof__panel'>
                <h4 className='about-proof__title'>Milestones</h4>
                <ul className='about-timeline'>
                  <li>
                    <span className='about-timeline__time'>2019</span>
                    <p className='about-timeline__text'>Gradus launches with the first cohort-based career track.</p>
                  </li>
                  <li>
                    <span className='about-timeline__time'>2021</span>
                    <p className='about-timeline__text'>Expanded into finance and analytics with 50+ enterprise partners.</p>
                  </li>
                  <li>
                    <span className='about-timeline__time'>2023</span>
                    <p className='about-timeline__text'>Introduced mentor-led interview pods and doubled placement velocity.</p>
                  </li>
                  <li>
                    <span className='about-timeline__time'>2025</span>
                    <p className='about-timeline__text'>Recognized as the best-in-market upskilling platform for job readiness.</p>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className='about-values'>
          <div className='container container--lg'>
            <div className='about-section-head'>
              <p className='about-section-tag'>How we work</p>
              <h2>Principles that guide every cohort</h2>
              <p className='about-section-sub'>
                A learner experience that is intentional, accountable, and relentlessly practical.
              </p>
            </div>
            <div className='about-values__grid'>
              <div className='about-value'>
                <h4>Clarity first</h4>
                <p>We define outcomes upfront so learners always know what "good" looks like.</p>
              </div>
              <div className='about-value'>
                <h4>Practice in public</h4>
                <p>Ship visible work weekly—feedback comes faster, confidence compounds.</p>
              </div>
              <div className='about-value'>
                <h4>Mentors on tap</h4>
                <p>Industry experts step in at critical moments, not just at the end.</p>
              </div>
              <div className='about-value'>
                <h4>Career is the product</h4>
                <p>Resume clinics, mock loops, and referrals are baked into the curriculum.</p>
              </div>
            </div>
          </div>
        </section>

        <section className='about-cta'>
          <div className='container container--lg'>
            <div className='about-cta__card'>
              <div>
                <p className='about-cta__eyebrow'>Ready to see outcomes?</p>
                <h3>Join the best-in-market pathway to your next role.</h3>
                <p className='about-cta__sub'>
                  Talk to our advisors and pick the cohort that fits your goals. We will map your route from today to hired.
                </p>
              </div>
              <div className='about-cta__actions'>
                <a className='btn btn-primary rounded-pill px-32' href='/our-courses'>
                  Explore cohorts
                </a>
                <a className='btn btn-outline-secondary rounded-pill px-24' href='/contact'>
                  Talk to us
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
      <FooterOne />
    </>
  );
};

export default AboutPage;
