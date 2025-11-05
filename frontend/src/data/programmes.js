// Centralised programme and course listing for navigation and routing
export const PROGRAMMES = [
  {
    title: "GradusX",
    anchor: "/our-courses?programme=gradusx",
    courses: [
      "Python Programming",
      "Data Structures & Algorithms",
      "Full Stack Development (HTML, CSS, JavaScript, React, etc.)",
      "Mobile App Development (Android / iOS)",
      "Database Management (SQL, MongoDB)",
      "Cybersecurity & Ethical Hacking",
      "Cloud Computing (AWS, Azure, Google Cloud)",
      "Artificial Intelligence & Machine Learning",
      "Data Science & Analytics",
      "DevOps & CI/CD",
      "Blockchain Development",
      "Quantum Computing Basics",
      "Tableau / Power BI for Data Visualization",
    ],
  },
  {
    title: "Gradus Finlit",
    anchor: "/our-courses?programme=gradus-finlit",
    courses: [
      "Technical analysis",
      "Swing trading & investing",
      "Scalping & Intraday",
      "Futures and options",
      "commodity trading",
      "Mutual funds and SIPs",
    ],
  },
  {
    title: "Gradus Lead",
    anchor: "/our-courses?programme=gradus-lead",
    courses: ["NISM Certification"],
  },
];

export default PROGRAMMES;
