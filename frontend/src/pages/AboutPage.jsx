import AboutOne from "../components/AboutOne";
import BrandTwo from "../components/BrandTwo";
import Breadcrumb from "../components/Breadcrumb";
import CertificateOne from "../components/CertificateOne";
import ChooseUsOne from "../components/ChooseUsOne";
import CounterOne from "../components/CounterOne";
import FooterOne from "../components/FooterOne";
import HeaderOne from "../components/HeaderOne";
import HomeCourseSeriesOverview from "../components/home/HomeCourseSeriesOverview";
import TestimonialsThree from "../components/TestimonialsThree";
import Animation from "../helper/Animation";
import Preloader from "../helper/Preloader";

const AboutPage = () => {
  return (
    <>
      {/* Preloader */}
      <Preloader />

      {/* Animation */}
      <Animation />

      {/* HeaderOne */}
      <HeaderOne />

      {/* Breadcrumb */}
      <Breadcrumb title={"Know Gradus"} />

      {/* AboutOne */}
      <AboutOne />

      {/* HomeCourseSeriesOverview */}
      <HomeCourseSeriesOverview />

      {/* ChooseUsOne */}
      <ChooseUsOne />

      {/* CounterOne */}
      <CounterOne />

      {/* TestimonialsOne */}
      <TestimonialsThree />

      {/* BrandTwo */}
      <BrandTwo />

      {/* CertificateOne */}
      <CertificateOne />

      {/* FooterOne */}
      <FooterOne />
    </>
  );
};

export default AboutPage;
