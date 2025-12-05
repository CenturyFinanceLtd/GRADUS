import React from "react";

const FEATURES = [
  {
    title: "Live Classes",
    copy: "Real-time interactive sessions led by industry experts to deepen understanding and clear doubts instantly",
    icon: "assets/icons/Group.svg",
  },
  {
    title: "1:1 Interaction",
    copy: "Personalized one-on-one doubt-clearing and mentorship sessions tailored to your learning needs",
    icon: "assets/icons/Member.svg",
  },
  {
    title: "Notes",
    copy: "Structured, easy-to-understand study materials designed to simplify complex concepts",
    icon: "assets/icons/Notes.svg",
  },
  {
    title: "Projects",
    copy: "Hands-on real-world projects that help you build practical, industry-relevant skills",
    icon: "assets/icons/Projects.svg",
  },
  {
    title: "Assessments",
    copy: "Weekly evaluations and quizzes to track your progress and improve topic-wise mastery",
    icon: "assets/icons/Assessments.svg",
  },
  {
    title: "Certificate",
    copy: "Earn a recognized course completion certificate that validates your skills and learning",
    icon: "assets/icons/Certificate.svg",
  },
];

const CourseInsight = () => {
  return (
    <section className="course-insight-section py-64">
      <div className="container container--lg">
        <div className="text-center mb-32">
          <h2 className="mb-8 l1-head">
            Course <span style={{ color: "#22c55e" }}>Insights</span>
          </h2><p className="text-neutral-600 mb-0"> A seamlessly integrated learning experience crafted for practical, measurable growth
          </p>
        </div>

        <div className="course-insight-grid">
          {FEATURES.map((item) => (
            <div key={item.title} className="course-insight-card">
              <div className="course-insight-icon" aria-hidden="true">
                <img src={item.icon} />
              </div>
              <h5 className="mb-8 text-neutral-800">{item.title}</h5>
              <p className="mb-0 text-neutral-600">{item.copy}</p>
            </div>
          ))}
        </div>
      </div>
      <style>{`
        .course-insight-grid {
          display: grid;
          gap: 18px;
          grid-template-columns: repeat(3, minmax(220px, 1fr));
        }
        .course-insight-card {
          height: 100%;
          background: #fff;
          border-radius: 10px;
          padding: 24px 20px;
          text-align: center;
          box-shadow: 0 10px 28px rgba(15, 23, 42, 0.08);
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .course-insight-icon {
          width: 64px;

+-          height: 64px;
          margin: 1rem auto 1rem;
          border-radius: 18px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 30px;
        }
        @media (max-width: 991.98px) {
          .course-insight-grid {
            grid-template-columns: repeat(2, minmax(220px, 1fr));
          }
        }
        @media (max-width: 575.98px) {
          .course-insight-grid {
            grid-template-columns: 1fr 1fr;
          }
          .course-insight-card {
            padding: 20px 16px;
            gap: 4px;
          }
        }
      `}</style>
    </section>
  );
};

export default CourseInsight;
