import { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { PROGRAMMES } from "../../data/programmes.js";
import { slugify, stripBrackets } from "../../utils/slugify.js";

const AllCoursesList = () => {
  const courses = useMemo(() => {
    const items = [];
    PROGRAMMES.forEach((p) => {
      (p.courses || []).forEach((c) => {
        items.push({
          programme: p.title,
          name: stripBrackets(c),
          slug: slugify(c),
          url: `/${slugify(p.title)}/${slugify(c)}`,
        });
      });
    });
    return items;
  }, []);

  const location = useLocation();

  return (
    <section className='py-80'>
      <div className='container'>
        <div className='row gy-4'>
          {courses.map((course) => (
            <div key={`${course.programme}-${course.slug}`} className='col-12 col-md-6 col-lg-4'>
              <div className='h-100 p-24 rounded-16 border border-neutral-30 bg-white box-shadow-sm'>
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
      </div>
    </section>
  );
};

export default AllCoursesList;

