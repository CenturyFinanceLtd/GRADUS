import AboutOne from "../components/AboutOne";
import ByCflAndPartners from "../components/home/ByCflAndPartners";
import Breadcrumb from "../components/Breadcrumb";
import CertificateOne from "../components/CertificateOne";
import ChooseUsOne from "../components/ChooseUsOne";
import CounterOne from "../components/CounterOne";
import FooterOne from "../components/FooterOne";
import HeaderOne from "../components/HeaderOne";
import GradusProgrammes from "../components/home/GradusProgrammes";
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

      {/* Gradus Programmes */}
      <GradusProgrammes />

      {/* ChooseUsOne */}
      <ChooseUsOne />

      {/* CounterOne */}
      <CounterOne />

      {/* TestimonialsOne */}
      <TestimonialsThree />

      {/* Powered by CFL + Partners */}
      <ByCflAndPartners />

      {/* CertificateOne */}
      <CertificateOne />

      {/* FooterOne */}
      <FooterOne />
    </>
  );
};

export default AboutPage;
