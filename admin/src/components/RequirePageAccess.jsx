/* eslint-disable react/prop-types */
import { Navigate, useLocation } from "react-router-dom";
import useAuth from "../hook/useAuth";

const normalizeRole = (role) => (role ? String(role).toLowerCase() : "");

const RequirePageAccess = ({ pageKey, children, fallbackPath = "/access-denied" }) => {
  const { token, loading, admin, permissions, permissionsLoading } = useAuth();
  const location = useLocation();

  if (loading || permissionsLoading) {
    return (
      <section className='overlay'>
        <div className='d-flex align-items-center justify-content-center min-vh-100'>
          <div className='spinner-border text-primary' role='status'>
            <span className='visually-hidden'>Loading...</span>
          </div>
        </div>
      </section>
    );
  }

  if (!token) {
    return <Navigate to='/sign-in' state={{ from: location }} replace />;
  }

  const normalizedRole = normalizeRole(admin?.role);

  if (normalizedRole === "programmer_admin") {
    return children;
  }

  const allowedPages = Array.isArray(permissions?.allowedPages)
    ? permissions.allowedPages
    : [];

  if (allowedPages.includes("*")) {
    return children;
  }

  if (pageKey && allowedPages.includes(pageKey)) {
    return children;
  }

  return <Navigate to={fallbackPath} state={{ from: location }} replace />;
};

export default RequirePageAccess;
