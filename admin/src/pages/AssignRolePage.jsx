import { Navigate } from "react-router-dom";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import AssignRoleLayer from "../components/AssignRoleLayer";
import useAuth from "../hook/useAuth";

const normalizeRole = (role) => (role ? String(role).toLowerCase() : "");

const AssignRolePage = () => {
  const { admin, loading } = useAuth();
  const isProgrammerAdmin = normalizeRole(admin?.role) === "programmer_admin";

  if (!loading && !isProgrammerAdmin) {
    return <Navigate to='/' replace />;
  }

  return (
    <MasterLayout>
      <Breadcrumb title='Assign Role' />
      <AssignRoleLayer />
    </MasterLayout>
  );
};

export default AssignRolePage;
