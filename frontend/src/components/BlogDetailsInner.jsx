import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import apiClient from "../services/apiClient";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
const ASSETS_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, "");
const FALLBACK_IMAGE = "/assets/images/thumbs/blog-details-img.png";

const formatPublishedDate = (dateString) => {
  if (!dateString) {
    return { day: "--", month: "" };
  }

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return { day: "--", month: "" };
  }

  const day = date.toLocaleDateString("en-US", { day: "2-digit" });
  const month = date.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
  return { day, month };
};

const BlogDetailsInner = ({ onBlogLoaded }) => {
  const { slug } = useParams();
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recentBlogs, setRecentBlogs] = useState([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const [recentError, setRecentError] = useState(null);
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchBlog = async () => {
      setLoading(true);
      setError(null);

      try {
        let result = null;

        if (slug) {
          result = await apiClient.get("/blogs/" + slug);
        } else {
          const { items } = await apiClient.get("/blogs?limit=1");
          result = items && items.length > 0 ? items[0] : null;
          if (!result) {
            throw new Error("No blog posts are available yet.");
          }
        }

        if (isMounted) {
          setBlog(result);
          if (typeof onBlogLoaded === "function") {
            onBlogLoaded(result);
          }
        }
      } catch (err) {
        if (isMounted) {
          const message = err && err.message ? err.message : "Failed to load blog post.";
          setError(message);
          setBlog(null);
          if (typeof onBlogLoaded === "function") {
            onBlogLoaded(null);
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchBlog();

    return () => {
      isMounted = false;
    };
  }, [slug]);

  useEffect(() => {
    let isMounted = true;

    const fetchRecent = async () => {
      setRecentLoading(true);
      setRecentError(null);

      try {
        const { items } = await apiClient.get("/blogs?limit=5");
        if (!isMounted) {
          return;
        }
        const sanitized = (items || [])
          .filter((item) => item.slug !== slug)
          .slice(0, 4)
          .map((item) => {
            const excerpt = item.excerpt || item.content?.replace(/<[^>]+>/g, "").slice(0, 90) || "";
            return {
              id: item._id,
              slug: item.slug,
              title: item.title,
              excerpt,
              featuredImage: item.featuredImage,
            };
          });
        setRecentBlogs(sanitized);
      } catch (err) {
        if (!isMounted) {
          return;
        }
        setRecentError(err?.message || "Failed to load recent posts");
        setRecentBlogs([]);
      } finally {
        if (isMounted) {
          setRecentLoading(false);
        }
      }
    };

    fetchRecent();

    return () => {
      isMounted = false;
    };
  }, [slug]);

  useEffect(() => {
    let isMounted = true;

    const fetchCategories = async () => {
      setCategoriesLoading(true);
      setCategoriesError(null);

      try {
        const { items } = await apiClient.get("/blogs?limit=100");
        if (!isMounted) {
          return;
        }
        const uniqueCategories = Array.from(
          new Set((items || []).map((item) => (item.category || "Uncategorized").trim()))
        );
        setCategories(uniqueCategories);
      } catch (err) {
        if (!isMounted) {
          return;
        }
        setCategoriesError(err?.message || "Failed to load categories");
        setCategories([]);
      } finally {
        if (isMounted) {
          setCategoriesLoading(false);
        }
      }
    };

    fetchCategories();

    return () => {
      isMounted = false;
    };
  }, []);

  const featuredImage = useMemo(() => {
    if (!blog || !blog.featuredImage) {
      return FALLBACK_IMAGE;
    }
    if (blog.featuredImage.startsWith("http")) {
      return blog.featuredImage;
    }
    return ASSETS_BASE_URL + blog.featuredImage;
  }, [blog]);

  const publishedMeta = useMemo(() => {
    if (!blog) {
      return { day: "--", month: "" };
    }
    return formatPublishedDate(blog.publishedAt || blog.createdAt);
  }, [blog]);

  if (loading) {
    return (
      <div className='blog-page-section py-120'>
        <div className='container'>
          <div className='d-flex justify-content-center align-items-center py-5'>
            <div className='spinner-border text-primary' role='status'>
              <span className='visually-hidden'>Loading...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !blog) {
    return (
      <div className='blog-page-section py-120'>
        <div className='container'>
          <div className='alert alert-danger mb-0' role='alert'>
            {error || "Blog post not found."}
          </div>
        </div>
      </div>
    );
  }

  const author = blog.author || "Admin";
  const tags = Array.isArray(blog.tags)
    ? blog.tags.filter((tag) => typeof tag === "string" && tag.trim().length > 0)
    : [];
  const views = blog.meta && typeof blog.meta.views === "number" ? blog.meta.views : 0;
  const comments = blog.meta && typeof blog.meta.comments === "number" ? blog.meta.comments : 0;

  return (
    <div className='blog-page-section py-120'>
      <div className='container'>
        <div className='flex-between gap-16 flex-wrap mb-40'>
          <span className='text-neutral-500'>Published in {blog.category || "Uncategorized"}</span>
          <div className='flex-align gap-16'>
            <div className='flex-align gap-8'>
              <span className='text-neutral-500 flex-shrink-0'>Sort By :</span>
              <select className='form-select ps-20 pe-28 py-8 fw-medium rounded-pill bg-main-25 border border-neutral-30 text-neutral-700'>
                <option value='newest'>Newest</option>
                <option value='trending'>Trending</option>
                <option value='popular'>Popular</option>
              </select>
            </div>
          </div>
        </div>
        <div className='row gy-4'>
          <div className='col-lg-8'>
            <div className='bg-main-25 rounded-16 p-12 border border-neutral-30'>
              <div className='rounded-12 overflow-hidden position-relative'>
                <img src={featuredImage} alt={blog.title} className='rounded-12 cover-img transition-2' />
                <div className='position-absolute inset-inline-end-0 inset-block-end-0 me-16 mb-16 py-12 px-24 rounded-8 bg-main-two-600 text-white fw-medium text-center'>
                  <h3 className='mb-0 text-white fw-medium'>{publishedMeta.day}</h3>
                  {publishedMeta.month}
                </div>
              </div>
              <div className='pt-32 pb-24 px-16 position-relative'>
                <div className='flex-align gap-14 flex-wrap mb-20'>
                  <div className='flex-align gap-8'>
                    <span className='text-neutral-500 text-2xl d-flex'>
                      <i className='ph ph-user-circle' />
                    </span>
                    <span className='text-neutral-500 text-lg'>By {author}</span>
                  </div>
                  <span className='w-8 h-8 bg-neutral-100 rounded-circle' />
                  <div className='flex-align gap-8'>
                    <span className='text-neutral-500 text-2xl d-flex'>
                      <i className='ph-bold ph-eye' />
                    </span>
                    <span className='text-neutral-500 text-lg'>{views}</span>
                  </div>
                  <span className='w-8 h-8 bg-neutral-100 rounded-circle' />
                  <div className='flex-align gap-8'>
                    <span className='text-neutral-500 text-2xl d-flex'>
                      <i className='ph ph-chat-dots' />
                    </span>
                    <span className='text-neutral-500 text-lg'>{comments}</span>
                  </div>
                </div>
                <h2 className='mb-16'>{blog.title}</h2>
                {blog.excerpt ? <p className='text-neutral-500 mb-24'>{blog.excerpt}</p> : null}
                <div className='text-neutral-500 blog-content' dangerouslySetInnerHTML={{ __html: blog.content }} />
                {tags.length > 0 ? (
                  <div className='mt-24 d-flex flex-wrap gap-12'>
                    {tags.map((tag) => (
                      <span key={tag} className='badge bg-main-two-600 text-white px-12 py-6 radius-8 fw-semibold'>
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
            <div className='border border-neutral-30 rounded-12 bg-main-25 p-32 mt-24'>
              <div className='flex-between gap-16 flex-wrap mb-24'>
                <h4 className='mb-0'>All Comments</h4>
                <div className='flex-align gap-16'>
                  <div className='flex-align gap-8'>
                    <span className='text-neutral-500 flex-shrink-0'>Sort By :</span>
                    <select className='form-select ps-20 pe-28 py-8 fw-medium rounded-pill bg-white border border-neutral-30 text-neutral-700'>
                      <option value='newest'>Newest</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className='d-flex gap-16'>
                <div className='flex-shrink-0'>
                  <img src='/assets/images/thumbs/commentor-img.png' alt='Commenter' className='rounded-circle object-fit-cover' />
                </div>
                <div className='flex-grow-1'>
                  <h6 className='mb-8'>Aida N.</h6>
                  <div className='d-flex align-items-center gap-12 mb-16 flex-wrap'>
                    <div className='d-flex align-items-center gap-8'>
                      <span className='text-warning-500'>
                        <i className='ph-fill ph-star' />
                        <i className='ph-fill ph-star' />
                        <i className='ph-fill ph-star' />
                        <i className='ph-fill ph-star' />
                        <i className='ph-fill ph-star' />
                      </span>
                      <span className='text-neutral-500'>5.0</span>
                    </div>
                    <span className='text-neutral-500'>March 12, 2024</span>
                  </div>
                  <p className='text-neutral-600'>
                    I love this course! The instructor explains complex topics in a simple, easy-to-follow way, and the examples are very helpful. Highly recommended for anyone starting out in AI.
                  </p>
                </div>
              </div>
              <div className='d-flex gap-16 mt-24'>
                <div className='flex-shrink-0'>
                  <img src='/assets/images/thumbs/commentor-img.png' alt='Commenter' className='rounded-circle object-fit-cover' />
                </div>
                <div className='flex-grow-1'>
                  <h6 className='mb-8'>Devon Lane</h6>
                  <div className='d-flex align-items-center gap-12 mb-16 flex-wrap'>
                    <div className='d-flex align-items-center gap-8'>
                      <span className='text-warning-500'>
                        <i className='ph-fill ph-star' />
                        <i className='ph-fill ph-star' />
                        <i className='ph-fill ph-star' />
                        <i className='ph-fill ph-star' />
                        <i className='ph-fill ph-star-half' />
                      </span>
                      <span className='text-neutral-500'>4.5</span>
                    </div>
                    <span className='text-neutral-500'>March 9, 2024</span>
                  </div>
                  <p className='text-neutral-600'>
                    Great content and clear explanations. I appreciate the real-world projects that help solidify the concepts.
                  </p>
                </div>
              </div>
              <form className='mt-32'>
                <div className='row g-3'>
                  <div className='col-md-6'>
                    <input type='text' className='form-control py-12 px-20 radius-12 border border-neutral-30' placeholder='Your Name' />
                  </div>
                  <div className='col-md-6'>
                    <input type='email' className='form-control py-12 px-20 radius-12 border border-neutral-30' placeholder='Email Address' />
                  </div>
                  <div className='col-12'>
                    <textarea className='form-control py-12 px-20 radius-12 border border-neutral-30' rows='4' placeholder='Write a comment' />
                  </div>
                  <div className='col-12'>
                    <button type='button' className='btn btn-primary-600 radius-12 px-32'>
                      Post Comment
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
          <div className='col-lg-4'>
            <div className='d-flex flex-column gap-24'>
              <div className='card'>
                <div className='card-header border-bottom'>
                  <h6 className='text-xl mb-0'>Recent Posts</h6>
                </div>
                <div className='card-body d-flex flex-column gap-24 p-24'>
                  {recentLoading ? (
                    <div className='d-flex justify-content-center py-3'>
                      <div className='spinner-border text-primary' role='status'>
                        <span className='visually-hidden'>Loading...</span>
                      </div>
                    </div>
                  ) : recentError ? (
                    <div className='alert alert-danger mb-0' role='alert'>
                      {recentError}
                    </div>
                  ) : recentBlogs.length === 0 ? (
                    <div className='alert alert-info mb-0' role='alert'>
                      No recent posts available.
                    </div>
                  ) : (
                    recentBlogs.map((recent) => {
                      const image = recent.featuredImage
                        ? recent.featuredImage.startsWith("http")
                          ? recent.featuredImage
                          : ASSETS_BASE_URL + recent.featuredImage
                        : "/assets/images/blog/blog1.png";

                      return (
                        <div key={recent.id} className='d-flex flex-wrap gap-12'>
                          <Link to={`/blogs/${recent.slug}`} className='blog__thumb w-100 radius-12 overflow-hidden'>
                            <img src={image} alt={recent.title} className='w-100 h-100 object-fit-cover' />
                          </Link>
                          <div className='blog__content'>
                            <h6 className='mb-8'>
                              <Link
                                to={`/blogs/${recent.slug}`}
                                className='text-line-2 text-hover-primary-600 text-md transition-2'
                              >
                                {recent.title}
                              </Link>
                            </h6>
                            <p className='text-line-2 text-sm text-neutral-500 mb-0'>
                              {recent.excerpt}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
              <div className='card'>
                <div className='card-header border-bottom'>
                  <h6 className='text-xl mb-0'>Categories</h6>
                </div>
                <div className='card-body p-24'>
                  {categoriesLoading ? (
                    <div className='d-flex justify-content-center py-3'>
                      <div className='spinner-border text-primary' role='status'>
                        <span className='visually-hidden'>Loading...</span>
                      </div>
                    </div>
                  ) : categoriesError ? (
                    <div className='alert alert-danger mb-0' role='alert'>
                      {categoriesError}
                    </div>
                  ) : categories.length === 0 ? (
                    <div className='alert alert-info mb-0' role='alert'>
                      No categories found.
                    </div>
                  ) : (
                    <ul className='list-unstyled d-flex flex-column gap-12 mb-0'>
                      {categories.map((category) => (
                        <li key={category}>
                          <Link to={`/blogs?category=${encodeURIComponent(category)}`} className='text-neutral-600 text-hover-primary-600'>
                            {category}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

BlogDetailsInner.defaultProps = {
  onBlogLoaded: null,
};

export default BlogDetailsInner;
