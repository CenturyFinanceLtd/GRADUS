import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import WebsiteUsersListLayer from "../components/WebsiteUsersListLayer";

const WebsiteUsersPage = () => {
  return (
    <>
      <MasterLayout>
        <Breadcrumb title='Website Users' />
        <WebsiteUsersListLayer />
      </MasterLayout>
    </>
  );
};

export default WebsiteUsersPage;
