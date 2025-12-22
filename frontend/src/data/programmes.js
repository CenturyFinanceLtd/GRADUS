// Centralised programme and course listing for navigation and routing
export const PROGRAMMES = [
  {
    title: "GradusX",
    slug: "gradus-x",
    anchor: "/our-courses?programme=gradus-x",
    courses: [
      {
        name: "Agentic AI Engineering Flagship Program",
        slug: "agentic-ai-engineering-flagship",
        flagship: true,
        flagshipTone: "tech",
      },
      {
        name: "Software Development Flagship Program",
        slug: "software-development-flagship",
        flagship: true,
        flagshipTone: "tech",
      },
      { name: "Full Stack Development Mastery (MERN)", slug: "full-stack-development-mastery-mern" },
      { name: "Python Programming Mastery", slug: "python-programming-mastery" },
      { name: "Front End Development Mastery (HTML, CSS, JavaScript, React)", slug: "front-end-development-mastery-html-css-js-react" },
      { name: "Backend Development Mastery", slug: "backend-development-mastery" },
      { name: "Mobile App Development Mastery (React Native)", slug: "mobile-app-development-mastery-react-native" },
      { name: "Cloud Computing & DevOps Mastery (AWS, Azure, Google Cloud)", slug: "cloud-computing-devops-mastery-aws-azure-gcp" },
      { name: "Cybersecurity & Ethical Hacking", slug: "cybersecurity-and-ethical-hacking" },
      { name: "Data Science & Analytics", slug: "data-science-and-analytics" },
      { name: "Blockchain Development Fundamentals", slug: "blockchain-development-fundamentals" },
      { name: "Quantum Computing Basics", slug: "quantum-computing-basics" },
      { name: "Tableau & Power BI for Data Visualization", slug: "tableau-powerbi-for-data-visualization" },
      { name: "Data Structures & Algorithms Mastery", slug: "data-structures-and-algorithms-mastery" },
    ],
  },
  {
    title: "Gradus Finlit",
    anchor: "/our-courses?programme=gradus-finlit",
    courses: [
      {
        name: "Finance and Market Excellence Programme",
        slug: "finance-and-market-excellence-programme",
        flagship: true,
        flagshipTone: "finlit",
      },
      "Derivatives Mastery",
      "Forex Market Mastery",
      "Technical Analysis",
    ],
  },
  {
    title: "Gradus Lead",
    anchor: "/our-courses?programme=gradus-lead",
    courses: ["NISM Certification"],
  },
];

export default PROGRAMMES;
