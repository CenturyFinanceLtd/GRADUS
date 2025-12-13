import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import ReactSlider from "react-slider";
import jobService from "../services/jobService";
import "../styles/jobs-card.css";

const TuitionJobs = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [values, setValues] = useState([100, 1000]);

  const [sidebarActive, setSidebarActive] = useState(false);
  const sidebarControl = () => {
    setSidebarActive(!sidebarActive);
  };

  useEffect(() => {
    const loadJobs = async () => {
      try {
        setLoading(true);
        const data = await jobService.fetchJobs();
        setJobs(data);
      } catch (err) {
        setError("Failed to load jobs");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadJobs();
  }, []);

  // Filter Logic
  const filteredJobs = jobs.filter((job) => {
    const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (job.description && job.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesLocation = locationFilter ? job.location.toLowerCase().includes(locationFilter.toLowerCase()) : true;

    // Simple logic for price would require parsing, skipping for now to prioritize simple text search
    return matchesSearch && matchesLocation;
  });

  return (
    <section
      className='course-list-view py-120 background-img bg-img'
      data-background-image='assets/images/bg/gradient-bg.png'
    >
      <div className={`side-overlay ${sidebarActive ? "show" : ""}`}></div>
      <div className='container'>
        <div className='row'>
          <div className='col-lg-4'>
            <div
              className={`sidebar rounded-12 bg-white p-32 box-shadow-md ${sidebarActive ? "active" : ""
                }`}
            >
              <form onSubmit={(e) => e.preventDefault()}>
                <div className='flex-between mb-24'>
                  <h4 className='mb-0'>Filter</h4>
                  <button
                    type='button'
                    onClick={sidebarControl}
                    className='sidebar-close text-xl text-neutral-500 d-lg-none hover-text-main-600'
                  >
                    <i className='ph-bold ph-x' />
                  </button>
                </div>
                <div className='position-relative'>
                  <input
                    type='text'
                    className='common-input pe-48 rounded-pill bg-main-25'
                    placeholder='Search keyword...'
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <button
                    type='button'
                    className='text-neutral-500 text-xl d-flex position-absolute top-50 translate-middle-y inset-inline-end-0 me-24 hover-text-main-600'
                  >
                    <i className='ph-bold ph-magnifying-glass' />
                  </button>
                </div>

                <div className=''>
                  <h6 className='text-lg mb-20 fw-medium mt-32'>Location</h6>
                  <input
                    type='text'
                    className='common-input border-transparent rounded-pill focus-border-main-600 bg-main-25'
                    placeholder='Enter location...'
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                  />
                </div>

                <div className='position-relative mt-32'>
                  <h6 className='text-lg mb-24 fw-semibold'>Pricing scale</h6>
                  <div className='custom--range'>
                    <ReactSlider
                      className='horizontal-slider'
                      thumbClassName='thumb'
                      trackClassName='track'
                      defaultValue={[100, 1000]}
                      min={0}
                      max={1000}
                      value={values}
                      onChange={(newValues) => setValues(newValues)}
                      pearling
                      minDistance={10}
                    />
                    <div className='custom--range__content'>
                      <input
                        type='text'
                        readOnly
                        className='custom--range__prices text-neutral-600 text-center bg-transparent border-0 outline-0'
                        value={`$${values[0]} - $${values[1]}`}
                      />
                    </div>
                  </div>
                </div>

                <span className='d-block border border-neutral-30 border-dashed my-32' />
                <button
                  type='button'
                  onClick={() => { setSearchTerm(""); setLocationFilter(""); }}
                  className='btn btn-outline-main rounded-pill flex-center gap-16 fw-semibold w-100'
                >
                  <i className='ph-bold ph-arrow-clockwise d-flex text-lg' />
                  Reset Filters
                </button>
              </form>
            </div>
          </div>

          <div className='col-lg-8'>
            <div className='flex-between gap-16 flex-wrap mb-40'>
              <span className='text-neutral-500'>Showing {filteredJobs.length} of {jobs.length} Results</span>
              <div className='flex-align gap-16'>
                {/* Sort hidden for simplicity or can be re-enabled */}
                <button
                  type='button'
                  onClick={sidebarControl}
                  className='list-bar-btn text-xl w-40 h-40 bg-main-600 text-white rounded-8 flex-center d-lg-none'
                >
                  <i className='ph-bold ph-funnel' />
                </button>
              </div>
            </div>

            <div className='jobs-grid'>
              {loading ? (
                // Skeleton State
                [1, 2, 3, 4].map(i => (
                  <div key={i} className='skeleton-card'></div>
                ))
              ) : error ? (
                <div className="col-12 text-center text-danger">{error}</div>
              ) : filteredJobs.length === 0 ? (
                <div className="col-12 text-center">No jobs found.</div>
              ) : (
                filteredJobs.map((job) => (
                  <div key={job._id} className="job-card">
                    <div className="job-header">
                      <div className="company-logo">
                        {job.company ? job.company.charAt(0).toUpperCase() : 'G'}
                      </div>
                      <span className="job-type-badge">{job.type}</span>
                    </div>

                    <div className="job-content">
                      <h3 className="job-title">{job.title}</h3>
                      <p className="company-name">{job.company}</p>

                      <div className="job-details">
                        <div className="job-detail-item">
                          <i className="ph-bold ph-map-pin job-detail-icon"></i>
                          <span>{job.location}</span>
                        </div>
                        <div className="job-detail-item">
                          <i className="ph-bold ph-currency-dollar job-detail-icon"></i>
                          <span className="job-salary">{job.salary || 'Negotiable'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="job-footer">
                      <span className="posted-date">Posted {new Date(job.postedAt).toLocaleDateString()}</span>
                      <Link to={`/contact`} className="apply-btn">
                        Apply Now <i className="ph-bold ph-arrow-right"></i>
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TuitionJobs;
