import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import useAuth from "../hook/useAuth";
import { deleteBlog, fetchBlogs } from "../services/adminBlogs";
import { ASSET_BASE_URL, PUBLIC_SITE_BASE } from "../config/env";

const PLACEHOLDER_IMAGE = "/assets/images/blog/blog-placeholder.png";

const BlogLayer = () => {
  const { token } = useAuth();
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [actionError, setActionError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadBlogs = async () => {
      if (!token) {
        return;
      }

      setLoading(true);
      setError(null);
      setActionError(null);

      try {
        const response = await fetchBlogs({ token });
        if (!isMounted) {
          return;
        }
        setBlogs(response?.items || []);
      } catch (err) {
        if (!isMounted) {
          return;
        }
        setError(err?.message || "Failed to load blogs");
        setBlogs([]);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadBlogs();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const categories = useMemo(() => {
    const unique = new Set();
    blogs.forEach((blog) => {
      if (blog.category) {
        unique.add(blog.category);
      }
    });
    return Array.from(unique).sort();
  }, [blogs]);

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

  const filteredBlogs = useMemo(() => {
    return blogs.filter((blog) => {
      const matchesSearch = search
        ? (blog.title || "").toLowerCase().includes(search.toLowerCase()) ||
          (blog.slug || "").toLowerCase().includes(search.toLowerCase())
        : true;
      const matchesCategory = categoryFilter ? blog.category === categoryFilter : true;
      return matchesSearch && matchesCategory;
    });
  }, [blogs, search, categoryFilter]);

  const handleDelete = async (blog) => {
    if (!blog?.id || !token) {
      return;
    }

    const confirmed = window.confirm(
      `Delete the blog "${blog.title || "Untitled"}"? This action cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(blog.id);
    setActionError(null);

    try {
      await deleteBlog({ blogId: blog.id, token });
      setBlogs((previous) => previous.filter((item) => item.id !== blog.id));
    } catch (err) {
      setActionError(err?.message || "Failed to delete blog");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className='card p-24'>
      <div className='d-flex flex-wrap gap-16 justify-content-between align-items-center mb-24'>
        <div>
          <h5 className='mb-8'>Blogs Overview</h5>
          <p className='text-neutral-500 mb-0'>Manage published blogs, views, and comment activity.</p>
        </div>
        <div className='d-flex flex-wrap gap-12'>
          <input
            type='search'
            className='form-control border-neutral-30 radius-8'
            placeholder='Search by title or slug'
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select
            className='form-select border-neutral-30 radius-8'
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
          >
            <option value=''>All Categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <Link to='/add-blog' className='btn btn-primary-600 radius-8'>
            Add Blog
          </Link>
        </div>
      </div>

      {actionError ? (
        <div className='alert alert-danger mb-24' role='alert'>
          {actionError}
        </div>
      ) : null}

      {loading ? (
        <div className='d-flex justify-content-center py-64'>
          <div className='spinner-border text-primary' role='status'>
            <span className='visually-hidden'>Loading...</span>
          </div>
        </div>
      ) : error ? (
        <div className='alert alert-danger mb-0' role='alert'>
          {error}
        </div>
      ) : filteredBlogs.length === 0 ? (
        <div className='alert alert-info mb-0' role='alert'>
          No blogs found.
        </div>
      ) : (
        <div className='table-responsive'>
          <table className='table align-middle'>
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Views</th>
                <th>Comments</th>
                <th>Published</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredBlogs.map((blog) => (
                <tr key={blog.id}>
                  <td>
                    <div className='d-flex align-items-center gap-12'>
                      <img
                        src={resolveImage(blog.featuredImage)}
                        alt={blog.title}
                        className='rounded-8 object-fit-cover'
                        style={{ width: '56px', height: '56px' }}
                      />
                      <div className='d-flex flex-column'>
                        <Link to={'/blog-details/' + blog.id} className='fw-semibold text-neutral-900 text-hover-primary-600'>
                          {blog.title}
                        </Link>
                        <span className='text-sm text-neutral-500'>{blog.slug}</span>
                      </div>
                    </div>
                  </td>
                  <td>{blog.category || 'Uncategorized'}</td>
                  <td>{blog.meta?.views ?? 0}</td>
                  <td>{blog.meta?.comments ?? 0}</td>
                  <td>{blog.publishedAt ? new Date(blog.publishedAt).toLocaleDateString() : '—'}</td>
                  <td className='text-end'>
                    <div className='d-flex gap-8 justify-content-end'>
                      <Link to={'/blog-details/' + blog.id} className='btn btn-sm btn-primary-600 radius-8'>
                        Manage
                      </Link>
                      <a
                        href={PUBLIC_SITE_BASE + '/blogs/' + blog.slug}
                        target='_blank'
                        rel='noreferrer'
                        className='btn btn-sm btn-outline-primary radius-8'
                      >
                        View Public
                      </a>
                      <button
                        type='button'
                        className='btn btn-sm btn-outline-danger radius-8'
                        onClick={() => handleDelete(blog)}
                        disabled={deletingId === blog.id}
                      >
                        {deletingId === blog.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default BlogLayer;
