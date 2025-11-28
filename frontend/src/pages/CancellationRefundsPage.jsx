import Breadcrumb from "../components/Breadcrumb";
import CertificateOne from "../components/CertificateOne";
import FooterOne from "../components/FooterOne";
import HeaderOne from "../components/HeaderOne";
import CancellationRefundsContent from "../components/policies/CancellationRefundsContent";
import Animation from "../helper/Animation";
import Preloader from "../helper/Preloader";

const CancellationRefundsPage = () => {
  return (
    <>
      <Preloader />
      <Animation />
      <HeaderOne />
      <Breadcrumb title={"Cancellation and Refunds"} />
      <CancellationRefundsContent />
      <CertificateOne />
      <FooterOne />
    </>
  );
};

export default CancellationRefundsPage;
