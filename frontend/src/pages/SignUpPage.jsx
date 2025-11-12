import SignUpInner from "../components/SignUpInner";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import Animation from "../helper/Animation";
import Preloader from "../helper/Preloader";
import resolvePostAuthRedirect from "../utils/resolvePostAuthRedirect.js";

const SignUpPage = () => {
  const { isAuthenticated, loading } = useAuth();

  if (!loading && isAuthenticated) {
    const redirectTo = resolvePostAuthRedirect({ fallback: "/" });
    return <Navigate to={redirectTo} replace />;
  }

  if (loading) {
    return <Preloader />;
  }

  return (
    <div className="signup-minimal-page position-relative">
      <Preloader />
      <Animation />
      <SignUpInner />
    </div>
  );
};

export default SignUpPage;

