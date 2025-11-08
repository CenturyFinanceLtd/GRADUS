import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import BlogDetailsInner from "../components/BlogDetailsInner";
import Breadcrumb from "../components/Breadcrumb";
import CertificateOne from "../components/CertificateOne";
import FooterOne from "../components/FooterOne";
import HeaderOne from "../components/HeaderOne";
import Animation from "../helper/Animation";
import Preloader from "../helper/Preloader";

const PUBLIC_SITE_URL = (import.meta.env.VITE_PUBLIC_SITE_URL || "").replace(/\/$/, "");

const BlogDetailsPage = () => {
  const { slug } = useParams();
  const [breadcrumbTitle, setBreadcrumbTitle] = useState("Blog Details");
  const [redirecting, setRedirecting] = useState(false);

  const handleBlogLoaded = (blog) => {
    if (blog && blog.title) {
      setBreadcrumbTitle(blog.title);
    } else {
      setBreadcrumbTitle("Blog Details");
    }
  };

  useEffect(() => {
    if (!slug || !PUBLIC_SITE_URL) {
      return;
    }

    const hostname = window.location.hostname;
    const isLocalHost = hostname === "localhost" || hostname === "127.0.0.1";

    if (isLocalHost) {
      setRedirecting(true);
      window.location.replace(`${PUBLIC_SITE_URL}/blogs/${slug}`);
    }
  }, [slug]);

  if (redirecting) {
    return (
      <>
        <Preloader />
      </>
    );
  }

  return (
    <>
      {/* Preloader */}
      <Preloader />

      {/* Animation */}
      <Animation />

      {/* HeaderOne */}
      <HeaderOne />

      {/* Breadcrumb */}
      <Breadcrumb title={breadcrumbTitle} />

      {/* BlogDetailsInner */}
      <BlogDetailsInner onBlogLoaded={handleBlogLoaded} />

      {/* CertificateOne */}
      <CertificateOne />

      {/* FooterOne */}
      <FooterOne />
    </>
  );
};

export default BlogDetailsPage;
