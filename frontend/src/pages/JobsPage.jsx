import { useEffect, useMemo, useState } from "react";
import jobService from "../services/jobService";
import { useAuth } from "../context/AuthContext";
import resumeService from "../services/resumeService";
import HeaderOne from "../components/HeaderOne";
import FooterOne from "../components/FooterOne";
import Preloader from "../helper/Preloader";

const JobsPage = () => {
  const { token, user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [query, setQuery] = useState("");
  const [modeFilter, setModeFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [applyingId, setApplyingId] = useState("");
  const [resumeSnapshot, setResumeSnapshot] = useState({});
  const [message, setMessage] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [resumeOverride, setResumeOverride] = useState({});
  const [useCustomResume, setUseCustomResume] = useState(false);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const items = await jobService.listJobs({
        query,
        mode: modeFilter,
        type: typeFilter,
        location: locationFilter,
        tag: tagFilter,
      });
      setJobs(items);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const loadResume = async () => {
      if (!token) return;
      try {
        const r = await resumeService.getMyResume({ token });
        if (r?.data) setResumeSnapshot(r.data);
      } catch (_) {
        // ignore
      }
    };
    loadResume();
  }, [token]);

  useEffect(() => {
    const loadApps = async () => {
      if (!token) {
        setApplications([]);
        return;
      }
      try {
        const data = await jobService.listMyApplications({ token });
        setApplications(data);
      } catch (_) {
        // ignore
      }
    };
    loadApps();
  }, [token]);

  const apply = async (jobId) => {
    if (!token) {
      setMessage("Please sign in to apply.");
      return;
    }
    setApplyingId(jobId);
    setMessage("");
    try {
      await jobService.applyToJob({ jobId, resumeData: resumeSnapshot, token });
      setMessage("Application submitted.");
    } catch (e) {
      setMessage(e?.message || "Unable to apply.");
    } finally {
      setApplyingId("");
    }
  };

  const applyWithCustom = async (jobId) => {
    if (!token) {
      setMessage("Please sign in to apply.");
      return;
    }
    setApplyingId(jobId);
    setMessage("");
    try {
      const payload = useCustomResume ? resumeOverride : resumeSnapshot;
      await jobService.applyToJob({ jobId, resumeData: payload, coverLetter, token });
      setMessage("Application submitted.");
      setCoverLetter("");
    } catch (e) {
      setMessage(e?.message || "Unable to apply.");
    } finally {
      setApplyingId("");
    }
  };

  const myApplications = useMemo(() => applications || [], [applications]);

  return (
    <>
      <Preloader />
      <HeaderOne />
      <section className='job-hero-section bg-main-25 py-80'>
        <div className='container'>
          <div className='row justify-content-center'>
            <div className='col-lg-8 text-center'>
              <h1 className='mb-16'>Find Your Dream Job</h1>
              <p className='text-neutral-500 mb-32'>Search mostly remote, friendly, and verified opportunities.</p>

              <div className='search-box-wrapper p-24 bg-white rounded-16 box-shadow-md'>
                <div className='row g-3'>
                  <div className='col-md-5'>
                    <div className='position-relative'>
                      <input
                        className='common-input ps-48'
                        placeholder='Job title or keyword...'
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                      <i className='ph ph-magnifying-glass position-absolute top-50 start-0 translate-middle-y ms-16 text-neutral-400 text-xl'></i>
                    </div>
                  </div>
                  <div className='col-md-3'>
                    <input
                      className='common-input'
                      placeholder='Location'
                      value={locationFilter}
                      onChange={(e) => setLocationFilter(e.target.value)}
                    />
                  </div>
                  <div className='col-md-4'>
                    <button className='btn btn-main w-100 flex-center gap-8' onClick={loadJobs} disabled={loading}>
                      {loading ? "Searching..." : (
                        <>
                          <i className='ph ph-magnifying-glass'></i> Search Jobs
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className='d-flex flex-wrap gap-12 mt-16 pt-16 border-top border-neutral-30'>
                  <select className='common-input py-8 px-16 h-auto w-auto text-sm bg-neutral-20 border-0 rounded-pill' value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                    <option value=''>All Types</option>
                    <option value='full'>Full-time</option>
                    <option value='part'>Part-time</option>
                    <option value='intern'>Internship</option>
                  </select>
                  <select className='common-input py-8 px-16 h-auto w-auto text-sm bg-neutral-20 border-0 rounded-pill' value={modeFilter} onChange={(e) => setModeFilter(e.target.value)}>
                    <option value=''>All Modes</option>
                    <option value='remote'>Remote</option>
                    <option value='onsite'>Onsite</option>
                    <option value='hybrid'>Hybrid</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className='py-80 bg-white'>
        <div className='container'>
          {message && (
            <div className={`alert ${message.includes("submitted") ? "alert-success" : "alert-info"} mb-32 rounded-12`}>
              {message}
            </div>
          )}

          <div className='flex-between mb-32'>
            <h3 className='mb-0'>Latest Openings</h3>
            <span className='text-neutral-500'>{jobs.length} jobs found</span>
          </div>

          <div className='row gy-4'>
            {jobs.map((job) => (
              <div className='col-xl-6' key={job._id || job.id}>
                <div className='job-card p-32 border border-neutral-30 rounded-24 transition-2 hover-border-main-600 hover-shadow-md bg-white h-100 d-flex flex-column'>
                  <div className='flex-between align-items-start mb-24'>
                    <div className='d-flex gap-16 align-items-center'>
                      <div className='w-64 h-64 rounded-12 bg-main-50 flex-center text-2xl text-main-600 fw-bold'>
                        {(job.company || "C").charAt(0)}
                      </div>
                      <div>
                        <h5 className='mb-4'>{job.title}</h5>
                        <div className='text-neutral-500 text-sm'>
                          {job.company} • {job.location || "Remote"}
                        </div>
                      </div>
                    </div>
                    <span className='badge bg-neutral-20 text-neutral-600 rounded-pill px-12 py-6 text-sm fw-medium'>
                      {job.type || "Full-time"}
                    </span>
                  </div>

                  <p className='text-neutral-600 mb-24 line-clamp-2'>
                    {job.description || "No description provided for this role."}
                  </p>

                  <div className='d-flex gap-8 flex-wrap mb-24'>
                    {(job.tags || ["Development"]).slice(0, 3).map(tag => (
                      <span key={tag} className='px-12 py-4 rounded-8 bg-neutral-20 text-neutral-600 text-xs fw-medium'>
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className='mt-auto pt-24 border-top border-neutral-30 flex-between gap-16'>
                    {job.applyUrl ? (
                      <a href={job.applyUrl} target='_blank' rel='noreferrer' className='btn btn-outline-main rounded-pill px-24 flex-grow-1'>
                        External Apply
                      </a>
                    ) : (
                      <button
                        className='btn btn-main rounded-pill px-24 flex-grow-1'
                        onClick={() => apply(job._id || job.id)}
                        disabled={!user || applyingId === (job._id || job.id)}
                      >
                        {applyingId === (job._id || job.id) ? "Applying..." : "Easy Apply"}
                      </button>
                    )}
                    <button className='w-48 h-48 rounded-circle border border-neutral-40 text-neutral-500 bg-transparent hover-bg-main-50 hover-text-main-600 transition-1 flex-center'>
                      <i className='ph ph-bookmark-simple text-xl'></i>
                    </button>
                  </div>

                  {/* Optional Custom Cover Letter Toggle */}
                  <div className='mt-16'>
                    <button
                      onClick={() => document.getElementById(`cl-form-${job._id || job.id}`).classList.toggle('d-none')}
                      className='text-sm text-main-600 fw-medium bg-transparent border-0 p-0 hover-text-decoration-underline'
                    >
                      Add Cover Letter?
                    </button>
                    <div id={`cl-form-${job._id || job.id}`} className='d-none mt-16 p-16 bg-neutral-20 rounded-12'>
                      <textarea
                        className='common-input bg-white mb-8 text-sm'
                        rows={3}
                        placeholder='Write a short note...'
                        value={coverLetter}
                        onChange={(e) => setCoverLetter(e.target.value)}
                      />
                      <button
                        className='btn btn-sm btn-main rounded-pill w-100'
                        onClick={() => applyWithCustom(job._id || job.id)}
                        disabled={!user || applyingId === (job._id || job.id)}
                      >
                        Submit with Note
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            ))}
            {!jobs.length && !loading && (
              <div className='col-12 py-40 text-center text-neutral-500'>
                <i className='ph ph-magnifying-glass text-4xl mb-16 d-block opacity-50'></i>
                <p>No jobs found matching your criteria.</p>
              </div>
            )}
          </div>

          {myApplications.length > 0 && (
            <div className='mt-80'>
              <h3 className='mb-24'>My Applications</h3>
              <div className='table-responsive'>
                <table className='table table-borderless align-middle'>
                  <thead className='bg-neutral-20 text-neutral-600 text-sm'>
                    <tr>
                      <th className='p-16 rounded-start-12'>Role</th>
                      <th className='p-16'>Company</th>
                      <th className='p-16'>Applied Date</th>
                      <th className='p-16 rounded-end-12 text-end'>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myApplications.map(app => (
                      <tr key={app._id} className='border-bottom border-neutral-30'>
                        <td className='p-16 fw-bold text-neutral-800'>{app.job?.title || "Unknown"}</td>
                        <td className='p-16 text-neutral-600'>{app.job?.company || "Unknown"}</td>
                        <td className='p-16 text-neutral-500 text-sm'>
                          {new Date(app.appliedAt).toLocaleDateString()}
                        </td>
                        <td className='p-16 text-end'>
                          <span className={`px-12 py-4 rounded-pill text-xs fw-bold text-uppercase ${app.status === 'accepted' ? 'bg-success-100 text-success-600' :
                            app.status === 'rejected' ? 'bg-danger-100 text-danger-600' :
                              'bg-main-50 text-main-600'
                            }`}>
                            {app.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </section>
      <FooterOne />
    </>
  );
};

export default JobsPage;
