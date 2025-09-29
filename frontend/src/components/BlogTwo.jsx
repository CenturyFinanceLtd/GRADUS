import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Slider from "react-slick";
import apiClient, { API_BASE_URL } from "../services/apiClient";

const ASSET_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, "");
const FALLBACK_IMAGE = "/assets/images/thumbs/blog-two-img1.png";

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

const formatExcerpt = (blog) => {
  const raw = blog.excerpt?.trim() || blog.content?.replace(/<[^>]+>/g, "").trim() || "";
  if (!raw) {
    return "";
  }
  return raw.length > 150 ? `${raw.slice(0, 147).trimEnd()}...` : raw;
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
    author: blog.author || "Admin",
    views: formatCompactNumber(blog.meta?.views ?? 0),
    comments: formatCompactNumber(blog.meta?.comments ?? 0),
    excerpt: formatExcerpt(blog),
    day,
    month,
    featuredImage,
  };
};

const BlogTwo = () => {
  const sliderRef = useRef(null);
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchBlogs = async () => {
      setLoading(true);
      setError(null);

      try {
        const { items } = await apiClient.get("/blogs?limit=8");
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
  const canSlide = formattedBlogs.length > 1;

  const sliderSettings = useMemo(
    () => ({
      slidesToShow: Math.min(3, Math.max(formattedBlogs.length, 1)),
      slidesToScroll: 1,
      autoplay: false,
      autoplaySpeed: 2000,
      speed: 900,
      dots: false,
      pauseOnHover: true,
      arrows: false,
      draggable: true,
      infinite: formattedBlogs.length > 3,
      responsive: [
        {
          breakpoint: 1299,
          settings: {
            slidesToShow: Math.min(2, Math.max(formattedBlogs.length, 1)),
            arrows: false,
          },
        },
        {
          breakpoint: 767,
          settings: {
            slidesToShow: Math.min(2, Math.max(formattedBlogs.length, 1)),
            arrows: false,
          },
        },
        {
          breakpoint: 575,
          settings: {
            slidesToShow: 1,
            arrows: false,
          },
        },
      ],
    }),
    [formattedBlogs.length]
  );

  return (
    <section className='blog-two py-120 bg-main-25'>
      <div className='container'>
        <div className='section-heading text-center'>
          <div className='flex-align d-inline-flex gap-8 mb-16 wow bounceInDown'>
            <span className='text-main-600 text-2xl d-flex'>
              <i className='ph-bold ph-book-open' />
            </span>
            <h5 className='text-main-600 mb-0'>Latest News</h5>
          </div>
          <h2 className='mb-24 wow bounceIn'>Stay Informed, Stay Inspired</h2>
          <p className=' wow bounceInUp'>
            Welcome to our blog, where we share insights, stories, and updates
            on topics ranging from education
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
          <>
            <Slider ref={sliderRef} {...sliderSettings} className='blog-two-slider'>
              {formattedBlogs.map((blog, index) => {
                const duration = 200 + index * 200;
                return (
                  <div
                    key={blog.id || blog.slug || index}
                    className='scale-hover-item bg-white rounded-16 p-12 h-100'
                    data-aos='fade-up'
                    data-aos-duration={duration}
                  >
                    <div className='course-item__thumb rounded-12 overflow-hidden position-relative'>
                      <Link to={`/blogs/${blog.slug}`} className='w-100 h-100 d-block'>
                        <img
                          src={blog.featuredImage}
                          alt={blog.title}
                          className='scale-hover-item__img rounded-12 cover-img transition-2'
                        />
                      </Link>
                      <div className='position-absolute inset-inline-end-0 inset-block-end-0 me-16 mb-16 py-12 px-24 rounded-8 bg-main-three-600 text-white fw-medium text-center'>
                        <h3 className='mb-0 text-white fw-medium'>{blog.day}</h3>
                        {blog.month}
                      </div>
                    </div>
                    <div className='pt-32 pb-24 px-16 position-relative'>
                      <h4 className='mb-28'>
                        <Link to={`/blogs/${blog.slug}`} className='link text-line-2'>
                          {blog.title}
                        </Link>
                      </h4>
                      <div className='flex-align gap-14 flex-wrap my-20'>
                        <div className='flex-align gap-8'>
                          <span className='text-neutral-500 text-2xl d-flex'>
                            <i className='ph ph-user-circle' />
                          </span>
                          <span className='text-neutral-500 text-lg'>By {blog.author}</span>
                        </div>
                        <span className='w-8 h-8 bg-neutral-100 rounded-circle' />
                        <div className='flex-align gap-8'>
                          <span className='text-neutral-500 text-2xl d-flex'>
                            <i className='ph-bold ph-eye' />
                          </span>
                          <span className='text-neutral-500 text-lg'>{blog.views}</span>
                        </div>
                        <span className='w-8 h-8 bg-neutral-100 rounded-circle' />
                        <div className='flex-align gap-8'>
                          <span className='text-neutral-500 text-2xl d-flex'>
                            <i className='ph ph-chat-dots' />
                          </span>
                          <span className='text-neutral-500 text-lg'>{blog.comments}</span>
                        </div>
                      </div>
                      <p className='text-neutral-500 text-line-2 mb-20'>{blog.excerpt}</p>
                      <div className='flex-between gap-8 pt-24 border-top border-neutral-50 mt-28 border-dashed border-0'>
                        <Link
                          to={`/blogs/${blog.slug}`}
                          className='flex-align gap-8 text-main-600 hover-text-decoration-underline transition-1 fw-semibold'
                          tabIndex={0}
                        >
                          Read More
                          <i className='ph ph-arrow-right' />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </Slider>
            <div className='flex-align gap-16 mt-40 justify-content-center'>
              <button
                type='button'
                id='blog-two-prev'
                onClick={() => sliderRef.current?.slickPrev()}
                className='slick-arrow flex-center rounded-circle border border-gray-100 hover-border-main-600 text-xl hover-bg-main-600 hover-text-white transition-1 w-48 h-48'
                disabled={!canSlide}
              >
                <i className='ph ph-caret-left' />
              </button>
              <button
                type='button'
                id='blog-two-next'
                onClick={() => sliderRef.current?.slickNext()}
                className='slick-arrow flex-center rounded-circle border border-gray-100 hover-border-main-600 text-xl hover-bg-main-600 hover-text-white transition-1 w-48 h-48'
                disabled={!canSlide}
              >
                <i className='ph ph-caret-right' />
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default BlogTwo;
