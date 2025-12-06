import { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { Editor } from "@tinymce/tinymce-react";
import DOMPurify from "dompurify";
import { Link } from "react-router-dom";
import useAuth from "../hook/useAuth";
import { createBlog, fetchBlogDetails, fetchBlogs, updateBlog } from "../services/adminBlogs";
import { ASSET_BASE_URL, PUBLIC_SITE_BASE } from "../config/env";

const slugifyTitle = (input) => {
  if (!input) {
    return "";
  }

  return input
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
};

const tinyPlugins = [
  "anchor",
  "autolink",
  "charmap",
  "code",
  "codesample",
  "emoticons",
  "fullscreen",
  "help",
  "image",
  "insertdatetime",
  "link",
  "lists",
  "media",
  "preview",
  "quickbars",
  "searchreplace",
  "table",
  "visualblocks",
  "wordcount",
];

const tinyToolbar = [
  "undo redo | blocks fontfamily fontsize | bold italic underline strikethrough",
  "| link image media table | align lineheight | numlist bullist indent outdent",
  "| emoticons charmap insertdatetime | code preview fullscreen | removeformat",
].join(" ");

const resolveImagePath = (path) => {
  if (!path) {
    return null;
  }
  return path.startsWith("http") ? path : `${ASSET_BASE_URL}${path}`;
};
const FALLBACK_IMAGE = "/assets/images/blog/blog-placeholder.png";

const modalBackdropStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(15, 23, 42, 0.55)",
  zIndex: 1050,
};

const modalPanelStyle = {
  position: "fixed",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "min(960px, 96vw)",
  maxHeight: "90vh",
  overflowY: "auto",
  background: "#fff",
  borderRadius: 24,
  boxShadow: "0 24px 60px rgba(15,23,42,0.3)",
  zIndex: 1060,
};

const AddBlogLayer = ({ mode = "create", blogId = undefined }) => {
  const isEditMode = mode === "edit";
  const { token, admin } = useAuth();
  const defaultAuthor = admin?.fullName || admin?.name || admin?.displayName || admin?.email || "Admin";
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [author, setAuthor] = useState(defaultAuthor);
  const [category, setCategory] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [existingImageUrl, setExistingImageUrl] = useState(null);
  const [removeExistingImage, setRemoveExistingImage] = useState(false);
  const [content, setContent] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [loadingBlog, setLoadingBlog] = useState(isEditMode);
  const [loadError, setLoadError] = useState(null);
  const [loadVersion, setLoadVersion] = useState(0);
  const [recentBlogs, setRecentBlogs] = useState([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [recentError, setRecentError] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewPayload, setPreviewPayload] = useState(null);
  const [lastPublishedBlog, setLastPublishedBlog] = useState(null);
  const editorRef = useRef(null);

  useEffect(
    () => () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    },
    [imagePreview]
  );

  const handleTitleChange = (event) => {
    const nextTitle = event.target.value;
    setTitle(nextTitle);
    setSlug(slugifyTitle(nextTitle));
  };

  const applySelectedFile = (file) => {
    if (!file) {
      return;
    }

    if (!file.type?.startsWith("image/")) {
      setFeedback({
        type: "error",
        message: "Only image files are supported for thumbnails.",
      });
      return;
    }

    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
    setImageFile(file);
    setRemoveExistingImage(false);
  };

  const handleFileChange = (event) => {
    if (!event.target.files || event.target.files.length === 0) {
      return;
    }

    applySelectedFile(event.target.files[0]);
    // Reset the input so dropping the same file again still triggers change
    event.target.value = "";
  };

  const handleRemoveImage = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(null);
    setImageFile(null);
    if (!imagePreview && existingImageUrl) {
      setExistingImageUrl(null);
      if (isEditMode) {
        setRemoveExistingImage(true);
      }
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isDragging) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.currentTarget.contains(event.relatedTarget)) {
      return;
    }
    setIsDragging(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) {
      return;
    }
    applySelectedFile(files[0]);
  };

  const handleReloadBlog = () => {
    if (!isEditMode || submitting) {
      return;
    }
    setLoadVersion((value) => value + 1);
  };

  useEffect(() => {
    if (!isEditMode) {
      setAuthor(defaultAuthor);
    }
  }, [defaultAuthor, isEditMode]);

  useEffect(() => {
    if (!isEditMode) {
      return;
    }

    if (!blogId) {
      setLoadError("Blog ID is required to edit this post.");
      setLoadingBlog(false);
      return;
    }

    if (!token) {
      setLoadError("Authentication is required to edit this blog post.");
      setLoadingBlog(false);
      return;
    }

    let isMounted = true;

    const loadBlog = async () => {
      setLoadingBlog(true);
      setLoadError(null);

      try {
        const response = await fetchBlogDetails({ blogId, token });
        if (!isMounted) {
          return;
        }
        const currentBlog = response?.blog;
        if (!currentBlog) {
          throw new Error("Blog not found");
        }
        setTitle(currentBlog.title || "");
        setSlug(currentBlog.slug || "");
        setAuthor(currentBlog.author || defaultAuthor);
        setCategory(currentBlog.category || "");
        setExcerpt(currentBlog.excerpt || "");
        setTagsInput((currentBlog.tags || []).join(", "));
        setContent(currentBlog.content || "");
        setExistingImageUrl(resolveImagePath(currentBlog.featuredImage));
        setRemoveExistingImage(false);
        if (editorRef.current) {
          editorRef.current.setContent(currentBlog.content || "");
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }
        setLoadError(error?.message || "Failed to load blog details.");
      } finally {
        if (isMounted) {
          setLoadingBlog(false);
        }
      }
    };

    loadBlog();

    return () => {
      isMounted = false;
    };
  }, [blogId, isEditMode, loadVersion, token]);

  useEffect(() => {
    if (!token) {
      return;
    }

    let isMounted = true;
    setRecentLoading(true);
    setRecentError(null);

    const loadRecent = async () => {
      try {
        const response = await fetchBlogs({ token });
        if (!isMounted) {
          return;
        }
        const items = response?.items || [];
        const filtered = isEditMode && blogId ? items.filter((blog) => blog.id !== blogId) : items;
        setRecentBlogs(filtered.slice(0, 6));
      } catch (error) {
        if (!isMounted) {
          return;
        }
        setRecentError(error?.message || "Failed to load latest posts.");
        setRecentBlogs([]);
      } finally {
        if (isMounted) {
          setRecentLoading(false);
        }
      }
    };

    loadRecent();

    return () => {
      isMounted = false;
    };
  }, [blogId, isEditMode, token]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (submitting) {
      return;
    }

    const editor = editorRef.current;
    const plainText = editor
      ? editor.getContent({ format: "text" }).trim()
      : content.replace(/<[^>]+>/g, "").trim();

    if (!title.trim() || !category.trim() || !plainText) {
      setFeedback({
        type: "error",
        message: "Title, category, and content are required.",
      });
      return;
    }

    if (!token) {
      setFeedback({
        type: "error",
        message: isEditMode ? "Authentication is required to update this post." : "Authentication is required to create a blog post.",
      });
      return;
    }

    if (isEditMode && !blogId) {
      setFeedback({
        type: "error",
        message: "Missing blog identifier. Please reload the page.",
      });
      return;
    }

    try {
      setSubmitting(true);
      setFeedback(null);

      const htmlContent = editor ? editor.getContent() : content;
      const normalizedAuthor = author && author.trim() ? author.trim() : defaultAuthor;
      const normalizedTags = tagsInput
        .split(/[,\n]/)
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0)
        .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`));

      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("category", category.trim());
      formData.append("content", htmlContent);
      formData.append("author", normalizedAuthor);

      if (isEditMode || excerpt.trim()) {
        formData.append("excerpt", excerpt.trim());
      }

      if (normalizedTags.length > 0 || isEditMode) {
        formData.append("tags", JSON.stringify(normalizedTags));
      }

      if (imageFile) {
        formData.append("featuredImage", imageFile);
      } else if (isEditMode && removeExistingImage) {
        formData.append("removeFeaturedImage", "true");
      }

      const response = isEditMode
        ? await updateBlog({ blogId, token, data: formData })
        : await createBlog({ token, data: formData });
      const resultingBlog = response?.blog || null;

      setFeedback({
        type: "success",
        message: isEditMode ? "Blog post updated successfully." : "Blog post created successfully.",
      });
      setLastPublishedBlog(resultingBlog);

      if (isEditMode) {
        if (resultingBlog) {
          setTitle(resultingBlog.title || "");
          setSlug(resultingBlog.slug || "");
          setAuthor(resultingBlog.author || defaultAuthor);
          setCategory(resultingBlog.category || "");
          setExcerpt(resultingBlog.excerpt || "");
          setTagsInput((resultingBlog.tags || []).join(", "));
          setContent(resultingBlog.content || "");
          setExistingImageUrl(resolveImagePath(resultingBlog.featuredImage));
          setRemoveExistingImage(false);
          if (editor) {
            editor.setContent(resultingBlog.content || "");
          }
        }
        if (imagePreview) {
          URL.revokeObjectURL(imagePreview);
        }
        setImagePreview(null);
        setImageFile(null);
      } else {
        if (editor) {
          editor.setContent("");
        }
        if (imagePreview) {
          URL.revokeObjectURL(imagePreview);
        }
        setTitle("");
        setSlug("");
        setAuthor(defaultAuthor);
        setCategory("");
        setExcerpt("");
        setTagsInput("");
        setContent("");
        setImagePreview(null);
        setImageFile(null);
        setExistingImageUrl(null);
        setRemoveExistingImage(false);
      }
    } catch (error) {
      setFeedback({
        type: "error",
        message: error.message || (isEditMode ? "Failed to update blog post." : "Failed to create blog post."),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePreview = () => {
    const editor = editorRef.current;
    const htmlContent = editor ? editor.getContent() : content;
    const sanitized = DOMPurify.sanitize(
      htmlContent && htmlContent.trim().length ? htmlContent : "<p class='text-neutral-500'>No content added yet.</p>"
    );

    setPreviewPayload({
      title: title?.trim() || "Untitled Blog Post",
      category: category?.trim() || "Uncategorized",
      author: author?.trim() || defaultAuthor,
      excerpt: excerpt?.trim() || "",
      tags: tagsInput
        .split(/[,\n]/)
        .map((tag) => tag.trim())
        .filter(Boolean),
      image: imagePreview || existingImageUrl || FALLBACK_IMAGE,
      content: sanitized,
    });
    setPreviewOpen(true);
  };

  const closePreview = () => {
    setPreviewOpen(false);
  };

  const displayedImage = imagePreview || existingImageUrl;
  const dropZoneClassName = [
    "upload-file h-160-px w-100 border input-form-light radius-8 overflow-hidden border-dashed bg-neutral-50 bg-hover-neutral-200 d-flex align-items-center flex-column justify-content-center gap-1 text-center px-16",
    isDragging ? "border-primary-600 bg-primary-50 text-primary-600" : "",
    submitting ? "opacity-75" : "",
  ]
    .join(" ")
    .trim();

  const alertClass = feedback
    ? feedback.type === "success"
      ? "alert alert-success"
      : "alert alert-danger"
    : "";

  return (
    <div className='row gy-4'>
      <div className='col-lg-8'>
        <div className='card mt-24'>
        <div className='card-header border-bottom'>
            <h6 className='text-xl mb-0'>{isEditMode ? "Edit Post" : "Add New Post"}</h6>
          </div>
          <div className='card-body p-24'>
            {isEditMode && loadingBlog ? (
              <div className='d-flex justify-content-center py-5'>
                <div className='spinner-border text-primary' role='status'>
                  <span className='visually-hidden'>Loading...</span>
                </div>
              </div>
            ) : loadError ? (
              <div className='alert alert-danger d-flex flex-wrap gap-12 align-items-center' role='alert'>
                <span className='flex-grow-1'>{loadError}</span>
                {isEditMode ? (
                  <button
                    type='button'
                    className='btn btn-sm btn-outline-primary'
                    onClick={handleReloadBlog}
                    disabled={submitting}
                  >
                    Retry
                  </button>
                ) : null}
              </div>
            ) : (
              <form className='d-flex flex-column gap-20' onSubmit={handleSubmit} noValidate>
                {feedback ? (
                  <div className={alertClass} role='alert'>
                    <div>{feedback.message}</div>
                    {feedback.type === "success" && lastPublishedBlog?.id ? (
                      <div className='d-flex flex-wrap gap-8 mt-12'>
                        <Link to={`/edit-blog/${lastPublishedBlog.id}`} className='btn btn-sm btn-outline-light'>
                          Edit Published Post
                        </Link>
                        <a
                          href={(PUBLIC_SITE_BASE || "") + "/blogs/" + (lastPublishedBlog.slug || slug)}
                          target='_blank'
                          rel='noreferrer'
                          className='btn btn-sm btn-outline-light'
                        >
                          View Public Page
                        </a>
                      </div>
                    ) : null}
                  </div>
                ) : null}
                <div>
                  <label className='form-label fw-bold text-neutral-900' htmlFor='title'>
                    Post Title:{" "}
                  </label>
                  <input
                    type='text'
                    className='form-control border border-neutral-200 radius-8'
                    id='title'
                    placeholder='Enter Post Title'
                    value={title}
                    onChange={handleTitleChange}
                    disabled={submitting}
                    required
                  />
                </div>
                <div>
                  <label className='form-label fw-bold text-neutral-900' htmlFor='slug'>
                    Post Slug:
                  </label>
                  <input
                    type='text'
                    className='form-control border border-neutral-200 radius-8'
                    id='slug'
                    value={slug}
                    readOnly
                  />
                </div>
                <div>
                  <label className='form-label fw-bold text-neutral-900' htmlFor='author'>
                    Author
                  </label>
                  <input
                    type='text'
                    className='form-control border border-neutral-200 radius-8'
                    id='author'
                    placeholder='Enter author name'
                    value={author}
                    onChange={(event) => setAuthor(event.target.value)}
                    disabled={submitting}
                    required
                  />
                </div>
                <div>
                  <label className='form-label fw-bold text-neutral-900' htmlFor='category'>
                    Post Category:
                  </label>
                  <input
                    type='text'
                    className='form-control border border-neutral-200 radius-8'
                    id='category'
                    placeholder='Enter Category'
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                    disabled={submitting}
                    required
                  />
                </div>
                <div>
                  <label className='form-label fw-bold text-neutral-900' htmlFor='excerpt'>
                    Short Description
                  </label>
                  <textarea
                    className='form-control border border-neutral-200 radius-8'
                    id='excerpt'
                    placeholder='Enter a short description (optional)'
                    rows={3}
                    value={excerpt}
                    onChange={(event) => setExcerpt(event.target.value)}
                    disabled={submitting}
                  />
                </div>
                <div>
                  <label className='form-label fw-bold text-neutral-900' htmlFor='tags'>
                    Tags
                  </label>
                  <input
                    type='text'
                    className='form-control border border-neutral-200 radius-8'
                    id='tags'
                    placeholder='Add tags separated by commas (e.g. #tag1, #tag2)'
                    value={tagsInput}
                    onChange={(event) => setTagsInput(event.target.value)}
                    disabled={submitting}
                  />
                </div>
                <div>
                  <label className='form-label fw-bold text-neutral-900'>
                    Post Content
                  </label>
                  <div className='border border-neutral-200 radius-8 overflow-hidden'>
                    <Editor
                      apiKey='81qrnbgkcadey6vzliszp67sut8lreadzvfkpdicpi2sw8ez'
                      onInit={(_evt, editor) => {
                        editorRef.current = editor;
                      }}
                      value={content}
                      onEditorChange={(value) => setContent(value)}
                    init={{
                      plugins: tinyPlugins,
                      toolbar: tinyToolbar,
                      toolbar_mode: "sliding",
                      quickbars_insert_toolbar: false,
                      branding: false,
                    }}
                      disabled={submitting}
                    />
                  </div>
                </div>
                <div>
                  <label className='form-label fw-bold text-neutral-900'>
                    Upload Thumbnail
                  </label>
                  <div className='upload-image-wrapper'>
                    {displayedImage ? (
                      <div className='uploaded-img position-relative h-160-px w-100 border input-form-light radius-8 overflow-hidden border-dashed bg-neutral-50'>
                        <button
                          type='button'
                          className='uploaded-img__remove position-absolute top-0 end-0 z-1 text-2xxl line-height-1 me-8 mt-8 d-flex bg-danger-600 w-40-px h-40-px justify-content-center align-items-center rounded-circle'
                          onClick={handleRemoveImage}
                          disabled={submitting}
                        >
                          <iconify-icon icon='radix-icons:cross-2' className='text-2xl text-white'></iconify-icon>
                        </button>
                        <img
                          id='uploaded-img__preview'
                          className='w-100 h-100 object-fit-cover'
                          src={displayedImage}
                          alt='Uploaded'
                        />
                      </div>
                    ) : (
                      <label
                        className={dropZoneClassName}
                        htmlFor='upload-file'
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                      >
                        <iconify-icon
                          icon='solar:camera-outline'
                          className={isDragging ? "text-xl" : "text-xl text-secondary-light"}
                        ></iconify-icon>
                        <span className='fw-semibold'>
                          {isDragging ? "Drop image to upload" : "Click or drag an image here"}
                        </span>
                        <small className='text-neutral-500'>
                          JPG, PNG, or WebP up to 5MB
                        </small>
                        <input
                          id='upload-file'
                          type='file'
                          hidden
                          accept='image/*'
                          onChange={handleFileChange}
                          disabled={submitting}
                        />
                      </label>
                    )}
                  </div>
                </div>
                <div className='d-flex flex-wrap gap-12 justify-content-end'>
                  <button
                    type='button'
                    className='btn btn-outline-secondary radius-8'
                    onClick={handlePreview}
                    disabled={submitting}
                  >
                    Preview
                  </button>
                  <button type='submit' className='btn btn-primary-600 radius-8' disabled={submitting}>
                    {submitting ? (isEditMode ? "Saving..." : "Submitting...") : isEditMode ? "Save Changes" : "Submit"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
      {/* Sidebar Start */}
      <div className='col-lg-4'>
        <div className='d-flex flex-column gap-24'>
          {/* Latest Blog */}
          <div className='card'>
            <div className='card-header border-bottom'>
              <h6 className='text-xl mb-0'>Latest Posts</h6>
            </div>
            <div className='card-body d-flex flex-column gap-24 p-24'>
              {recentLoading ? (
                <div className='d-flex justify-content-center py-32'>
                  <div className='spinner-border text-primary' role='status'>
                    <span className='visually-hidden'>Loading...</span>
                  </div>
                </div>
              ) : recentError ? (
                <div className='alert alert-danger mb-0'>{recentError}</div>
              ) : recentBlogs.length === 0 ? (
                <div className='alert alert-info mb-0'>No other posts found.</div>
              ) : (
                recentBlogs.map((blog) => {
                  const previewImage = resolveImagePath(blog.featuredImage) || FALLBACK_IMAGE;
                  const publicUrl = (PUBLIC_SITE_BASE || '') + '/blogs/' + blog.slug;
                  return (
                    <div className='d-flex align-items-start gap-12 p-12 radius-12 border border-neutral-50 bg-neutral-10' key={blog.id}>
                      <a
                        href={publicUrl}
                        target='_blank'
                        rel='noreferrer'
                        className='blog__thumb overflow-hidden flex-shrink-0 rounded-12'
                        style={{ width: '96px', height: '96px' }}
                      >
                        <img src={previewImage} alt={blog.title} className='w-100 h-100 object-fit-cover' />
                      </a>
                      <div className='blog__content flex-grow-1'>
                        <h6 className='mb-8 text-lg'>
                          <a href={publicUrl} target='_blank' rel='noreferrer' className='text-hover-primary-600 transition-2'>
                            {blog.title}
                          </a>
                        </h6>
                        <p className='text-sm text-neutral-500 mb-0 text-line-2'>
                          {blog.excerpt || 'View blog details'}
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
              <h6 className='text-xl mb-0'>Tags</h6>
            </div>
            <div className='card-body p-24'>
              <ul className='flex-wrap d-flex gap-12 mb-0 list-unstyled'>
                <li>
                  <button type='button' className='btn btn-sm border border-neutral-200 radius-8'>
                    Business
                  </button>
                </li>
                <li>
                  <button type='button' className='btn btn-sm border border-neutral-200 radius-8'>
                    Finance
                  </button>
                </li>
                <li>
                  <button type='button' className='btn btn-sm border border-neutral-200 radius-8'>
                    Marketing
                  </button>
                </li>
                <li>
                  <button type='button' className='btn btn-sm border border-neutral-200 radius-8'>
                    Strategy
                  </button>
                </li>
                <li>
                  <button type='button' className='btn btn-sm border border-neutral-200 radius-8'>
                    AI
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      {previewOpen && previewPayload ? (
        <>
          <div style={modalBackdropStyle} onClick={closePreview} />
          <div style={modalPanelStyle} className='preview-card shadow-lg'>
            <div className='p-24 border-bottom d-flex justify-content-between align-items-center'>
              <h4 className='mb-0'>Preview</h4>
              <button type='button' className='btn btn-sm btn-outline-secondary' onClick={closePreview}>
                Close
              </button>
            </div>
            <div className='p-24'>
              <div className='mb-20'>
                <span className='badge bg-main-100 text-main-600 px-16 py-6 radius-pill fw-semibold text-sm'>
                  {previewPayload.category}
                </span>
                <h3 className='mt-16 mb-12'>{previewPayload.title}</h3>
                <p className='text-neutral-500 mb-2'>
                  By {previewPayload.author} • {new Date().toLocaleDateString()}
                </p>
                {previewPayload.excerpt ? <p className='text-neutral-600'>{previewPayload.excerpt}</p> : null}
              </div>
              <div className='rounded-16 overflow-hidden mb-20' style={{ maxHeight: 360 }}>
                <img
                  src={previewPayload.image}
                  alt={previewPayload.title}
                  className='w-100 h-100 object-fit-cover'
                  style={{ maxHeight: 360 }}
                />
              </div>
              <div
                className='blog-preview-content text-neutral-900'
                dangerouslySetInnerHTML={{ __html: previewPayload.content }}
              />
              {previewPayload.tags.length ? (
                <div className='d-flex flex-wrap gap-8 mt-20'>
                  {previewPayload.tags.map((tag) => (
                    <span key={tag} className='badge bg-neutral-100 text-neutral-700 px-12 py-6 radius-pill'>
                      {tag.startsWith("#") ? tag : `#${tag}`}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};

AddBlogLayer.propTypes = {
  mode: PropTypes.oneOf(["create", "edit"]),
  blogId: PropTypes.string,
};

export default AddBlogLayer;
