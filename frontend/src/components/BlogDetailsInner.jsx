import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import apiClient, { API_BASE_URL } from "../services/apiClient";
import "./BlogDetailsInner.css";

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

const formatCommentDate = (value) => {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
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
  const [commentList, setCommentList] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentsError, setCommentsError] = useState(null);
  const [commentForm, setCommentForm] = useState({ name: "", email: "", content: "" });
  const [commentFeedback, setCommentFeedback] = useState(null);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [replyTo, setReplyTo] = useState(null);

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
  }, [slug, onBlogLoaded]);

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

  useEffect(() => {
    let isMounted = true;
    const effectiveSlug = slug || blog?.slug;

    if (!effectiveSlug) {
      setCommentList([]);
      setCommentsLoading(false);
      return () => {
        isMounted = false;
      };
    }

    const fetchComments = async () => {
      setCommentsLoading(true);
      setCommentsError(null);

      try {
        const { items } = await apiClient.get(`/blogs/${effectiveSlug}/comments`);
        if (!isMounted) {
          return;
        }
        setCommentList(items || []);
      } catch (err) {
        if (!isMounted) {
          return;
        }
        setCommentsError(err?.message || "Failed to load comments");
        setCommentList([]);
      } finally {
        if (isMounted) {
          setCommentsLoading(false);
        }
      }
    };

    fetchComments();

    return () => {
      isMounted = false;
    };
  }, [slug, blog?.slug]);

  const handleCommentInputChange = (event) => {
    const { name, value } = event.target;
    setCommentForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCommentSubmit = async (event) => {
    event.preventDefault();

    if (isSubmittingComment) {
      return;
    }

    const currentSlug = slug || blog?.slug;
    if (!currentSlug) {
      setCommentFeedback({ type: "error", message: "Unable to submit comment for this post." });
      return;
    }

    const name = commentForm.name.trim();
    const email = commentForm.email.trim();
    const content = commentForm.content.trim();

    if (!name || !email || !content) {
      setCommentFeedback({ type: "error", message: "Name, email, and comment are required." });
      return;
    }

    try {
      setIsSubmittingComment(true);
      setCommentFeedback(null);

      const response = await apiClient.post(`/blogs/${currentSlug}/comments`, {
        name,
        email,
        content,
        parentCommentId: replyTo ? replyTo.id : null,
      });

      setCommentList((prev) => {
        if (replyTo && replyTo.id) {
          let replyInserted = false;
          const addReply = (comments) =>
            comments.map((comment) => {
              if (comment.id === replyTo.id) {
                replyInserted = true;
                return {
                  ...comment,
                  replies: [response, ...(comment.replies || [])],
                };
              }
              if (comment.replies && comment.replies.length > 0) {
                return { ...comment, replies: addReply(comment.replies) };
              }
              return comment;
            });

          const updated = addReply(prev);
          if (!replyInserted) {
            return [response, ...prev];
          }
          return updated;
        }
        return [response, ...prev];
      });
      setCommentFeedback({ type: "success", message: "Comment submitted successfully." });
      setCommentForm({ name: "", email: "", content: "" });
      setReplyTo(null);
      setBlog((prev) =>
        prev
          ? {
              ...prev,
              meta: {
                ...(prev.meta || {}),
                comments: (prev.meta?.comments || 0) + 1,
              },
            }
          : prev
      );
    } catch (err) {
      setCommentFeedback({ type: "error", message: err?.message || "Failed to submit comment." });
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleReplyClick = (comment) => {
    setReplyTo({ id: comment.id, name: comment.name });
  };

  const handleCancelReply = () => {
    setReplyTo(null);
  };

  const countComments = (comments) =>
    comments.reduce((sum, comment) => sum + 1 + (comment.replies ? countComments(comment.replies) : 0), 0);

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
      <div className='blog-page-section py-64'>
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
  const totalComments = countComments(commentList);
  const commentsCount = Math.max(blog.meta && typeof blog.meta.comments === "number" ? blog.meta.comments : 0, totalComments);

  const renderComment = (comment, depth = 0) => (
    <div
      key={comment.id}
      className={`comment-item px-32 py-20 align-items-start border-bottom border-neutral-40 blog-details__comment-item ${
        depth > 0 ? 'comment-item--reply' : ''
      }`}
    >
      <div className='comment-avatar rounded-circle bg-main-50 text-main-600 d-flex align-items-center justify-content-center'>
        <i className='ph ph-user' />
      </div>
      <div className='comment-body'>
        <div className='d-flex justify-content-between align-items-center gap-12'>
          <span className='fw-semibold text-neutral-900'>{comment.name}</span>
          <span className='text-neutral-400 text-sm'>{formatCommentDate(comment.createdAt)}</span>
        </div>
        <p className='text-neutral-600 mb-2 mt-3'>{comment.content}</p>
        <div className='comment-actions'>
          <button type='button' onClick={() => handleReplyClick(comment)} className='comment-action-btn'>
            Reply
          </button>
        </div>
        {comment.replies && comment.replies.length > 0 ? (
          <div className='comment-replies'>
            {comment.replies.map((reply) => renderComment(reply, depth + 1))}
          </div>
        ) : null}
      </div>
    </div>
  );

  return (
    <div className='blog-page-section py-64'>
      <div className='container'>
        <div className='blog-details__controls flex-between gap-16 flex-wrap mb-40'>
          <span className='blog-details__category text-neutral-500'>
            Published in {blog.category || "Uncategorized"}
          </span>
          <div className='blog-details__sort flex-align gap-8'>
            <span className='text-neutral-500 flex-shrink-0'>Sort By :</span>
            <select className='form-select ps-20 pe-28 py-8 fw-medium rounded-pill bg-main-25 border border-neutral-30 text-neutral-700'>
              <option value='newest'>Newest</option>
              <option value='trending'>Trending</option>
              <option value='popular'>Popular</option>
            </select>
          </div>
        </div>
        <div className='row gy-4 blog-details__layout'>
          <div className='col-lg-8'>
            <div className='bg-main-25 rounded-16 p-12 border border-neutral-30 blog-details__main'>
              <div className='rounded-12 overflow-hidden position-relative blog-details__cover'>
                <img src={featuredImage} alt={blog.title} className='rounded-12 cover-img transition-2' />
                <div className='position-absolute inset-inline-end-0 inset-block-end-0 me-16 mb-16 py-12 px-24 rounded-8 bg-main-two-600 text-white fw-medium text-center blog-details__date-badge'>
                  <h3 className='mb-0 text-white fw-medium'>{publishedMeta.day}</h3>
                  {publishedMeta.month}
                </div>
              </div>
              <div className='pt-32 pb-24 px-16 position-relative'>
                <div className='flex-align gap-14 flex-wrap mb-20 blog-details__meta'>
                  <div className='flex-align gap-8 blog-details__meta-item'>
                    <span className='text-neutral-500 text-2xl d-flex'>
                      <i className='ph ph-user-circle' />
                    </span>
                    <span className='text-neutral-500 text-lg'>By {author}</span>
                  </div>
                  <span className='w-8 h-8 bg-neutral-100 rounded-circle blog-details__meta-separator' />
                  <div className='flex-align gap-8 blog-details__meta-item'>
                    <span className='text-neutral-500 text-2xl d-flex'>
                      <i className='ph-bold ph-eye' />
                    </span>
                    <span className='text-neutral-500 text-lg'>{views}</span>
                  </div>
                  <span className='w-8 h-8 bg-neutral-100 rounded-circle blog-details__meta-separator' />
                  <div className='flex-align gap-8 blog-details__meta-item'>
                    <span className='text-neutral-500 text-2xl d-flex'>
                      <i className='ph ph-chat-dots' />
                    </span>
                    <span className='text-neutral-500 text-lg'>{commentsCount}</span>
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
            <div className='border border-neutral-30 rounded-12 bg-main-25 p-0 mt-24 overflow-hidden instagram-comments blog-details__comments'>
              <div className='p-32 border-bottom border-neutral-50 d-flex justify-content-between align-items-center'>
                <h4 className='mb-0'>Comments</h4>
                <span className='text-neutral-500 fw-medium'>{commentsCount}</span>
              </div>
              <div className='comments-scrollable blog-details__comments-list'>
                {commentsLoading ? (
                  <div className='d-flex justify-content-center py-4'>
                    <div className='spinner-border text-primary' role='status'>
                      <span className='visually-hidden'>Loading...</span>
                    </div>
                  </div>
                ) : commentsError ? (
                  <div className='alert alert-danger m-4' role='alert'>
                    {commentsError}
                  </div>
                ) : commentList.length === 0 ? (
                  <div className='alert alert-info m-4' role='alert'>
                    No comments yet. Be the first to share your thoughts!
                  </div>
                ) : (
                  commentList.map((comment) => renderComment(comment))
                )}
              </div>
              <form className='comment-form border-top border-neutral-50 p-24' onSubmit={handleCommentSubmit} noValidate>
                {commentFeedback ? (
                  <div
                    className={`alert ${commentFeedback.type === "success" ? "alert-success" : "alert-danger"}`}
                    role='alert'
                  >
                    {commentFeedback.message}
                  </div>
                ) : null}
                <div className='comment-form__row'>
                  <input
                    type='text'
                    className='comment-form__input'
                    placeholder='Your Name'
                    name='name'
                    value={commentForm.name}
                    onChange={handleCommentInputChange}
                    disabled={isSubmittingComment}
                    required
                  />
                  <input
                    type='email'
                    className='comment-form__input'
                    placeholder='Email Address'
                    name='email'
                    value={commentForm.email}
                    onChange={handleCommentInputChange}
                    disabled={isSubmittingComment}
                    required
                  />
                </div>
                <div className='comment-form__row comment-form__row--textarea'>
                  <textarea
                    className='comment-form__textarea'
                    placeholder='Add a comment...'
                    name='content'
                    value={commentForm.content}
                    onChange={handleCommentInputChange}
                    disabled={isSubmittingComment}
                    required
                  />
                  <button
                    type='submit'
                    className='comment-form__submit'
                    disabled={isSubmittingComment}
                  >
                    {isSubmittingComment ? 'Posting...' : 'Post'}
                  </button>
                </div>
                {replyTo ? (
                  <div className='comment-form__replying'>
                    Replying to <strong>{replyTo.name}</strong>
                    <button type='button' onClick={handleCancelReply} className='comment-reply-cancel'>
                      Cancel
                    </button>
                  </div>
                ) : null}
              </form>
            </div>
          </div>
          <div className='col-lg-4'>
            <div className='blog-details__sidebar d-flex flex-column gap-24'>
              <div className='card blog-details__sidebar-card'>
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
                        : "/assets/images/blogs/blog1.png";

                      return (
                        <div key={recent.id} className='d-flex gap-12 align-items-start blog-details__recent-item'>
                          <Link
                            to={`/blogs/${recent.slug}`}
                            className='blog__thumb radius-12 overflow-hidden flex-shrink-0 blog-details__recent-thumb'
                          >
                            <img src={image} alt={recent.title} className='w-100 h-100 object-fit-cover' />
                          </Link>
                          <div className='blog__content flex-grow-1'>
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
              <div className='card blog-details__sidebar-card'>
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
