// Centralised programme and course listing for navigation and routing
export const PROGRAMMES = [
  {
    title: "GradusX",
    slug: "gradus-x",
    anchor: "/our-courses?programme=gradus-x",
    courses: [
      "Python Programming",
      { name: "Full Stack Development Mastery (MERN)", slug: "full-stack-development-mastery-mern" },
      { name: "Agentic AI Engineering Program", slug: "agentic-ai-engineering-program" },
      "Mobile App Development (Android / iOS)",
      "Cybersecurity & Ethical Hacking",
      "Cloud Computing (AWS, Azure, Google Cloud)",
      "Artificial Intelligence & Machine Learning",
      "Data Science & Analytics",
      "DevOps & CI/CD",
      { name: "Blockchain Development Fundamentals", slug: "blockchain-development-fundamentals" },
      { name: "Quantum Computing Basics Program", slug: "quantum-computing-basics-program" },
      "Tableau / Power BI for Data Visualization",
    ],
  },
  {
    title: "Gradus Finlit",
    anchor: "/our-courses?programme=gradus-finlit",
    courses: [
      { name: "Complete Trading & Investment Mastery Program", slug: "complete-trading-and-investment-mastery-program" },
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
