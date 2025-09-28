import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import DOMPurify from "dompurify";
import useAuth from "../hook/useAuth";
import {
  fetchBlogDetails,
  fetchBlogComments,
  replyToBlogComment,
  deleteBlogComment,
} from "../services/adminBlogs";
import { ASSET_BASE_URL, PUBLIC_SITE_BASE } from "../config/env";
import "./BlogDetailsLayer.css";

const PLACEHOLDER_IMAGE = "/assets/images/blog/blog-placeholder.png";

const formatDateTime = (value) => {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleString();
};

const BlogDetailsLayer = ({ onBlogLoaded }) => {
  const { blogId } = useParams();
  const { token } = useAuth();
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentsError, setCommentsError] = useState(null);
  const [replyTarget, setReplyTarget] = useState(null);
  const [commentContent, setCommentContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const commentCount = useMemo(() => {
    const countTree = (items) =>
      items.reduce(
        (sum, comment) => sum + 1 + (comment.replies ? countTree(comment.replies) : 0),
        0
      );
    return countTree(comments);
  }, [comments]);

  useEffect(() => {
    let isMounted = true;

    const loadBlog = async () => {
      if (!token || !blogId) {
        return;
      }
      setLoading(true);
      setError(null);

      try {
        const response = await fetchBlogDetails({ blogId, token });
        if (!isMounted) {
          return;
        }
        setBlog(response.blog);
        if (typeof onBlogLoaded === "function") {
          onBlogLoaded(response.blog);
        }
      } catch (err) {
        if (!isMounted) {
          return;
        }
        setError(err?.message || "Failed to load blog");
        setBlog(null);
        if (typeof onBlogLoaded === "function") {
          onBlogLoaded(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadBlog();

    return () => {
      isMounted = false;
    };
  }, [blogId, onBlogLoaded, token]);

  const loadComments = useCallback(async () => {
    if (!token || !blogId) {
      return;
    }
    setCommentsLoading(true);
    setCommentsError(null);

    try {
      const response = await fetchBlogComments({ blogId, token });
      setComments(response.items || []);
    } catch (err) {
      setCommentsError(err?.message || "Failed to load comments");
      setComments([]);
    } finally {
      setCommentsLoading(false);
    }
  }, [blogId, token]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const handleReply = (comment) => {
    setReplyTarget({ id: comment.id, name: comment.name });
  };

  const handleCancelReply = () => {
    setReplyTarget(null);
  };

  const handleDelete = async (comment) => {
    if (!token || !blogId) {
      return;
    }
    if (!window.confirm("Delete this comment and its replies?")) {
      return;
    }
    try {
      const response = await deleteBlogComment({ blogId, commentId: comment.id, token });
      const removedCount = response?.removed || 1;
      setFeedback({ type: "success", message: "Comment deleted" });
      await loadComments();
      setBlog((prev) =>
        prev
          ? {
              ...prev,
              meta: {
                ...(prev.meta || {}),
                comments: Math.max((prev.meta?.comments || removedCount) - removedCount, 0),
              },
            }
          : prev
      );
    } catch (err) {
      setFeedback({ type: "error", message: err?.message || "Failed to delete comment" });
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!token || !blogId || submitting) {
      return;
    }

    const content = commentContent.trim();
    if (!content) {
      setFeedback({ type: "error", message: "Comment content is required" });
      return;
    }

    try {
      setSubmitting(true);
      setFeedback(null);

      await replyToBlogComment({
        blogId,
        token,
        data: {
          content,
          parentCommentId: replyTarget ? replyTarget.id : null,
        },
      });

      setCommentContent("");
      setReplyTarget(null);
      setFeedback({ type: "success", message: "Comment posted" });
      await loadComments();
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
      setFeedback({ type: "error", message: err?.message || "Failed to post comment" });
    } finally {
      setSubmitting(false);
    }
  };

  const renderComment = (comment, depth = 0) => {
    const className = 'admin-comment' + (depth > 0 ? ' admin-comment--reply' : '');
    return (
      <div key={comment.id} className={className}>
        <div className='admin-comment__header'>
          <div>
            <span className='admin-comment__author'>{comment.name}</span>
            {comment.email ? <span className='admin-comment__email'>({comment.email})</span> : null}
          </div>
          <span className='admin-comment__date'>{formatDateTime(comment.createdAt)}</span>
        </div>
        <p className='admin-comment__content'>{comment.content}</p>
        <div className='admin-comment__actions'>
          <button type='button' className='btn btn-sm btn-outline-primary radius-8' onClick={() => handleReply(comment)}>
            Reply
          </button>
          <button type='button' className='btn btn-sm btn-outline-danger radius-8' onClick={() => handleDelete(comment)}>
            Delete
          </button>
        </div>
        {comment.replies && comment.replies.length > 0 ? (
          <div className='admin-comment__replies'>
            {comment.replies.map((reply) => renderComment(reply, depth + 1))}
          </div>
        ) : null}
      </div>
    );
  };

  if (loading) {
    return (
      <div className='card p-32 text-center'>
        <div className='spinner-border text-primary' role='status'>
          <span className='visually-hidden'>Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className='alert alert-danger'>{error}</div>;
  }

  if (!blog) {
    return <div className='alert alert-warning'>Blog not found.</div>;
  }

  const resolveImage = (path) => {
    if (!path) {
      return PLACEHOLDER_IMAGE;
    }

    if (path.startsWith("http")) {
      return path;
    }

    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${ASSET_BASE_URL}${normalizedPath}`;
  };

  const contentHtml = blog.content ? DOMPurify.sanitize(blog.content) : '';

  return (
    <div className='blog-details-admin'>
      {feedback ? (
        <div className={'alert ' + (feedback.type === 'success' ? 'alert-success' : 'alert-danger')}>
          {feedback.message}
        </div>
      ) : null}
      <div className='row gy-4'>
        <div className='col-xxl-8 col-lg-7'>
          <div className='card p-0 overflow-hidden radius-12 mb-24'>
            {blog.featuredImage ? (
              <img src={resolveImage(blog.featuredImage)} alt={blog.title} className='w-100 admin-blog-image' />
            ) : null}
            <div className='p-32'>
              <div className='d-flex flex-wrap gap-12 mb-16 text-neutral-500'>
                <span>
                  <i className='ri-eye-line me-2' />
                  {blog.meta?.views ?? 0} Views
                </span>
                <span>
                  <i className='ri-chat-3-line me-2' />
                  {commentCount} Comments
                </span>
                <span>
                  <i className='ri-calendar-line me-2' />
                  {blog.publishedAt ? formatDateTime(blog.publishedAt) : 'Unpublished'}
                </span>
              </div>
              <h3 className='mb-20'>{blog.title}</h3>
              <div className='badge bg-main-100 text-main-600 px-16 py-8 radius-pill mb-20'>{blog.category || 'Uncategorized'}</div>
              <div className='admin-blog-content' dangerouslySetInnerHTML={{ __html: contentHtml }} />
              {blog.tags && blog.tags.length > 0 ? (
                <div className='d-flex flex-wrap gap-8 mt-24'>
                  {blog.tags.map((tag) => (
                    <span key={tag} className='badge bg-main-600 text-white px-12 py-6 radius-pill'>
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
        <div className='col-xxl-4 col-lg-5'>
          <div className='card p-24 radius-12 mb-24'>
            <h6 className='mb-16'>Blog Details</h6>
            <ul className='list-unstyled d-flex flex-column gap-12 mb-0 text-neutral-600'>
              <li>
                <strong>Title:</strong> {blog.title}
              </li>
              <li>
                <strong>Slug:</strong> {blog.slug}
              </li>
              <li>
                <strong>Author:</strong> {blog.author || 'Admin'}
              </li>
              <li>
                <strong>Category:</strong> {blog.category || 'Uncategorized'}
              </li>
              <li>
                <strong>Created:</strong> {formatDateTime(blog.createdAt)}
              </li>
            </ul>
            <div className='d-flex gap-12 mt-24'>
              <a
                href={PUBLIC_SITE_BASE + '/blogs/' + blog.slug}
                target='_blank'
                rel='noreferrer'
                className='btn btn-outline-primary radius-8 flex-grow-1'
              >
                View Public Page
              </a>
            </div>
          </div>
          <div className='card p-0 radius-12 overflow-hidden admin-comment-card'>
            <div className='p-24 border-bottom border-neutral-50 d-flex justify-content-between'>
              <h6 className='mb-0'>Comments ({commentCount})</h6>
            </div>
            <div className='admin-comments-scrollable'>
              {commentsLoading ? (
                <div className='d-flex justify-content-center py-4'>
                  <div className='spinner-border text-primary' role='status'>
                    <span className='visually-hidden'>Loading...</span>
                  </div>
                </div>
              ) : commentsError ? (
                <div className='alert alert-danger m-4'>{commentsError}</div>
              ) : comments.length === 0 ? (
                <div className='alert alert-info m-4'>No comments yet.</div>
              ) : (
                comments.map((comment) => renderComment(comment))
              )}
            </div>
            <form className='admin-comment-form border-top border-neutral-50 p-24' onSubmit={handleSubmit}>
              <h6 className='mb-12'>Add Reply</h6>
              <textarea
                className='form-control border-neutral-30 radius-12 mb-12'
                rows='3'
                placeholder='Write your reply...'
                value={commentContent}
                onChange={(event) => setCommentContent(event.target.value)}
                disabled={submitting}
                required
              />
              {replyTarget ? (
                <div className='alert alert-secondary d-flex justify-content-between align-items-center py-8 px-12 mb-16'>
                  <span>
                    Replying to <strong>{replyTarget.name}</strong>
                  </span>
                  <button type='button' className='btn btn-sm btn-outline-secondary' onClick={handleCancelReply}>
                    Cancel
                  </button>
                </div>
              ) : null}
              <button type='submit' className='btn btn-primary-600 radius-12 w-100' disabled={submitting}>
                {submitting ? 'Posting...' : 'Post Reply'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

BlogDetailsLayer.defaultProps = {
  onBlogLoaded: undefined,
};

export default BlogDetailsLayer;
