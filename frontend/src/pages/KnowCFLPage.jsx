import Breadcrumb from "../components/Breadcrumb";
import FooterOne from "../components/FooterOne";
import HeaderOne from "../components/HeaderOne";
import KnowCFL from "../components/KnowCFL";
import Animation from "../helper/Animation";
import Preloader from "../helper/Preloader";

const KnowCFLPage = () => {
  return (
    <>
      <Preloader />
      <Animation />
      <HeaderOne />
      <Breadcrumb title={'Know MDM MADHUBANI TECHNOLOGIES PRIVATE LIMITED'} />
      <KnowCFL />
      <FooterOne />
    </>
  );
};

export default KnowCFLPage;
