import Breadcrumb from "../components/Breadcrumb";
import CertificateOne from "../components/CertificateOne";
import FooterOne from "../components/FooterOne";
import HeaderOne from "../components/HeaderOne";
import VisitorPolicyContent from "../components/privacy/VisitorPolicyContent";
import Animation from "../helper/Animation";
import Preloader from "../helper/Preloader";

const VisitorPolicyPage = () => {
  return (
    <>
      <Preloader />
      <Animation />
      <HeaderOne />
      <Breadcrumb title={"Visitor Policy"} />
      <VisitorPolicyContent />
      <CertificateOne />
      <FooterOne />
    </>
  );
};

export default VisitorPolicyPage;
