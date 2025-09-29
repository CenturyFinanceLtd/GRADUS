import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import useAuth from "../../hook/useAuth";
import { fetchBlogEngagement } from "../../services/adminAnalytics";

const numberFormatter = new Intl.NumberFormat("en-IN");

const RecentActivityOne = () => {
  const { token } = useAuth();
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      if (!token) {
        setBlogs([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetchBlogEngagement({ token, limit: 8 });
        if (!cancelled) {
          setBlogs(Array.isArray(response?.items) ? response.items : []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || "Unable to load blog engagement");
          setBlogs([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const rows = useMemo(() => {
    return blogs.map((blog) => ({
      id: blog.id,
      title: blog.title || "Untitled blog",
      slug: blog.slug,
      views: blog.views || 0,
      comments: blog.comments || 0,
      publishedAt: blog.publishedAt ? new Date(blog.publishedAt) : null,
    }));
  }, [blogs]);

  return (
    <div className='col-xxl-8'>
      <div className='card h-100'>
        <div className='card-header border-bottom bg-base py-16 px-24 d-flex align-items-center justify-content-between'>
          <h6 className='text-lg fw-semibold mb-0'>Blog Engagement</h6>
          <Link
            to='/blogs'
            className='text-primary-600 hover-text-primary d-flex align-items-center gap-1'
          >
            View All
            <iconify-icon icon='solar:alt-arrow-right-linear' className='icon' />
          </Link>
        </div>
        <div className='card-body p-0'>
          {loading ? (
            <div className='d-flex justify-content-center align-items-center py-64'>
              <div className='spinner-border text-primary' role='status'>
                <span className='visually-hidden'>Loading...</span>
              </div>
            </div>
          ) : error ? (
            <div className='p-24 text-center text-danger fw-medium'>{error}</div>
          ) : rows.length === 0 ? (
            <div className='p-24 text-center text-secondary-light'>
              No blog activity has been recorded yet.
            </div>
          ) : (
            <div className='table-responsive scroll-sm'>
              <table className='table bordered-table mb-0 rounded-0 border-0'>
                <thead>
                  <tr>
                    <th scope='col' className='bg-transparent rounded-0'>Blog</th>
                    <th scope='col' className='bg-transparent rounded-0 text-end'>Views</th>
                    <th scope='col' className='bg-transparent rounded-0 text-end'>Comments</th>
                    <th scope='col' className='bg-transparent rounded-0 text-end'>Published</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <div className='d-flex flex-column'>
                          <span className='text-md fw-semibold text-neutral-700'>{row.title}</span>
                          {row.slug ? (
                            <span className='text-sm text-secondary-light'>/{row.slug}</span>
                          ) : null}
                        </div>
                      </td>
                      <td className='text-end'>{numberFormatter.format(row.views)}</td>
                      <td className='text-end'>{numberFormatter.format(row.comments)}</td>
                      <td className='text-end'>
                        {row.publishedAt ? row.publishedAt.toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecentActivityOne;
