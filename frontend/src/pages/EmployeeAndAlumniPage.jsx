import Breadcrumb from "../components/Breadcrumb";
import CertificateOne from "../components/CertificateOne";
import FooterOne from "../components/FooterOne";
import HeaderOne from "../components/HeaderOne";
import EmployeeAndAlumniContent from "../components/privacy/EmployeeAndAlumniContent";
import Animation from "../helper/Animation";
import Preloader from "../helper/Preloader";

const EmployeeAndAlumniPage = () => {
  return (
    <>
      <Preloader />
      <Animation />
      <HeaderOne />
      <Breadcrumb title={"Employee and Alumni"} />
      <EmployeeAndAlumniContent />
      <CertificateOne />
      <FooterOne />
    </>
  );
};

export default EmployeeAndAlumniPage;
