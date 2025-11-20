/* eslint-disable react/prop-types */
import { Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import useAuth from "../hook/useAuth";

const EMAIL_WHITELIST = ["dvisro13@gmail.com", "devnishantsingh25@gmail.com"];
const EMAIL_UNLOCK_STORAGE_KEY = "gradus_email_access_unlocked";

const getUnlockState = () => {
  if (typeof window === "undefined") {
    return false;
  }
  return localStorage.getItem(EMAIL_UNLOCK_STORAGE_KEY) === "true";
};

const RequireProgrammerEmailAccess = ({ children, fallbackPath = "/access-denied" }) => {
  const { token, loading, admin } = useAuth();
  const location = useLocation();
  const [isUnlocked, setIsUnlocked] = useState(getUnlockState);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleStorage = (event) => {
      if (event.key === EMAIL_UNLOCK_STORAGE_KEY) {
        setIsUnlocked(event.newValue === "true");
      }
    };
    const handleCustomUnlock = () => setIsUnlocked(true);

    window.addEventListener("storage", handleStorage);
    window.addEventListener("gradus-email-unlocked", handleCustomUnlock);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("gradus-email-unlocked", handleCustomUnlock);
    };
  }, []);

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
  const hasAccess =
    role === "programmer_admin" && EMAIL_WHITELIST.includes(email) && isUnlocked;

  if (hasAccess) {
    return children;
  }

  return <Navigate to={fallbackPath} state={{ from: location }} replace />;
};

export { EMAIL_WHITELIST, EMAIL_UNLOCK_STORAGE_KEY };
export default RequireProgrammerEmailAccess;
