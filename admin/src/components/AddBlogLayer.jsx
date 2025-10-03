import { useEffect, useRef, useState } from "react";
import { Editor } from "@tinymce/tinymce-react";
import { Link } from "react-router-dom";
import useAuth from "../hook/useAuth";
import { createBlog } from "../services/adminBlogs";

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
  "codesample",
  "emoticons",
  "link",
  "lists",
  "media",
  "searchreplace",
  "table",
  "visualblocks",
  "wordcount",
  "checklist",
  "mediaembed",
  "casechange",
  "formatpainter",
  "pageembed",
  "a11ychecker",
  "tinymcespellchecker",
  "permanentpen",
  "powerpaste",
  "advtable",
  "advcode",
  "advtemplate",
  "ai",
  "uploadcare",
  "mentions",
  "tinycomments",
  "tableofcontents",
  "footnotes",
  "mergetags",
  "autocorrect",
  "typography",
  "inlinecss",
  "markdown",
  "importword",
  "exportword",
  "exportpdf",
];

const tinyToolbar = [
  "undo redo | blocks fontfamily fontsize | bold italic underline strikethrough",
  "| link media table mergetags | addcomment showcomments | spellcheckdialog a11ycheck typography uploadcare",
  "| align lineheight | checklist numlist bullist indent outdent | emoticons charmap | removeformat",
].join(" ");

const mergeTags = [
  { value: "First.Name", title: "First Name" },
  { value: "Email", title: "Email" },
];

const AddBlogLayer = () => {
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
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);
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

  const handleFileChange = (event) => {
    if (!event.target.files || event.target.files.length === 0) {
      return;
    }

    const file = event.target.files[0];
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
    setImageFile(file);
  };

  const handleRemoveImage = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(null);
    setImageFile(null);
  };

  useEffect(() => {
    setAuthor(defaultAuthor);
  }, [defaultAuthor]);

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
        message: "Authentication is required to create a blog post.",
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
      if (normalizedTags.length > 0) {
        formData.append("tags", JSON.stringify(normalizedTags));
      }
      if (excerpt.trim()) {
        formData.append("excerpt", excerpt.trim());
      }
      if (imageFile) {
        formData.append("featuredImage", imageFile);
      }

      await createBlog({ token, data: formData });

      setFeedback({
        type: "success",
        message: "Blog post created successfully.",
      });

      setTitle("");
      setSlug("");
      setAuthor(defaultAuthor);
      setCategory("");
      setExcerpt("");
      setTagsInput("");
      setContent("");
      handleRemoveImage();
      if (editor) {
        editor.setContent("");
      }
    } catch (error) {
      setFeedback({
        type: "error",
        message: error.message || "Failed to create blog post.",
      });
    } finally {
      setSubmitting(false);
    }
  };

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
            <h6 className='text-xl mb-0'>Add New Post</h6>
          </div>
          <div className='card-body p-24'>
            <form className='d-flex flex-column gap-20' onSubmit={handleSubmit} noValidate>
              {feedback ? (
                <div className={alertClass} role='alert'>
                  {feedback.message}
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
                      tinycomments_mode: "embedded",
                      tinycomments_author: "Author name",
                      mergetags_list: mergeTags,
                      ai_request: (request, respondWith) =>
                        respondWith.string(() =>
                          Promise.reject("See docs to implement AI Assistant")
                        ),
                      uploadcare_public_key: "584aeef27549301d757a",
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
                  {imagePreview ? (
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
                        src={imagePreview}
                        alt='Uploaded'
                      />
                    </div>
                  ) : (
                    <label
                      className='upload-file h-160-px w-100 border input-form-light radius-8 overflow-hidden border-dashed bg-neutral-50 bg-hover-neutral-200 d-flex align-items-center flex-column justify-content-center gap-1'
                      htmlFor='upload-file'
                    >
                      <iconify-icon icon='solar:camera-outline' className='text-xl text-secondary-light'></iconify-icon>
                      <span className='fw-semibold text-secondary-light'>
                        Upload
                      </span>
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
              <button type='submit' className='btn btn-primary-600 radius-8' disabled={submitting}>
                {submitting ? "Submitting..." : "Submit"}
              </button>
            </form>
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
              <div className='d-flex flex-wrap'>
                <Link to='/blog-details' className='blog__thumb w-100 radius-12 overflow-hidden'>
                  <img
                    src='assets/images/blog/blog1.png'
                    alt='Gradus'
                    className='w-100 h-100 object-fit-cover'
                  />
                </Link>
                <div className='blog__content'>
                  <h6 className='mb-8'>
                    <Link to='/blog-details' className='text-line-2 text-hover-primary-600 text-md transition-2'>
                      How to hire a right business executive for your company
                    </Link>
                  </h6>
                  <p className='text-line-2 text-sm text-neutral-500 mb-0'>
                    Lorem ipsum dolor sit amet consectetur adipisicing elit. Omnis dolores explicabo corrupti, fuga necessitatibus fugiat adipisci quidem eveniet enim minus.
                  </p>
                </div>
              </div>
              <div className='d-flex flex-wrap'>
                <Link to='/blog-details' className='blog__thumb w-100 radius-12 overflow-hidden'>
                  <img
                    src='assets/images/blog/blog2.png'
                    alt='Gradus'
                    className='w-100 h-100 object-fit-cover'
                  />
                </Link>
                <div className='blog__content'>
                  <h6 className='mb-8'>
                    <Link to='/blog-details' className='text-line-2 text-hover-primary-600 text-md transition-2'>
                      The Gig Economy: Adapting to a Flexible Workforce
                    </Link>
                  </h6>
                  <p className='text-line-2 text-sm text-neutral-500 mb-0'>
                    Lorem ipsum dolor sit amet consectetur adipisicing elit. Omnis dolores explicabo corrupti, fuga necessitatibus fugiat adipisci quidem eveniet enim minus.
                  </p>
                </div>
              </div>
              <div className='d-flex flex-wrap'>
                <Link to='/blog-details' className='blog__thumb w-100 radius-12 overflow-hidden'>
                  <img
                    src='assets/images/blog/blog3.png'
                    alt='Gradus'
                    className='w-100 h-100 object-fit-cover'
                  />
                </Link>
                <div className='blog__content'>
                  <h6 className='mb-8'>
                    <Link to='/blog-details' className='text-line-2 text-hover-primary-600 text-md transition-2'>
                      The Future of Remote Work: Strategies for Success
                    </Link>
                  </h6>
                  <p className='text-line-2 text-sm text-neutral-500 mb-0'>
                    Lorem ipsum dolor sit amet consectetur adipisicing elit. Omnis dolores explicabo corrupti, fuga necessitatibus fugiat adipisci quidem eveniet enim minus.
                  </p>
                </div>
              </div>
              <div className='d-flex flex-wrap'>
                <Link to='/blog-details' className='blog__thumb w-100 radius-12 overflow-hidden'>
                  <img
                    src='assets/images/blog/blog4.png'
                    alt='Gradus'
                    className='w-100 h-100 object-fit-cover'
                  />
                </Link>
                <div className='blog__content'>
                  <h6 className='mb-8'>
                    <Link to='/blog-details' className='text-line-2 text-hover-primary-600 text-md transition-2'>
                      Lorem ipsum dolor sit amet consectetur adipisicing.
                    </Link>
                  </h6>
                  <p className='text-line-2 text-sm text-neutral-500 mb-0'>
                    Lorem ipsum dolor sit amet consectetur adipisicing elit. Omnis dolores explicabo corrupti, fuga necessitatibus fugiat adipisci quidem eveniet enim minus.
                  </p>
                </div>
              </div>
              <div className='d-flex flex-wrap'>
                <Link to='/blog-details' className='blog__thumb w-100 radius-12 overflow-hidden'>
                  <img
                    src='assets/images/blog/blog5.png'
                    alt='Gradus'
                    className='w-100 h-100 object-fit-cover'
                  />
                </Link>
                <div className='blog__content'>
                  <h6 className='mb-8'>
                    <Link to='/blog-details' className='text-line-2 text-hover-primary-600 text-md transition-2'>
                      How to hire a right business executive for your company
                    </Link>
                  </h6>
                  <p className='text-line-2 text-sm text-neutral-500 mb-0'>
                    Lorem ipsum dolor sit amet consectetur adipisicing elit. Omnis dolores explicabo corrupti, fuga necessitatibus fugiat adipisci quidem eveniet enim minus.
                  </p>
                </div>
              </div>
              <div className='d-flex flex-wrap'>
                <Link to='/blog-details' className='blog__thumb w-100 radius-12 overflow-hidden'>
                  <img
                    src='assets/images/blog/blog6.png'
                    alt='Gradus'
                    className='w-100 h-100 object-fit-cover'
                  />
                </Link>
                <div className='blog__content'>
                  <h6 className='mb-8'>
                    <Link to='/blog-details' className='text-line-2 text-hover-primary-600 text-md transition-2'>
                      The Gig Economy: Adapting to a Flexible Workforce
                    </Link>
                  </h6>
                  <p className='text-line-2 text-sm text-neutral-500 mb-0'>
                    Lorem ipsum dolor sit amet consectetur adipisicing elit. Omnis dolores explicabo corrupti, fuga necessitatibus fugiat adipisci quidem eveniet enim minus.
                  </p>
                </div>
              </div>
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
    </div>
  );
};

export default AddBlogLayer;
