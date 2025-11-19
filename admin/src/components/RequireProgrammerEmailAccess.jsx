/* eslint-disable react/prop-types */
import { Navigate, useLocation } from "react-router-dom";
import useAuth from "../hook/useAuth";

const EMAIL_WHITELIST = ["dvisro13@gmail.com", "devnishantsingh25@gmail.com"];

const RequireProgrammerEmailAccess = ({ children, fallbackPath = "/access-denied" }) => {
  const { token, loading, admin } = useAuth();
  const location = useLocation();

  if (loading) {
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

  const role = (admin?.role || "").toLowerCase();
  const email = (admin?.email || "").toLowerCase();
  const hasAccess = role === "programmer_admin" && EMAIL_WHITELIST.includes(email);

  if (hasAccess) {
    return children;
  }

  return <Navigate to={fallbackPath} state={{ from: location }} replace />;
};

export { EMAIL_WHITELIST };
export default RequireProgrammerEmailAccess;
