import { useEffect } from "react";
import BannerOne from "../components/BannerOne";
import CounterTwo from "../components/CounterTwo";
import ProgrammesAndCourses from "../components/home/ProgrammesAndCourses";
import ByGradusAndPartners from "../components/home/ByGradusAndPartners";
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

  return (
    <div className='home-page'>
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
      <ByGradusAndPartners />

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
    </div>
  );
};

export default HomePageOne;
