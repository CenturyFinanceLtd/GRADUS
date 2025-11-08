import AboutThree from "../components/AboutThree";
import BannerOne from "../components/BannerOne";
import BlogTwo from "../components/BlogTwo";
import ChooseUsTwo from "../components/ChooseUsTwo";
import CounterTwo from "../components/CounterTwo";
import GradusProgrammes from "../components/home/GradusProgrammes";
import ByCflAndPartners from "../components/home/ByCflAndPartners";
import VideoTestimonials from "../components/home/VideoTestimonials";
import FooterOne from "../components/FooterOne";
import HeaderOne from "../components/HeaderOne";
import InfoTwo from "../components/InfoTwo";
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

      {/* InfoTwo */}
      <InfoTwo />

      {/* Gradus Programmes */}
      <GradusProgrammes />

      {/* Powered by CFL + Partners (3-row carousel) */}
      <ByCflAndPartners />

      {/* Video Testimonials */}
      <VideoTestimonials />


      {/* AboutThree */}
      <AboutThree />

     

      {/* CounterTwo */}
      <CounterTwo />

      

      {/* ChooseUsTwo */}
      <ChooseUsTwo />

      

      

      {/* BlogTwo */}
      <BlogTwo />

      

      {/* Footer */}
      <FooterOne />
    </>
  );
};

export default HomePageOne;
