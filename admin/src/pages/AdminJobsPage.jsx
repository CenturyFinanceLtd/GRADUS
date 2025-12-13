import { useEffect, useState } from "react";
import adminJobs from "../services/adminJobs";
import useAuth from "../hook/useAuth";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";

const AdminJobsPage = () => {
  const { token } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [applications, setApplications] = useState([]);
  const [form, setForm] = useState({
    title: "",
    company: "",
    location: "",
    type: "Full-time",
    mode: "Remote",
    description: "",
    applyUrl: "",
    tags: "",
    isPublished: false,
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const items = await adminJobs.fetchJobs({ token });
      setJobs(items);
    } catch (e) {
      setMessage(e?.message || "Unable to load jobs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveJob = async () => {
    setLoading(true);
    setMessage("");
    try {
      const payload = {
        ...form,
        tags: form.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      };
      await adminJobs.upsertJob({ token, jobId: selectedJob?._id, payload });
      setForm({
        title: "",
        company: "",
        location: "",
        type: "Full-time",
        mode: "Remote",
        description: "",
        applyUrl: "",
        tags: "",
        isPublished: false,
      });
      setSelectedJob(null);
      await loadJobs();
      setMessage("Job saved.");
    } catch (e) {
      setMessage(e?.message || "Unable to save job.");
    } finally {
      setLoading(false);
    }
  };

  const editJob = (job) => {
    setSelectedJob(job);
    setForm({
      title: job.title || "",
      company: job.company || "",
      location: job.location || "",
      type: job.type || "",
      mode: job.mode || "",
      description: job.description || "",
      applyUrl: job.applyUrl || "",
      tags: (job.tags || []).join(", "),
      isPublished: Boolean(job.isPublished),
    });
  };

  const loadApplications = async (jobId) => {
    setSelectedJob((prev) => prev && prev._id === jobId ? prev : jobs.find((j) => j._id === jobId));
    try {
      const items = await adminJobs.fetchApplications({ token, jobId });
      setApplications(items);
    } catch (e) {
      setMessage(e?.message || "Unable to load applications");
    }
  };

  const updateStatus = async (applicationId, status) => {
    try {
      await adminJobs.updateApplicationStatus({ token, applicationId, status });
      if (selectedJob?._id) loadApplications(selectedJob._id);
    } catch (e) {
      setMessage(e?.message || "Unable to update status");
    }
  };


  return (
    <MasterLayout>
      <Breadcrumb title='Job Publishing (Admin)' />
      <div className='container-fluid py-4'>
        {message && <div className='alert alert-info'>{message}</div>}

        <div className='card mb-3'>
          <div className='card-body'>
            <h5>{selectedJob ? "Edit Job" : "Create Job"}</h5>
            <div className='row g-3'>
              <div className='col-md-6'>
                <label className='form-label'>Title</label>
                <input className='form-control' value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className='col-md-6'>
                <label className='form-label'>Company</label>
                <input className='form-control' value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
              </div>
              <div className='col-md-4'>
                <label className='form-label'>Location</label>
                <input className='form-control' value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </div>
              <div className='col-md-4'>
                <label className='form-label'>Type</label>
                <input className='form-control' value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} />
              </div>
              <div className='col-md-4'>
                <label className='form-label'>Mode</label>
                <input className='form-control' value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })} />
              </div>
              <div className='col-md-12'>
                <label className='form-label'>Description</label>
                <textarea
                  className='form-control'
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className='col-md-8'>
                <label className='form-label'>Apply URL (optional)</label>
                <input className='form-control' value={form.applyUrl} onChange={(e) => setForm({ ...form, applyUrl: e.target.value })} />
              </div>
              <div className='col-md-4 d-flex align-items-end gap-2'>
                <div className='form-check'>
                  <input
                    className='form-check-input'
                    type='checkbox'
                    id='job-publish'
                    checked={form.isPublished}
                    onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
                  />
                  <label className='form-check-label' htmlFor='job-publish'>
                    Publish
                  </label>
                </div>
              </div>
              <div className='col-md-12'>
                <label className='form-label'>Tags (comma separated)</label>
                <input className='form-control' value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
              </div>
              <div className='col-12'>
                <button className='btn btn-success' onClick={saveJob} disabled={loading}>
                  {loading ? "Saving..." : "Save Job"}
                </button>
                {selectedJob && (
                  <button className='btn btn-outline-secondary ms-2' onClick={() => setSelectedJob(null)}>
                    New
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className='row g-3'>
          <div className='col-md-6'>
            <div className='card h-100'>
              <div className='card-body'>
                <h5 className='mb-3'>Jobs</h5>
                {jobs.map((job) => (
                  <div key={job._id} className='border rounded p-3 mb-2'>
                    <div className='d-flex justify-content-between align-items-start'>
                      <div>
                        <div className='fw-semibold'>{job.title}</div>
                        <div className='small text-muted'>{job.company}</div>
                        <div className='small text-muted'>{job.isPublished ? "Published" : "Draft"}</div>
                      </div>
                      <div className='d-flex gap-2'>
                        <button className='btn btn-sm btn-outline-primary' onClick={() => editJob(job)}>
                          Edit
                        </button>
                        <button className='btn btn-sm btn-outline-secondary' onClick={() => loadApplications(job._id)}>
                          Applications
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {!jobs.length && <div className='text-muted'>No jobs yet.</div>}
              </div>
            </div>
          </div>
          <div className='col-md-6'>
            <div className='card h-100'>
              <div className='card-body'>
                <h5 className='mb-3'>Applications</h5>
                {applications.map((app) => (
                  <div key={app._id} className='border rounded p-3 mb-2'>
                    <div className='fw-semibold'>
                      {app.user?.firstName} {app.user?.lastName} ({app.user?.email})
                    </div>
                    <div className='small text-muted'>Status: {app.status}</div>
                    {app.coverLetter && <div className='mt-2 text-sm'>{app.coverLetter}</div>}
                    <div className='d-flex gap-2 mt-2'>
                      {["submitted", "review", "accepted", "rejected"].map((status) => (
                        <button
                          key={status}
                          className={`btn btn-sm ${app.status === status ? "btn-primary" : "btn-outline-primary"}`}
                          onClick={() => updateStatus(app._id, status)}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                {!applications.length && <div className='text-muted'>Select a job to view applications.</div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </MasterLayout>
  );

};

export default AdminJobsPage;
