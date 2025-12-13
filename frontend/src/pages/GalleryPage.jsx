import Breadcrumb from "../components/Breadcrumb";
import CertificateOne from "../components/CertificateOne";
import FooterOne from "../components/FooterOne";
import GallerySection from "../components/GallerySection";
import GalleryHeroSection from "../components/GalleryHeroSection";
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

      {/* GalleryHeroSection */}
      <GalleryHeroSection />

      {/* GallerySection */}
      <GallerySection />

      {/* CertificateOne */}
      <CertificateOne />

      {/* FooterOne */}
      <FooterOne />
    </>
  );
};

export default GalleryPage;
