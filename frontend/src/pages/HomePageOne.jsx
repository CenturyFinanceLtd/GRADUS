import { useEffect } from "react";
import BannerOne from "../components/BannerOne";
import CounterTwo from "../components/CounterTwo";
import ProgrammesAndCourses from "../components/home/ProgrammesAndCourses";
import ByCflAndPartners from "../components/home/ByCflAndPartners";
import VideoTestimonials from "../components/home/VideoTestimonials";
import CourseInsight from "../components/home/CourseInsight";
import WhyGradusVideo from "../components/home/WhyGradusVideo";
import ExpertVideos from "../components/home/ExpertVideos";
import WhyGradusComparison from "../components/home/WhyGradusComparison";
import FooterOne from "../components/FooterOne";
import HeaderOne from "../components/HeaderOne";
import Animation from "../helper/Animation";
import Preloader from "../helper/Preloader";

const HomePageOne = () => {
  useEffect(() => {
    const head = document.head || document.getElementsByTagName("head")[0];
    if (!head) {
      return undefined;
    }

    const scriptId = "gradus-organization-ldjson";
    const existing = head.querySelector(`#${scriptId}`);
    if (existing) {
      existing.remove();
    }

    const ldJsonScript = document.createElement("script");
    ldJsonScript.type = "application/ld+json";
    ldJsonScript.id = scriptId;
    ldJsonScript.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Gradus India",
      url: "https://gradusindia.in",
      logo: "https://gradusindia.in/assets/images/logo/logo.png",
      sameAs: [
        "https://www.facebook.com/people/Gradus/61583093960559/?sk=about",
        "https://www.instagram.com/gradusindia.in/",
        "https://www.linkedin.com/company/gradusindia/",
        "https://www.youtube.com/@gradusindia",
        "https://x.com/GradusIndia",
      ],
    });

    head.appendChild(ldJsonScript);
    return () => {
      ldJsonScript.remove();
    };
  }, []);

  return (
    <>
      {/* Preloader */}
      <Preloader />

      {/* HeaderOne */}
      <HeaderOne />

      {/* Animation */}
      <Animation />

      {/* BannerOne */}
      <BannerOne />

      {/* Why Gradus Video */}
      <WhyGradusVideo />

      {/* Programmes & Courses */}
      <ProgrammesAndCourses />

      {/* Powered by CFL + Partners (3-row carousel) */}
      <ByCflAndPartners />

      {/* Video Testimonials */}
      <VideoTestimonials />

      {/* Course Insight */}
      <CourseInsight />

      {/* Expert Videos */}
      <ExpertVideos />

      {/* CounterTwo */}
      <CounterTwo />

      {/* Why Gradus Comparison */}
      <WhyGradusComparison />

      {/* Footer */}
      <FooterOne />
    </>
  );
};

export default HomePageOne;
