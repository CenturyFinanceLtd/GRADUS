import Breadcrumb from "../components/Breadcrumb";
import FooterOne from "../components/FooterOne";
import HeaderOne from "../components/HeaderOne";
import SignUpInner from "../components/SignUpInner";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import Animation from "../helper/Animation";
import Preloader from "../helper/Preloader";

const SignUpPage = () => {
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
      <Breadcrumb title={"Sign Up"} />

      {/* SignUpInner */}
      <SignUpInner />

      {/* FooterOne */}
      <FooterOne />
    </>
  );
};

export default SignUpPage;

