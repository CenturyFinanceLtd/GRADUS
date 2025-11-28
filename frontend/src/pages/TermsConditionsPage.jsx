import Breadcrumb from "../components/Breadcrumb";
import CertificateOne from "../components/CertificateOne";
import FooterOne from "../components/FooterOne";
import HeaderOne from "../components/HeaderOne";
import TermsConditionsContent from "../components/policies/TermsConditionsContent";
import Animation from "../helper/Animation";
import Preloader from "../helper/Preloader";

const TermsConditionsPage = () => {
  return (
    <>
      <Preloader />
      <Animation />
      <HeaderOne />
      <Breadcrumb title={"Terms and Conditions"} />
      <TermsConditionsContent />
      <CertificateOne />
      <FooterOne />
    </>
  );
};

export default TermsConditionsPage;
