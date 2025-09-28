import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import EnrollmentsOverview from "../components/EnrollmentsOverview";

const EnrollmentsPage = () => {
  return (
    <MasterLayout>
      <Breadcrumb title='Enrollments' />
      <EnrollmentsOverview />
    </MasterLayout>
  );
};

export default EnrollmentsPage;
