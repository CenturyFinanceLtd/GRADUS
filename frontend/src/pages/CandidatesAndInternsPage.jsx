import Breadcrumb from "../components/Breadcrumb";
import CertificateOne from "../components/CertificateOne";
import FooterOne from "../components/FooterOne";
import HeaderOne from "../components/HeaderOne";
import CandidatesAndInternsContent from "../components/privacy/CandidatesAndInternsContent";
import Animation from "../helper/Animation";
import Preloader from "../helper/Preloader";

const CandidatesAndInternsPage = () => {
  return (
    <>
      <Preloader />
      <Animation />
      <HeaderOne />
      <Breadcrumb title={"Candidates and Interns"} />
      <CandidatesAndInternsContent />
      <CertificateOne />
      <FooterOne />
    </>
  );
};

export default CandidatesAndInternsPage;
