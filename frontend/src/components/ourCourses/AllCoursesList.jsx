import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { PROGRAMMES } from "../../data/programmes.js";
import { API_BASE_URL } from "../../services/apiClient";
import { slugify, stripBrackets } from "../../utils/slugify.js";

const AllCoursesList = () => {
  const location = useLocation();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const sort = useMemo(() => (searchParams.get('sort') || '').toLowerCase(), [searchParams]);

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const programmeLabel = (slug) => {
    const map = {
      'gradus-x': 'Gradus X',
      'gradus-finlit': 'Gradus Finlit',
      'gradus-lead': 'Gradus Lead',
    };
    return map[slug] || (slug ? slug.replace(/-/g, ' ') : '');
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const qs = sort ? `?sort=${encodeURIComponent(sort)}` : '';
        const resp = await fetch(`${API_BASE_URL}/courses${qs}`, { credentials: 'include' });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        const items = Array.isArray(data?.items) ? data.items : [];
        const mapped = items.map((it) => {
          const slug = it.slug || it.id || '';
          const [progSlug] = String(slug).split('/');
          return {
            programme: it.programme || programmeLabel(progSlug),
            name: stripBrackets(it.name || ''),
            slug,
            url: `/${slug}`,
            imageUrl: it.imageUrl || (it.image && it.image.url) || '',
          };
        });
        if (!cancelled) setCourses(mapped);
      } catch (e) {
        // Fallback to static list if API fails
        if (!cancelled) {
          const fallback = [];
          PROGRAMMES.forEach((p) => {
            const pslug = p.slug || slugify(p.title);
            (p.courses || []).forEach((c) => {
              const label = typeof c === 'string' ? c : (c?.name || c?.title || '');
              const cslug = typeof c === 'string' ? slugify(c) : (c?.slug || slugify(label));
              fallback.push({ programme: p.title, name: stripBrackets(label), slug: cslug, url: `/${pslug}/${cslug}` });
            });
          });
          setCourses(fallback);
          setError(e?.message || 'Failed to load');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [sort]);

  return (
    <section className='py-80'>
      <div className='container'>
        <div className='row gy-4'>
          {courses.map((course) => (
            <div key={`${course.programme}-${course.slug}`} className='col-12 col-md-6 col-lg-4'>
              <div className='h-100 p-24 rounded-16 border border-neutral-30 bg-white box-shadow-sm'>
                {course.imageUrl ? (
                  <div className='mb-12'>
                    <img src={course.imageUrl} alt={course.name} style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 12 }} />
                  </div>
                ) : null}
                <div className='d-flex flex-column h-100'>
                  <span className='text-sm text-neutral-600 mb-6'>{course.programme}</span>
                  <h5 className='mb-12 text-neutral-900'>{course.name}</h5>
                  <div className='mt-auto d-flex gap-8'>
                    <Link to={course.url} className='btn btn-main btn-sm'>Explore</Link>
                    <Link to={{ pathname: course.url, search: location.search }} className='btn btn-outline-main-600 btn-sm'>Details</Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        {loading ? (
          <div className='text-center mt-16 text-neutral-600'>Loading courses…</div>
        ) : null}
        {(!loading && courses.length === 0) ? (
          <div className='text-center mt-16 text-neutral-600'>No courses found</div>
        ) : null}
      </div>
    </section>
  );
};

export default AllCoursesList;
