import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import UsersGridLayer from "../components/UsersGridLayer";

const UsersGridPage = () => {
  return (
    <>
      {/* MasterLayout */}
      <MasterLayout>
        {/* Breadcrumb */}
        <Breadcrumb title='Admin Users Grid' />

        {/* UsersGridLayer */}
        <UsersGridLayer />
      </MasterLayout>
    </>
  );
};

export default UsersGridPage;
