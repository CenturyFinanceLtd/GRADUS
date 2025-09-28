import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import CourseManager from "../components/CourseManager";

const CourseManagementPage = () => {
  return (
    <MasterLayout>
      <Breadcrumb title='Courses' />
      <CourseManager />
    </MasterLayout>
  );
};

export default CourseManagementPage;
