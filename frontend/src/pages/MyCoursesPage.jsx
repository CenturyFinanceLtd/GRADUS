import Breadcrumb from "../components/Breadcrumb";
import CertificateOne from "../components/CertificateOne";
import MyCoursesInner from "../components/MyCoursesInner";
import FooterOne from "../components/FooterOne";
import HeaderOne from "../components/HeaderOne";
import Animation from "../helper/Animation";
import Preloader from "../helper/Preloader";

const MyCoursesPage = () => {
  return (
    <>
      {/* Preloader */}
      <Preloader />

      {/* Animation */}
      <Animation />

      {/* HeaderTwo */}
      <HeaderOne />

      {/* Breadcrumb */}
      <Breadcrumb title={"My Courses"} />

      {/* MyCoursesInner */}
      <MyCoursesInner />

      {/* CertificateOne */}
      <CertificateOne />

      {/* FooterOne */}
      <FooterOne />
    </>
  );
};

export default MyCoursesPage;
