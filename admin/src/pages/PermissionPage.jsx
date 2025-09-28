import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import PermissionLayer from "../components/PermissionLayer";

const PermissionPage = () => {
  return (
    <MasterLayout>
      <Breadcrumb title='Permissions' />
      <PermissionLayer />
    </MasterLayout>
  );
};

export default PermissionPage;
