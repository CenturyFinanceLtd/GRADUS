import { useState } from "react";
import BlogDetailsInner from "../components/BlogDetailsInner";
import Breadcrumb from "../components/Breadcrumb";
import CertificateOne from "../components/CertificateOne";
import FooterOne from "../components/FooterOne";
import HeaderOne from "../components/HeaderOne";
import Animation from "../helper/Animation";
import Preloader from "../helper/Preloader";

const BlogDetailsPage = () => {
  const [breadcrumbTitle, setBreadcrumbTitle] = useState("Blog Details");

  const handleBlogLoaded = (blog) => {
    if (blog && blog.title) {
      setBreadcrumbTitle(blog.title);
    } else {
      setBreadcrumbTitle("Blog Details");
    }
  };

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
