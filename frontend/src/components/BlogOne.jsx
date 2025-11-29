import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import apiClient, { API_BASE_URL } from "../services/apiClient";

const ASSET_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, "");
const FALLBACK_IMAGE = "/assets/images/thumbs/blog-img1.png";

const formatDateParts = (value) => {
  if (!value) {
    return { day: "--", month: "" };
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { day: "--", month: "" };
  }
  return {
    day: date.toLocaleString("en-US", { day: "2-digit" }),
    month: date.toLocaleString("en-US", { month: "short" }).toUpperCase(),
  };
};

const formatFullDate = (value) => {
  if (!value) {
    return "--";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }
  const day = date.toLocaleString("en-US", { day: "2-digit" });
  const month = date.toLocaleString("en-US", { month: "short" });
  const year = date.toLocaleString("en-US", { year: "2-digit" });
  return `${day} ${month}, ${year}`;
};

const formatExcerpt = (blog) => {
  const raw = blog.excerpt?.trim() || blog.content?.replace(/<[^>]+>/g, "").trim() || "";
  if (!raw) {
    return "";
  }
  return raw.length > 140 ? `${raw.slice(0, 137).trimEnd()}...` : raw;
};

const formatCompactNumber = (value) => {
  const numeric = Number(value || 0);
  if (Number.isNaN(numeric)) {
    return "0";
  }
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(numeric);
};

const normalizeBlog = (blog) => {
  const published = blog.publishedAt || blog.createdAt;
  const { day, month } = formatDateParts(published);
  const featuredImage = blog.featuredImage
    ? blog.featuredImage.startsWith("http")
      ? blog.featuredImage
      : `${ASSET_BASE_URL}${blog.featuredImage}`
    : FALLBACK_IMAGE;

  return {
    id: blog._id,
    slug: blog.slug,
    title: blog.title,
    category: blog.category || "General",
    author: blog.author || "Admin",
    views: formatCompactNumber(blog.meta?.views ?? 0),
    comments: formatCompactNumber(blog.meta?.comments ?? 0),
    excerpt: formatExcerpt(blog),
    day,
    month,
    formattedDate: formatFullDate(published),
    featuredImage,
  };
};

const BlogOne = () => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchBlogs = async () => {
      setLoading(true);
      setError(null);

      try {
        const { items } = await apiClient.get("/blogs?limit=3");
        if (!isMounted) {
          return;
        }
        setBlogs(items || []);
      } catch (err) {
        if (!isMounted) {
          return;
        }
        setError(err?.message || "Failed to load blogs.");
        setBlogs([]);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchBlogs();

    return () => {
      isMounted = false;
    };
  }, []);

  const formattedBlogs = useMemo(() => blogs.map((blog) => normalizeBlog(blog)), [blogs]);

  return (
    <section className='blog py-120 mash-bg-main mash-bg-main-two position-relative'>
      <img
        src='/assets/images/shapes/shape2.png'
        alt=''
        className='shape two animation-scalation'
      />
      <img
        src='/assets/images/shapes/shape6.png'
        alt=''
        className='shape four animation-scalation'
      />
      <div className='container'>
        <div className='section-heading text-center'>
          <h2 className='mb-24 wow bounceIn'>Recent Articles</h2>
          <p className='wow bounceInUp'>
            Consectetur adipisicing elit, sed do eiusmod tempor inc idid unt ut
            labore et dolore magna aliqua enim ad...
          </p>
        </div>
        {loading ? (
          <div className='d-flex justify-content-center py-5'>
            <div className='spinner-border text-primary' role='status'>
              <span className='visually-hidden'>Loading...</span>
            </div>
          </div>
        ) : error ? (
          <div className='alert alert-danger text-center' role='alert'>
            {error}
          </div>
        ) : formattedBlogs.length === 0 ? (
          <div className='alert alert-info text-center' role='alert'>
            No blog posts available yet.
          </div>
        ) : (
          <div className='row gy-4'>
            {formattedBlogs.map((blog, index) => {
              const duration = 200 + index * 200;
              return (
                <div
                  key={blog.id || blog.slug || index}
                  className='col-lg-4 col-sm-6'
                  data-aos='fade-up'
                  data-aos-duration={duration}
                >
                  <div className='blog-item scale-hover-item bg-main-25 rounded-16 p-12 h-100 border border-neutral-30'>
                    <div className='rounded-12 overflow-hidden position-relative'>
                      <Link to={`/blog/${blog.slug}`} className='w-100 h-100 d-block'>
                        <img
                          src={blog.featuredImage}
                          alt={blog.title}
                          className='scale-hover-item__img rounded-12 cover-img transition-2'
                        />
                      </Link>
                    </div>
                    <div className='p-24 pt-32'>
                      <div>
                        <span className='px-20 py-8 bg-main-two-600 rounded-8 text-white fw-medium mb-20 d-inline-flex'>
                          {blog.category}
                        </span>
                        <h4 className='mb-28'>
                          <Link to={`/blog/${blog.slug}`} className='link text-line-2'>
                            {blog.title}
                          </Link>
                        </h4>
                        <div className='flex-align gap-14 flex-wrap my-20'>
                          <div className='flex-align gap-8'>
                            <span className='text-neutral-500 text-2xl d-flex'>
                              <i className='ph ph-user-circle' />
                            </span>
                            <span className='text-neutral-500 text-lg'>{blog.author}</span>
                          </div>
                          <span className='w-8 h-8 bg-neutral-100 rounded-circle' />
                          <div className='flex-align gap-8'>
                            <span className='text-neutral-500 text-2xl d-flex'>
                              <i className='ph ph-calendar-dot' />
                            </span>
                            <span className='text-neutral-500 text-lg'>{blog.formattedDate}</span>
                          </div>
                          <span className='w-8 h-8 bg-neutral-100 rounded-circle' />
                          <div className='flex-align gap-8'>
                            <span className='text-neutral-500 text-2xl d-flex'>
                              <i className='ph ph-chat-dots' />
                            </span>
                            <span className='text-neutral-500 text-lg'>{blog.comments}</span>
                          </div>
                        </div>
                        <p className='text-neutral-500 text-line-2'>{blog.excerpt}</p>
                      </div>
                      <div className='pt-24 border-top border-neutral-50 mt-28 border-dashed border-0'>
                        <Link
                          to={`/blog/${blog.slug}`}
                          className='flex-align gap-8 text-main-600 hover-text-decoration-underline transition-1 fw-semibold'
                          tabIndex={0}
                        >
                          Read More
                          <i className='ph ph-arrow-right' />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default BlogOne;
