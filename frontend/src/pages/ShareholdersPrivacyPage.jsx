import Breadcrumb from "../components/Breadcrumb";
import CertificateOne from "../components/CertificateOne";
import FooterOne from "../components/FooterOne";
import HeaderOne from "../components/HeaderOne";
import ShareholdersContent from "../components/privacy/ShareholdersContent";
import Animation from "../helper/Animation";
import Preloader from "../helper/Preloader";

const ShareholdersPrivacyPage = () => {
  return (
    <>
      <Preloader />
      <Animation />
      <HeaderOne />
      <Breadcrumb title={"Shareholders"} />
      <ShareholdersContent />
      <CertificateOne />
      <FooterOne />
    </>
  );
};

export default ShareholdersPrivacyPage;
