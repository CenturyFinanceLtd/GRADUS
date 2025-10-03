import Breadcrumb from "../components/Breadcrumb";
import FooterOne from "../components/FooterOne";
import HeaderOne from "../components/HeaderOne";
import ForgotPasswordInner from "../components/ForgotPasswordInner";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import Animation from "../helper/Animation";
import Preloader from "../helper/Preloader";

const ForgotPasswordPage = () => {
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

      {/* Header */}
      <HeaderOne />

      {/* Breadcrumb */}
      <Breadcrumb title={"Forgot Password"} />

      {/* ForgotPasswordInner */}
      <ForgotPasswordInner />

      {/* Footer */}
      <FooterOne />
    </>
  );
};

export default ForgotPasswordPage;
