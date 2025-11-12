import SignInInner from "../components/SignInInner";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import Animation from "../helper/Animation";
import Preloader from "../helper/Preloader";
import resolvePostAuthRedirect from "../utils/resolvePostAuthRedirect.js";

const SignInPage = () => {
  const { isAuthenticated, loading } = useAuth();

  if (!loading && isAuthenticated) {
    const redirectTo = resolvePostAuthRedirect({ fallback: "/" });
    return <Navigate to={redirectTo} replace />;
  }

  if (loading) {
    return <Preloader />;
  }

  return (
    <>
      {/* Preloader */}
      <Preloader />

      {/* Animation */}
      <Animation />

      {/* SignInInner */}
      <SignInInner />
    </>
  );
};

export default SignInPage;

