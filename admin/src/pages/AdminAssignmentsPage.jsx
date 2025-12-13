import { useEffect, useState } from "react";
import adminAssignments from "../services/adminAssignments";
import adminCourses from "../services/adminCourses";
import useAuth from "../hook/useAuth";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";

const AdminAssignmentsPage = () => {
  const { token } = useAuth();
  const [courseSlug, setCourseSlug] = useState("");
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [form, setForm] = useState({ title: "", description: "", dueDate: "", maxPoints: 100, tags: "" });
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const loadAssignments = async () => {
    if (!courseSlug) return;
    setLoading(true);
    setMessage("");
    try {
      const items = await adminAssignments.fetchAssignments({ courseSlug, token });
      setAssignments(items);
    } catch (e) {
      setMessage(e?.message || "Unable to load assignments");
    } finally {
      setLoading(false);
    }
  };

  const loadSubmissions = async (assignmentId) => {
    setSelectedAssignment(assignmentId);
    setSubmissions([]);
    try {
      const items = await adminAssignments.fetchSubmissions({ assignmentId, token });
      setSubmissions(items);
    } catch (e) {
      setMessage(e?.message || "Unable to load submissions");
    }
  };

  const create = async () => {
    if (!courseSlug || !form.title) {
      setMessage("Course slug and title are required.");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      await adminAssignments.createAssignment({
        token,
        payload: {
          ...form,
          courseSlug,
          tags: form.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        },
      });
      setForm({ title: "", description: "", dueDate: "", maxPoints: 100, tags: "" });
      await loadAssignments();
      setMessage("Assignment created.");
    } catch (e) {
      setMessage(e?.message || "Unable to create assignment.");
    } finally {
      setLoading(false);
    }
  };

  const grade = async (submissionId, score, feedback) => {
    try {
      await adminAssignments.gradeSubmission({ submissionId, score, feedback, token });
      if (selectedAssignment) loadSubmissions(selectedAssignment);
    } catch (e) {
      setMessage(e?.message || "Unable to grade submission.");
    }
  };

  const [courses, setCourses] = useState([]);

  useEffect(() => {
    // Load courses on mount
    const fetchCourses = async () => {
      try {
        const items = await adminCourses.listAdminCourses({ token });
        setCourses(items);
      } catch (e) {
        console.error("Failed to load courses", e);
      }
    };
    fetchCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (courseSlug) {
      loadAssignments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseSlug]);

  return (
    <MasterLayout>
      <Breadcrumb title='Assignments (Admin)' />
      <div className='container-fluid py-4'>
        {message && <div className='alert alert-info'>{message}</div>}

        <div className='card mb-3'>
          <div className='card-body'>
            <div className='row g-3'>
              <div className='col-md-6'>
                <label className='form-label'>Select Course</label>
                <select
                  className='form-select'
                  value={courseSlug}
                  onChange={(e) => setCourseSlug(e.target.value)}
                >
                  <option value=''>-- Select a course --</option>
                  {courses.map((c) => (
                    <option key={c._id} value={c.slug}>
                      {c.title} ({c.slug})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className='card mb-3'>
          <div className='card-body'>
            <h5>Create Assignment</h5>
            <div className='row g-3'>
              <div className='col-md-6'>
                <label className='form-label'>Title</label>
                <input className='form-control' value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className='col-md-6'>
                <label className='form-label'>Due Date</label>
                <input
                  type='datetime-local'
                  className='form-control'
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                />
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
              <div className='col-md-3'>
                <label className='form-label'>Max Points</label>
                <input
                  className='form-control'
                  type='number'
                  value={form.maxPoints}
                  onChange={(e) => setForm({ ...form, maxPoints: Number(e.target.value) })}
                />
              </div>
              <div className='col-md-9'>
                <label className='form-label'>Tags (comma separated)</label>
                <input className='form-control' value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
              </div>
              <div className='col-12'>
                <button className='btn btn-success' onClick={create} disabled={loading}>
                  {loading ? "Saving..." : "Create"}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className='row g-3'>
          <div className='col-md-6'>
            <div className='card h-100'>
              <div className='card-body'>
                <h5 className='mb-3'>Assignments</h5>
                {assignments.map((a) => (
                  <div key={a._id} className='border rounded p-3 mb-2'>
                    <div className='d-flex justify-content-between align-items-start'>
                      <div>
                        <div className='fw-semibold'>{a.title}</div>
                        <div className='text-muted small'>{a.description}</div>
                        {a.dueDate && (
                          <div className='small text-primary'>Due {new Date(a.dueDate).toLocaleString()}</div>
                        )}
                      </div>
                      <button className='btn btn-outline-primary btn-sm' onClick={() => loadSubmissions(a._id)}>
                        View Submissions
                      </button>
                    </div>
                  </div>
                ))}
                {!assignments.length && <div className='text-muted'>No assignments loaded.</div>}
              </div>
            </div>
          </div>
          <div className='col-md-6'>
            <div className='card h-100'>
              <div className='card-body'>
                <h5 className='mb-3'>Submissions</h5>
                {submissions.map((s) => (
                  <div key={s._id} className='border rounded p-3 mb-2'>
                    <div className='fw-semibold'>
                      {s.user?.firstName} {s.user?.lastName} ({s.user?.email})
                    </div>
                    <div className='small text-muted'>Status: {s.status}</div>
                    {s.score != null && (
                      <div className='small text-muted'>
                        Score: {s.score}/{s.maxPoints}
                      </div>
                    )}
                    {s.content && <div className='mt-2 text-sm'>{s.content}</div>}
                    {s.attachmentName && (
                      <div className='small mt-2'>
                        Attachment: {s.attachmentName}{" "}
                        {s.attachmentUrl && (
                          <a href={s.attachmentUrl} target='_blank' rel='noreferrer'>
                            (open)
                          </a>
                        )}
                      </div>
                    )}
                    <div className='d-flex gap-2 mt-2'>
                      <input
                        type='number'
                        className='form-control form-control-sm'
                        placeholder='Score'
                        onChange={(e) => (s._tempScore = e.target.value)}
                      />
                      <input
                        type='text'
                        className='form-control form-control-sm'
                        placeholder='Feedback'
                        onChange={(e) => (s._tempFeedback = e.target.value)}
                      />
                      <button
                        className='btn btn-sm btn-primary'
                        onClick={() => grade(s._id, s._tempScore, s._tempFeedback)}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ))}
                {!submissions.length && <div className='text-muted'>Select an assignment to view submissions.</div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </MasterLayout>
  );
};

export default AdminAssignmentsPage;
