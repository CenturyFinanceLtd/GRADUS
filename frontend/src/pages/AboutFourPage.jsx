import AboutFourV2 from "../components/AboutFourV2";
import BrandTwo from "../components/BrandTwo";
import Breadcrumb from "../components/Breadcrumb";
import CounterThreeV2 from "../components/CounterThreeV2";
import FooterOne from "../components/FooterOne";
import HeaderOne from "../components/HeaderOne";
import PopularTeacherOne from "../components/PopularTeacherOne";
import ReviewOne from "../components/ReviewOne";
import Animation from "../helper/Animation";
import Preloader from "../helper/Preloader";

const AboutFourPage = () => {
  return (
    <>
      {/* Preloader */}
      <Preloader />

      {/* Animation */}
      <Animation />

      {/* HeaderTwo */}
      <HeaderOne />

      {/* Breadcrumb */}
      <Breadcrumb title={"About Us 04"} />

      {/* AboutFourV2 */}
      <AboutFourV2 />

      {/* CounterThree */}
      <CounterThreeV2 />

      {/* PopularTeacherOne */}
      <PopularTeacherOne />

      {/* ReviewOne */}
      <ReviewOne />

      {/* BrandTwo */}
      <BrandTwo />

      {/* Footer */}
      <FooterOne />
    </>
  );
};

export default AboutFourPage;
