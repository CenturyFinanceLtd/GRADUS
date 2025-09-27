import Breadcrumb from "../components/Breadcrumb";
import CertificateOne from "../components/CertificateOne";
import FooterOne from "../components/FooterOne";
import HeaderOne from "../components/HeaderOne";
import VendorsContent from "../components/privacy/VendorsContent";
import Animation from "../helper/Animation";
import Preloader from "../helper/Preloader";

const VendorsPrivacyPage = () => {
  return (
    <>
      <Preloader />
      <Animation />
      <HeaderOne />
      <Breadcrumb title={"Vendors"} />
      <VendorsContent />
      <CertificateOne />
      <FooterOne />
    </>
  );
};

export default VendorsPrivacyPage;
