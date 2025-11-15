import BannerOne from "../components/BannerOne";
import CounterTwo from "../components/CounterTwo";
import ProgrammesAndCourses from "../components/home/ProgrammesAndCourses";
import ByCflAndPartners from "../components/home/ByCflAndPartners";
import VideoTestimonials from "../components/home/VideoTestimonials";
import WhyGradusVideo from "../components/home/WhyGradusVideo";
import ExpertVideos from "../components/home/ExpertVideos";
import GradusAmbition from "../components/home/GradusAmbition";
import WhyGradusComparison from "../components/home/WhyGradusComparison";
import FooterOne from "../components/FooterOne";
import HeaderOne from "../components/HeaderOne";
import Animation from "../helper/Animation";
import Preloader from "../helper/Preloader";

const HomePageOne = () => {
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

      {/* Expert Videos */}
      <ExpertVideos />

      {/* Gradus Ambition */}
      <GradusAmbition />

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
