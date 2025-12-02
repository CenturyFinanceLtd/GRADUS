import { useEffect, useMemo, useState } from "react";
import MasterLayout from "../masterLayout/MasterLayout";
import PageTitle from "../components/PageTitle";
import { listAdminCourses } from "../services/adminCourses";
import { fetchCourseDetail } from "../services/adminCourseDetails";
import { generateAssessment, listAssessments } from "../services/adminAssessments";
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

const AssessmentRow = ({ item }) => {
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
      <td>{questionCount}</td>
      <td>{item?.source === "ai" ? "AI-generated" : item?.source || "—"}</td>
      <td className='text-muted small'>{updatedLabel}</td>
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
    try {
      await generateAssessment({
        token,
        courseSlug: selectedSlug,
        programmeSlug: selectedCourse?.programmeSlug || selectedCourse?.programme,
        moduleIndex: selectedModuleIndex ? Number(selectedModuleIndex) : undefined,
        weekIndex: selectedWeekIndex ? Number(selectedWeekIndex) : undefined,
      });
      setFlash("AI assessment generated. Refreshing list...");
      const items = await listAssessments({ token, courseSlug: selectedSlug });
      setAssessments(items);
    } catch (err) {
      setError(err?.message || "Generation failed.");
    } finally {
      setGenerating(false);
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
            </div>
          </div>
        </div>
        {flash ? <p className='text-success mt-3 mb-0'>{flash}</p> : null}
        {error ? <p className='text-danger mt-3 mb-0'>{error}</p> : null}
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
                  <th>Questions</th>
                  <th>Source</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {assessments.map((item) => (
                  <AssessmentRow key={item.id} item={item} />
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
