import { useEffect, useMemo, useState } from "react";
import CourseSeriesOverview from "../ourCourses/CourseSeriesOverview";
import { fetchCoursePage } from "../../services/courseService";
import { useAuth } from "../../context/AuthContext";

const FALLBACK_HERO = {
  tagIcon: "ph-bold ph-graduation-cap",
  tagText: "Gradus Series Overview",
  title: "Build Your Future with Gradus Course Series",
  description:
    "Each flagship program is crafted by Gradus India to combine industry credibility, immersive project work, and assured career outcomes through our placement assurance MoUs.",
};

// Emergency fallback courses used only if API fails or returns empty
const FALLBACK_COURSES = [
  {
    id: "gradusquity",
    name: "GradusQuity",
    subtitle: "By Gradus India (a 100% Subsidiary of MDM MADHUBANI TECHNOLOGIES PRIVATE LIMITED)",
    focus:
      "Financial markets mastery designed for future-ready equity, debt, and advanced instrument professionals.",
    approvals: [
      "GradusQuity is approved by Skill India & NSDC.",
      "MoU with each student for Assured Placement.",
    ],
    placementRange:
      "Assured placement on package of 6 lac/Annum to 14 lac/Annum with our partnered companies.",
    price: "₹63700",
  },
  {
    id: "gradusx",
    name: "GradusX",
    subtitle: "By Gradus India (a 100% Subsidiary of MDM MADHUBANI TECHNOLOGIES PRIVATE LIMITED)",
    focus:
      "Full-stack technology, AI, and digital growth curriculum that unites software engineering with data storytelling.",
    approvals: [
      "GradusX is approved by Skill India & NSDC.",
      "MoU with each student for Assured Placement.",
    ],
    placementRange:
      "Assured placement on package of 6 lac/Annum to 14 lac/Annum with our partnered companies.",
    price: "₹63700",
  },
  {
    id: "graduslead",
    name: "GradusLead",
    subtitle: "By Gradus India (a 100% Subsidiary of MDM MADHUBANI TECHNOLOGIES PRIVATE LIMITED)",
    focus:
      "Business and leadership journey that cultivates emerging CXOs with finance, strategy, and people excellence.",
    approvals: [
      "GradusLead is approved by Skill India & NSDC.",
      "MoU with each student for Assured Placement.",
    ],
    placementRange:
      "Assured placement on package of 6 lac/Annum to 14 lac/Annum with our partnered companies.",
    price: "₹63700",
  },
];

const HomeCourseSeriesOverview = () => {
  const { token } = useAuth();
  const [content, setContent] = useState({ hero: FALLBACK_HERO, courses: [] });

  useEffect(() => {
    let isMounted = true;

    const loadCourses = async () => {
      try {
        const response = await fetchCoursePage(token ? { token } : undefined);
        if (!isMounted) {
          return;
        }

        const hero = response?.hero ?? FALLBACK_HERO;
        const courses = Array.isArray(response?.courses) && response.courses.length
          ? response.courses
          : FALLBACK_COURSES;

        setContent({ hero, courses });
      } catch {
        if (!isMounted) {
          return;
        }

        setContent({ hero: FALLBACK_HERO, courses: FALLBACK_COURSES });
      }
    };

    loadCourses();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const featuredCourses = useMemo(() => {
    const list = Array.isArray(content.courses) ? content.courses : FALLBACK_COURSES;
    return list.slice(0, 3);
  }, [content.courses]);

  return (
    <CourseSeriesOverview heroContent={content.hero} courses={featuredCourses} variant="light" />
  );
};

export default HomeCourseSeriesOverview;
