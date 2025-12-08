import { useEffect, useMemo, useRef, useState } from "react";
import MasterLayout from "../masterLayout/MasterLayout";
import PageTitle from "../components/PageTitle";
import { listAdminCourses } from "../services/adminCourses";
import { fetchCourseDetail } from "../services/adminCourseDetails";
import {
  deleteAssessmentSet,
  generateAssessment,
  listAssessments,
  uploadSyllabusAssessments,
  fetchAssessmentProgress,
  cancelAssessmentJob,
} from "../services/adminAssessments";
import useAuth from "../hook/useAuth";
import { formatDistanceToNow } from "date-fns";

const Card = ({ title, children, footer }) => (
  <div className='card mb-24'>
    <div className='card-header d-flex align-items-center justify-content-between'>
      <h5 className='mb-0'>{title}</h5>
    </div>
    <div className='card-body'>{children}</div>
    {footer ? <div className='card-footer d-flex justify-content-end gap-2'>{footer}</div> : null}
  </div>
);

const AssessmentRow = ({ item, onDelete, deletingId }) => {
  const questionCount = Array.isArray(item?.questions) ? item.questions.length : 0;
  const updatedLabel = item?.generatedAt
    ? formatDistanceToNow(new Date(item.generatedAt), { addSuffix: true })
    : item?.updatedAt
      ? formatDistanceToNow(new Date(item.updatedAt), { addSuffix: true })
      : "—";
  const moduleLabel = item?.moduleIndex
    ? `Module ${item.moduleIndex}${item.moduleTitle ? `: ${item.moduleTitle}` : ""}`
    : "Course";
  const weekLabel = item?.weekIndex
    ? `Week ${item.weekIndex}${item.weekTitle ? `: ${item.weekTitle}` : ""}`
    : item?.moduleIndex
      ? "Whole module"
      : "—";

  return (
    <tr>
      <td className='fw-semibold'>{item?.title || "Untitled set"}</td>
      <td>{moduleLabel}</td>
      <td>{weekLabel}</td>
      <td>{item?.level || "—"}</td>
      <td>{item?.initialQuestionCount || questionCount}</td>
      <td className="text-primary fw-bold">{questionCount}</td>
      <td>{item?.source === "ai" ? "AI-generated" : item?.source || "—"}</td>
      <td className='text-muted small'>{updatedLabel}</td>
      <td>
        <button
          type='button'
          className='btn btn-sm btn-outline-danger'
          onClick={() => onDelete?.(item)}
          disabled={deletingId === item?.id}
        >
          {deletingId === item?.id ? "Deleting..." : "Delete"}
        </button>
      </td>
    </tr>
  );
};

const CourseAssessmentsPage = () => {
  const { token } = useAuth();
  const [courses, setCourses] = useState([]);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [assessments, setAssessments] = useState([]);
  const [loadingAssessments, setLoadingAssessments] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [flash, setFlash] = useState("");
  const [error, setError] = useState("");
  const [courseDetail, setCourseDetail] = useState(null);
  const [selectedModuleIndex, setSelectedModuleIndex] = useState("");
  const [selectedWeekIndex, setSelectedWeekIndex] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [questionCount, setQuestionCount] = useState("");
  const [syllabusFile, setSyllabusFile] = useState(null);
  const [syllabusFileName, setSyllabusFileName] = useState("");
  const [syllabusText, setSyllabusText] = useState("");
  const [uploadingSyllabus, setUploadingSyllabus] = useState(false);
  const [syllabusProgress, setSyllabusProgress] = useState(0);
  const syllabusInputRef = useRef(null);
  const [deletingId, setDeletingId] = useState("");
  const [jobProgress, setJobProgress] = useState({ status: "", completed: 0, total: 0 });
  const [jobId, setJobId] = useState("");
  const pollRef = useRef(null);

  const selectedCourse = useMemo(
    () => courses.find((c) => c.slug === selectedSlug) || null,
    [courses, selectedSlug]
  );

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const loadCourses = async () => {
      try {
        setLoadingCourses(true);
        const list = await listAdminCourses({ token });
        if (!cancelled) {
          setCourses(list);
          if (!selectedSlug && list.length) {
            setSelectedSlug(list[0].slug);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || "Failed to load courses.");
        }
      } finally {
        if (!cancelled) {
          setLoadingCourses(false);
        }
      }
    };
    loadCourses();
    return () => {
      cancelled = true;
    };
  }, [token, selectedSlug]);

  useEffect(() => {
    if (!token || !selectedSlug) return;
    let cancelled = false;
    const loadAssessments = async () => {
      try {
        setLoadingAssessments(true);
        setError("");
        const items = await listAssessments({ token, courseSlug: selectedSlug });
        if (!cancelled) {
          setAssessments(items);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || "Failed to load assessments.");
        }
      } finally {
        if (!cancelled) {
          setLoadingAssessments(false);
        }
      }
    };
    loadAssessments();
    return () => {
      cancelled = true;
    };
  }, [token, selectedSlug]);

  useEffect(() => {
    if (!token || !selectedSlug) return;
    let cancelled = false;
    const loadDetail = async () => {
      try {
        const detail = await fetchCourseDetail({ slug: selectedSlug, token });
        if (!cancelled) {
          setCourseDetail(detail);
          setSelectedModuleIndex("");
          setSelectedWeekIndex("");
        }
      } catch (err) {
        if (!cancelled) {
          setCourseDetail(null);
          setError(err?.message || "Failed to load course detail.");
        }
      }
    };
    loadDetail();
    return () => {
      cancelled = true;
    };
  }, [token, selectedSlug]);

  const handleGenerate = async () => {
    if (!selectedSlug || !token) return;
    setGenerating(true);
    setFlash("");
    setError("");
    setJobProgress({ status: "running", completed: 0, total: 0 });
    try {
      const resp = await generateAssessment({
        token,
        courseSlug: selectedSlug,
        programmeSlug: selectedCourse?.programmeSlug || selectedCourse?.programme,
        level: selectedLevel || undefined,
        questionCount: questionCount ? Number(questionCount) : undefined,
        moduleIndex: selectedModuleIndex ? Number(selectedModuleIndex) : undefined,
        weekIndex: selectedWeekIndex ? Number(selectedWeekIndex) : undefined,
      });
      if (resp?.jobId) {
        setJobId(resp.jobId);
        const poll = async () => {
          try {
            const status = await fetchAssessmentProgress({
              token,
              courseSlug: selectedSlug,
              programmeSlug: selectedCourse?.programmeSlug || selectedCourse?.programme,
              moduleIndex: selectedModuleIndex ? Number(selectedModuleIndex) : undefined,
              weekIndex: selectedWeekIndex ? Number(selectedWeekIndex) : undefined,
            });
            if (status) {
              setJobProgress({
                status: status.status,
                completed: status.completed || 0,
                total: status.totalTarget || 0,
              });
              if (status.status === "completed") {
                const items = await listAssessments({ token, courseSlug: selectedSlug });
                setAssessments(items);
                setFlash("Assessment generation completed.");
                setGenerating(false);
                setJobProgress((prev) => ({ ...prev, status: "completed" }));
                if (pollRef.current) {
                  clearInterval(pollRef.current);
                  pollRef.current = null;
                }
                return;
              }
              if (status.status === "failed") {
                setError(status.error || "Generation failed.");
                setGenerating(false);
                if (pollRef.current) {
                  clearInterval(pollRef.current);
                  pollRef.current = null;
                }
                return;
              }
            }
          } catch (err) {
            setError(err?.message || "Failed to fetch progress.");
          }
        };
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = setInterval(poll, 2000);
        await poll();
      } else {
        setFlash("Generation started.");
      }
    } catch (err) {
      setError(err?.message || "Generation failed.");
    } finally {
      // generating flag cleared by poll on completion/failure
    }
  };

  // Auto-resume progress polling on refresh/page load
  useEffect(() => {
    if (!token || !selectedSlug) return;
    const startPoll = () => {
      const poll = async () => {
        try {
          const status = await fetchAssessmentProgress({
            token,
            courseSlug: selectedSlug,
            programmeSlug: selectedCourse?.programmeSlug || selectedCourse?.programme,
          });
          if (status) {
            setJobProgress({
              status: status.status,
              completed: status.completed || 0,
              total: status.totalTarget || 0,
            });
            if (status.id) setJobId(status.id);
            if (status.status === "completed") {
              setGenerating(false);
              const items = await listAssessments({ token, courseSlug: selectedSlug });
              setAssessments(items);
              if (pollRef.current) {
                clearInterval(pollRef.current);
                pollRef.current = null;
              }
              return;
            }
            if (status.status === "failed") {
              setGenerating(false);
              setError(status.error || "Generation failed.");
              if (pollRef.current) {
                clearInterval(pollRef.current);
                pollRef.current = null;
              }
              return;
            }
            // keep polling if running/pending
            setGenerating(status.status === "running" || status.status === "pending");
          } else {
            setJobProgress({ status: "", completed: 0, total: 0 });
            setGenerating(false);
          }
        } catch (err) {
          setError(err?.message || "Failed to fetch progress.");
        }
      };
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(poll, 2000);
      poll();
    };
    startPoll();
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [token, selectedSlug, selectedCourse]);

  const handleSyllabusSelect = (event) => {
    const file = event?.target?.files?.[0];
    if (!file) {
      setSyllabusFile(null);
      setSyllabusFileName("");
      return;
    }
    setSyllabusFile(file);
    setSyllabusFileName(file.name || "syllabus.json");
  };

  const handleUploadSyllabus = async () => {
    if (!token || !selectedSlug) {
      setError("Select a course first.");
      return;
    }
    const trimmedText = syllabusText.trim();
    if (!trimmedText && !syllabusFile) {
      setError("Paste syllabus JSON or choose a file first.");
      return;
    }
    setUploadingSyllabus(true);
    setSyllabusProgress(10);
    setFlash("");
    setError("");
    try {
      const text = trimmedText || (await syllabusFile.text());
      setSyllabusProgress(35);
      const parsed = JSON.parse(text);
      setSyllabusProgress(55);
      await uploadSyllabusAssessments({
        token,
        courseSlug: selectedSlug,
        programmeSlug: selectedCourse?.programmeSlug || selectedCourse?.programme,
        syllabus: parsed,
      });
      setSyllabusProgress(85);
      setFlash("Syllabus saved. Now select module/week and click Generate to create question sets.");
      setSyllabusFile(null);
      setSyllabusFileName("");
      setSyllabusText("");
      if (syllabusInputRef.current) {
        syllabusInputRef.current.value = "";
      }
      setSyllabusProgress(100);
    } catch (err) {
      setError(err?.message || "Failed to upload syllabus.");
      setSyllabusProgress(0);
    } finally {
      setUploadingSyllabus(false);
      setTimeout(() => setSyllabusProgress(0), 1200);
    }
  };

  const handleDeleteSet = async (item) => {
    if (!item?.id || !token) return;
    const confirmed = window.confirm("Delete this assessment set? This will remove its question entries too.");
    if (!confirmed) return;
    setDeletingId(item.id);
    setError("");
    setFlash("");
    try {
      await deleteAssessmentSet({ token, assessmentId: item.id });
      const items = await listAssessments({ token, courseSlug: selectedSlug });
      setAssessments(items);
    } catch (err) {
      setError(err?.message || "Failed to delete assessment set.");
    } finally {
      setDeletingId("");
    }
  };

  const handleCancelJob = async () => {
    if (!token || !selectedSlug) return;
    try {
      await cancelAssessmentJob({
        token,
        courseSlug: selectedSlug,
        programmeSlug: selectedCourse?.programmeSlug || selectedCourse?.programme,
        moduleIndex: selectedModuleIndex ? Number(selectedModuleIndex) : undefined,
        weekIndex: selectedWeekIndex ? Number(selectedWeekIndex) : undefined,
      });
      setGenerating(false);
      setFlash("Generation cancelled.");
      setJobProgress({ status: "cancelled", completed: jobProgress.completed, total: jobProgress.total });
    } catch (err) {
      setError(err?.message || "Failed to cancel generation.");
    }
  };

  const moduleOptions = useMemo(() => {
    const detailModules =
      (Array.isArray(courseDetail?.modules) && courseDetail.modules) ||
      (Array.isArray(courseDetail?.detail?.modules) && courseDetail.detail.modules) ||
      [];
    if (detailModules.length) {
      return detailModules;
    }
    const courseModules = Array.isArray(selectedCourse?.modules) ? selectedCourse.modules : [];
    return courseModules;
  }, [courseDetail, selectedCourse]);

  const weekOptions = useMemo(() => {
    if (!selectedModuleIndex) return [];
    const moduleIdx = Number(selectedModuleIndex) - 1;
    if (!moduleOptions[moduleIdx]) return [];
    const module = moduleOptions[moduleIdx];
    const sections = Array.isArray(module?.sections) ? module.sections : [];
    if (sections.length) return sections;
    if (Array.isArray(module?.weeklyStructure) && module.weeklyStructure.length) return module.weeklyStructure;

    const fallbackCourseModules = Array.isArray(selectedCourse?.modules) ? selectedCourse.modules : [];
    if (fallbackCourseModules[moduleIdx]?.weeklyStructure) {
      return fallbackCourseModules[moduleIdx].weeklyStructure;
    }
    return [];
  }, [moduleOptions, selectedModuleIndex, selectedCourse]);

  return (
    <MasterLayout>
      <PageTitle title='Course Assessments' breadcrumbItems={['Application', 'Course Assessments']} />

      <Card title='Select course'>
        <div className='row g-3 align-items-end'>
          <div className='col-md-5'>
            <label className='form-label'>Course</label>
            <select
              className='form-select'
              value={selectedSlug}
              onChange={(e) => setSelectedSlug(e.target.value)}
              disabled={loadingCourses}
            >
              {loadingCourses ? <option>Loading courses...</option> : null}
              {!loadingCourses && !courses.length ? <option>No courses found</option> : null}
              {courses.map((course) => (
                <option key={course.slug} value={course.slug}>
                  {course.name} ({course.slug})
                </option>
              ))}
            </select>
          </div>
          <div className='col-md-3'>
            <label className='form-label'>Module (optional)</label>
            <select
              className='form-select'
              value={selectedModuleIndex}
              onChange={(e) => {
                setSelectedModuleIndex(e.target.value);
                setSelectedWeekIndex("");
              }}
              disabled={!moduleOptions.length || loadingCourses}
            >
              <option value=''>Whole course</option>
              {moduleOptions.map((module, idx) => (
                <option key={module.title || idx} value={idx + 1}>
                  {`Module ${idx + 1}: ${module.title || "Untitled"}`}
                </option>
              ))}
            </select>
          </div>
          <div className='col-md-2'>
            <label className='form-label'>Week (optional)</label>
            <select
              className='form-select'
              value={selectedWeekIndex}
              onChange={(e) => setSelectedWeekIndex(e.target.value)}
              disabled={!selectedModuleIndex || !weekOptions.length || loadingCourses}
            >
              <option value=''>Whole module</option>
              {weekOptions.map((week, idx) => (
                <option key={week.title || idx} value={idx + 1}>
                  {`Week ${idx + 1}: ${week.title || "Untitled"}`}
                </option>
              ))}
            </select>
          </div>
          <div className='col-md-2'>
            <label className='form-label'>Difficulty</label>
            <select
              className='form-select'
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              disabled={loadingCourses}
            >
              <option value=''>AI default</option>
              <option value='Beginner'>Beginner</option>
              <option value='Intermediate'>Intermediate</option>
              <option value='Advanced'>Advanced</option>
            </select>
          </div>
          <div className='col-md-2'>
            <label className='form-label'>Question count</label>
            <input
              type='number'
              min='1'
              max='500'
              className='form-control'
              placeholder='Default'
              value={questionCount}
              onChange={(e) => setQuestionCount(e.target.value)}
              disabled={loadingCourses}
            />
          </div>
          <div className='col-md-2'>
            <label className='form-label'>Actions</label>
            <div className='d-flex gap-2'>
              <button
                type='button'
                className='btn btn-main flex-grow-1'
                onClick={handleGenerate}
                disabled={!selectedSlug || generating}
              >
                {generating ? "Generating..." : "Generate AI set"}
              </button>
              <button
                type='button'
                className='btn btn-outline-secondary'
                onClick={() => setSelectedSlug(selectedSlug)}
                disabled={loadingAssessments}
                title='Refresh'
              >
                <i className='ri-refresh-line' aria-hidden='true' />
              </button>
              {generating ? (
                <button
                  type='button'
                  className='btn btn-outline-danger'
                  onClick={handleCancelJob}
                  disabled={!generating}
                  title='Stop generation'
                >
                  Stop
                </button>
              ) : null}
            </div>
          </div>
          <div className='col-12'>
            <div className='border rounded-3 p-3 bg-light'>
              <div className='d-flex flex-wrap justify-content-between align-items-center mb-2'>
                <div>
                  <div className='fw-semibold'>Paste syllabus (JSON)</div>
                  <div className='text-muted small'>
                    Upload syllabus JSON to save it to the course. Generation runs separately when you click Generate.
                  </div>
                </div>
              </div>
              <div className='d-flex flex-column gap-2'>
                <textarea
                  className='form-control'
                  rows={5}
                  placeholder='Paste syllabus JSON here...'
                  value={syllabusText}
                  onChange={(e) => setSyllabusText(e.target.value)}
                  disabled={uploadingSyllabus || loadingCourses}
                />
                <div className='d-flex flex-wrap gap-2 align-items-center'>
                  <input
                    type='file'
                    accept='application/json'
                    className='form-control'
                    style={{ maxWidth: 260 }}
                    onChange={handleSyllabusSelect}
                    ref={syllabusInputRef}
                    disabled={uploadingSyllabus || loadingCourses}
                  />
                  <div className='text-muted small flex-grow-1'>
                    {syllabusFileName ? `Selected file: ${syllabusFileName}` : "File optional if pasted JSON is provided."}
                  </div>
                  <button
                    type='button'
                    className='btn btn-outline-primary'
                    onClick={handleUploadSyllabus}
                    disabled={uploadingSyllabus || !selectedSlug}
                  >
                    {uploadingSyllabus ? "Uploading..." : "Upload syllabus"}
                  </button>
                </div>
                {uploadingSyllabus || syllabusProgress > 0 ? (
                  <div className='progress' style={{ height: 6 }}>
                    <div
                      className='progress-bar progress-bar-striped progress-bar-animated'
                      role='progressbar'
                      style={{ width: `${syllabusProgress || 10}%` }}
                      aria-valuenow={syllabusProgress}
                      aria-valuemin='0'
                      aria-valuemax='100'
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
        {flash ? <p className='text-success mt-3 mb-0'>{flash}</p> : null}
        {error ? <p className='text-danger mt-3 mb-0'>{error}</p> : null}
        {jobProgress.status ? (
          <div className='mt-3'>
            <div className='d-flex justify-content-between small text-muted mb-1'>
              <span>Status: {jobProgress.status}</span>
              <span>
                {jobProgress.completed}/{jobProgress.total || '—'} questions
              </span>
            </div>
            <div className='progress' style={{ height: 6 }}>
              <div
                className={`progress-bar ${jobProgress.status === 'failed' ? 'bg-danger' : 'bg-success'}`}
                role='progressbar'
                style={{
                  width: jobProgress.total ? `${Math.min(100, Math.floor((jobProgress.completed / jobProgress.total) * 100))}%` : '10%',
                }}
                aria-valuenow={jobProgress.completed}
                aria-valuemin='0'
                aria-valuemax={jobProgress.total || 100}
              />
            </div>
          </div>
        ) : null}
      </Card>

      <Card title='Assessment sets'>
        {loadingAssessments ? (
          <p className='text-muted mb-0'>Loading assessments...</p>
        ) : assessments.length ? (
          <div className='table-responsive'>
            <table className='table align-middle'>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Module</th>
                  <th>Week</th>
                  <th>Level</th>
                  <th>Total</th>
                  <th>Unused</th>
                  <th>Source</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {assessments.map((item) => (
                  <AssessmentRow key={item.id} item={item} onDelete={handleDeleteSet} deletingId={deletingId} />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className='text-muted mb-0'>No assessments yet for this course.</p>
        )}
      </Card>
    </MasterLayout>
  );
};

export default CourseAssessmentsPage;
