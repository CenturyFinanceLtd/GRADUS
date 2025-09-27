import Breadcrumb from "../components/Breadcrumb";
import CertificateOne from "../components/CertificateOne";
import FooterOne from "../components/FooterOne";
import HeaderOne from "../components/HeaderOne";
import InvestorsContent from "../components/privacy/InvestorsContent";
import Animation from "../helper/Animation";
import Preloader from "../helper/Preloader";

const InvestorsPrivacyPage = () => {
  return (
    <>
      <Preloader />
      <Animation />
      <HeaderOne />
      <Breadcrumb title={"Investors"} />
      <InvestorsContent />
      <CertificateOne />
      <FooterOne />
    </>
  );
};

export default InvestorsPrivacyPage;
