import Breadcrumb from "../components/Breadcrumb";
import FooterOne from "../components/FooterOne";
import HeaderOne from "../components/HeaderOne";
import Animation from "../helper/Animation";
import Preloader from "../helper/Preloader";
import SupportInner from "../components/SupportInner";

const SupportPage = () => {
  return (
    <>
      <Preloader />
      <Animation />
      <HeaderOne />
      <Breadcrumb title={'Customer Support'} />
      <SupportInner />
      <FooterOne />
    </>
  );
};

export default SupportPage;

