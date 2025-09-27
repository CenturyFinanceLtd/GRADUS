import { useState } from "react";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import BlogDetailsLayer from "../components/BlogDetailsLayer";

const BlogDetailsPage = () => {
  const [breadcrumbTitle, setBreadcrumbTitle] = useState("Blog Details");

  const handleBlogLoaded = (blog) => {
    setBreadcrumbTitle(blog?.title || "Blog Details");
  };

  return (
    <MasterLayout>
      <Breadcrumb title={breadcrumbTitle} />
      <BlogDetailsLayer onBlogLoaded={handleBlogLoaded} />
    </MasterLayout>
  );
};

export default BlogDetailsPage;
