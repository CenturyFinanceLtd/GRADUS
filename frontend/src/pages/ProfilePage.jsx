import Breadcrumb from "../components/Breadcrumb";
import FooterOne from "../components/FooterOne";
import HeaderOne from "../components/HeaderOne";
import ProfileInner from "../components/ProfileInner";
import Animation from "../helper/Animation";
import Preloader from "../helper/Preloader";

const ProfilePage = () => {
  return (
    <>
      <Preloader />
      <Animation />
      <HeaderOne />
      <Breadcrumb title={'My Profile'} />
      <ProfileInner />
      <FooterOne />
    </>
  );
};

export default ProfilePage;
