import { useEffect, lazy, Suspense } from "react";
import BannerOne from "../components/BannerOne";
import CounterTwo from "../components/CounterTwo";
import ProgrammesAndCourses from "../components/home/ProgrammesAndCourses";
import ByCflAndPartners from "../components/home/ByCflAndPartners";
import WhyGradusVideo from "../components/home/WhyGradusVideo";

import FooterOne from "../components/FooterOne";
import HeaderOne from "../components/HeaderOne";
import Animation from "../helper/Animation";
import Preloader from "../helper/Preloader";

const VideoTestimonials = lazy(() => import("../components/home/VideoTestimonials"));
const CourseInsight = lazy(() => import("../components/home/CourseInsight"));
const ExpertVideos = lazy(() => import("../components/home/ExpertVideos"));
const WhyGradusComparison = lazy(() => import("../components/home/WhyGradusComparison"));

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
      <ByCflAndPartners />

      {/* Video Testimonials */}
      <Suspense fallback={<div className="container py-8 text-center text-muted">Loading testimonials...</div>}>
        <VideoTestimonials />
      </Suspense>

      {/* Course Insight */}
      <Suspense fallback={null}>
        <CourseInsight />
      </Suspense>

      {/* Expert Videos */}
      <Suspense fallback={<div className="container py-8 text-center text-muted">Loading expert videos...</div>}>
        <ExpertVideos />
      </Suspense>



      {/* CounterTwo */}
      <CounterTwo />

      {/* Why Gradus Comparison */}
      <Suspense fallback={null}>
        <WhyGradusComparison />
      </Suspense>

      {/* Footer */}
      <FooterOne />
    </div>
  );
};

export default HomePageOne;
