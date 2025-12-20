import Breadcrumb from "../components/Breadcrumb";
import FooterOne from "../components/FooterOne";
import WeAreGradus from "../components/WeAreGradus";
import GalleryHeroSection from "../components/GalleryHeroSection";
import MeetOurTeam from "../components/MeetOurTeam";
import HeaderOne from "../components/HeaderOne";
import Animation from "../helper/Animation";
import Preloader from "../helper/Preloader";

const GalleryPage = () => {
  return (
    <>
      {/* Preloader */}
      <Preloader />

      {/* Animation */}
      <Animation />

      {/* HeaderOne */}
      <HeaderOne />

      {/* Breadcrumb */}
      <Breadcrumb title={"Gallery"} />

      {/* WeAreGradus */}
      <WeAreGradus />

      {/* MeetOurTeam */}
      <MeetOurTeam />

      {/* FooterOne */}
      <FooterOne />
    </>
  );
};

export default GalleryPage;
