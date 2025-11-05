import Breadcrumb from "../components/Breadcrumb";
import CertificateOne from "../components/CertificateOne";
import OurCoursesListView from "../components/ourCourses/OurCoursesListView.jsx";
import FooterOne from "../components/FooterOne";
import HeaderOne from "../components/HeaderOne";
import Animation from "../helper/Animation";
import Preloader from "../helper/Preloader";

const CourseListViewPage = () => {
  return (
    <>
      {/* Preloader */}
      <Preloader />

      {/* Animation */}
      <Animation />

      {/* HeaderTwo */}
      <HeaderOne />

      {/* Breadcrumb */}
      <Breadcrumb title={"Our Courses"} />

      {/* Course list (dynamic from our Programmes) */}
      <OurCoursesListView />

      {/* CertificateOne */}
      <CertificateOne />

      {/* FooterOne */}
      <FooterOne />
    </>
  );
};

export default CourseListViewPage;
