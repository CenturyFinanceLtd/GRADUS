import Breadcrumb from "../components/Breadcrumb";
import FooterOne from "../components/FooterOne";
import HeaderOne from "../components/HeaderOne";
import CourseSeriesOverview from "../components/ourCourses/CourseSeriesOverview";
import GradusLeadSection from "../components/ourCourses/GradusLeadSection";
import GradusQuitySection from "../components/ourCourses/GradusQuitySection";
import GradusXSection from "../components/ourCourses/GradusXSection";
import Animation from "../helper/Animation";
import Preloader from "../helper/Preloader";

const OurCoursesPage = () => {
  return (
    <>
      <Preloader />
      <Animation />
      <HeaderOne />
        <Breadcrumb title={"Our Courses"} />
        <CourseSeriesOverview />
        <GradusQuitySection />
        <GradusXSection />
        <GradusLeadSection />
      <FooterOne />
    </>
  );
};

export default OurCoursesPage;
