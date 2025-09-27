import Breadcrumb from "../components/Breadcrumb";
import CertificateOne from "../components/CertificateOne";
import FooterOne from "../components/FooterOne";
import HeaderOne from "../components/HeaderOne";
import VisitorPrivacyNotesContent from "../components/privacy/VisitorPrivacyNotesContent";
import Animation from "../helper/Animation";
import Preloader from "../helper/Preloader";

const VisitorPrivacyNotesPage = () => {
  return (
    <>
      <Preloader />
      <Animation />
      <HeaderOne />
      <Breadcrumb title={"Visitor Privacy Notes"} />
      <VisitorPrivacyNotesContent />
      <CertificateOne />
      <FooterOne />
    </>
  );
};

export default VisitorPrivacyNotesPage;
