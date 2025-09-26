import Breadcrumb from "../components/Breadcrumb";
import FooterOne from "../components/FooterOne";
import HeaderOne from "../components/HeaderOne";
import SignInInner from "../components/SignInInner";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import Animation from "../helper/Animation";
import Preloader from "../helper/Preloader";

const SignInPage = () => {
  const { isAuthenticated, loading } = useAuth();

  if (!loading && isAuthenticated) {
    return <Navigate to="/profile" replace />;
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

      {/* HeaderTwo */}
      <HeaderOne />

      {/* Breadcrumb */}
      <Breadcrumb title={"Sign In"} />

      {/* SignInInner */}
      <SignInInner />

      {/* FooterOne */}
      <FooterOne />
    </>
  );
};

export default SignInPage;

