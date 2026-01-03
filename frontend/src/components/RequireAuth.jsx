import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const RequireAuth = ({ children }) => {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to='/sign-in' state={{ from: location }} replace />;
  }

  // Enforce profile completion if required (same as mobile)
  // Commented out to allow "Skip" to work without forcing data entry
  // if (isAuthenticated && !user?.fullname && location.pathname !== '/profile-completion') {
  //   return <Navigate to='/profile-completion' replace />;
  // }

  return children;
};

export default RequireAuth;
