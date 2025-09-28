import { useEffect, useMemo, useState } from "react";
import useAuth from "../hook/useAuth";
import {
  createCourse as createCourseRequest,
  deleteCourse as deleteCourseRequest,
  fetchCoursePage,
  updateCourse as updateCourseRequest,
  updateCourseHero,
} from "../services/adminCourses";

const emptyHero = {
  tagIcon: "",
  tagText: "",
  title: "",
  description: "",
};

const createInitialCourseForm = () => ({
  id: null,
  name: "",
  slug: "",
  subtitle: "",
  focus: "",
  approvalsText: "",
  placementRange: "",
  price: "",
  outcomeSummary: "",
  deliverablesText: "",
  outcomesText: "",
  finalAward: "",
  partnersText: "",
  order: "",
  weeks: [],
  certifications: [],
});

const createBlankWeek = () => ({
  title: "",
  pointsText: "",
});

const createBlankCertification = () => ({
  level: "",
  certificateName: "",
  coverageText: "",
  outcome: "",
});

const slugify = (value) =>
  value
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const splitLines = (text) =>
  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

const convertCourseToForm = (course) => ({
  id: course.id,
  name: course.name || "",
  slug: course.slug || "",
  subtitle: course.subtitle || "",
  focus: course.focus || "",
  approvalsText: (course.approvals || []).join("\n"),
  placementRange: course.placementRange || "",
  price: course.price || "",
  outcomeSummary: course.outcomeSummary || "",
  deliverablesText: (course.deliverables || []).join("\n"),
  outcomesText: (course.outcomes || []).join("\n"),
  finalAward: course.finalAward || "",
  partnersText: (course.partners || []).join("\n"),
  order: course.order ?? "",
  weeks: (course.weeks || []).map((week) => ({
    title: week.title || "",
    pointsText: (week.points || []).join("\n"),
  })),
  certifications: (course.certifications || []).map((cert) => ({
    level: cert.level || "",
    certificateName: cert.certificateName || "",
    coverageText: (cert.coverage || []).join("\n"),
    outcome: cert.outcome || "",
  })),
});

const convertFormToPayload = (form) => {
  const payload = {
    name: form.name.trim(),
    slug: form.slug.trim(),
    subtitle: form.subtitle.trim(),
    focus: form.focus.trim(),
    approvals: splitLines(form.approvalsText || ""),
    placementRange: form.placementRange.trim(),
    price: form.price.trim(),
    outcomeSummary: form.outcomeSummary.trim(),
    deliverables: splitLines(form.deliverablesText || ""),
    outcomes: splitLines(form.outcomesText || ""),
    finalAward: form.finalAward.trim(),
    partners: splitLines(form.partnersText || ""),
    weeks: form.weeks
      .map((week) => ({
        title: week.title.trim(),
        points: splitLines(week.pointsText || ""),
      }))
      .filter((week) => week.title || week.points.length),
    certifications: form.certifications
      .map((cert) => ({
        level: cert.level.trim(),
        certificateName: cert.certificateName.trim(),
        coverage: splitLines(cert.coverageText || ""),
        outcome: cert.outcome.trim(),
      }))
      .filter((cert) => cert.level || cert.certificateName || cert.coverage.length || cert.outcome),
  };

  if (form.order !== "" && form.order !== null && form.order !== undefined) {
    const numericOrder = Number(form.order);
    if (!Number.isNaN(numericOrder)) {
      payload.order = numericOrder;
    }
  }

  return payload;
};

const CourseManager = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [heroForm, setHeroForm] = useState(emptyHero);
  const [savingHero, setSavingHero] = useState(false);
  const [heroError, setHeroError] = useState(null);
  const [courses, setCourses] = useState([]);
  const [courseForm, setCourseForm] = useState(createInitialCourseForm());
  const [courseFormError, setCourseFormError] = useState(null);
  const [savingCourse, setSavingCourse] = useState(false);
  const [deletingCourseId, setDeletingCourseId] = useState(null);

  useEffect(() => {
    if (!token) {
      return;
    }

    let isMounted = true;

    const loadContent = async () => {
      setLoading(true);
      setError(null);
      setHeroError(null);

      try {
        const response = await fetchCoursePage({ token });
        if (!isMounted) {
          return;
        }

        setHeroForm({
          tagIcon: response?.hero?.tagIcon || "",
          tagText: response?.hero?.tagText || "",
          title: response?.hero?.title || "",
          description: response?.hero?.description || "",
        });
        setCourses(Array.isArray(response?.courses) ? response.courses : []);
      } catch (err) {
        if (!isMounted) {
          return;
        }
        setError(err?.message || "Failed to load course content.");
        setHeroForm(emptyHero);
        setCourses([]);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadContent();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const sortedCourses = useMemo(
    () => [...courses].sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name)),
    [courses]
  );

  const handleHeroChange = (event) => {
    const { name, value } = event.target;
    setHeroForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleHeroSubmit = async (event) => {
    event.preventDefault();
    if (!token) {
      return;
    }

    setSavingHero(true);

    try {
      const heroPayload = {
        tagIcon: heroForm.tagIcon.trim(),
        tagText: heroForm.tagText.trim(),
        title: heroForm.title.trim(),
        description: heroForm.description.trim(),
      };

      const response = await updateCourseHero({ token, data: heroPayload });
      setHeroForm({
        tagIcon: response?.hero?.tagIcon || "",
        tagText: response?.hero?.tagText || "",
        title: response?.hero?.title || "",
        description: response?.hero?.description || "",
      });
    } catch (err) {
      setHeroError(err?.message || "Failed to update hero content.");
    } finally {
      setSavingHero(false);
    }
  };

  const updateCourseField = (name, value) => {
    setCourseForm((previous) => {
      const next = {
        ...previous,
        [name]: value,
      };

      if (name === "name" && !previous.id) {
        const previousAutoSlug = slugify(previous.name || "");
        if (!previous.slug || previous.slug === previousAutoSlug) {
          next.slug = slugify(value);
        }
      }

      return next;
    });
  };

  const handleCourseInputChange = (event) => {
    const { name, value } = event.target;
    updateCourseField(name, value);
  };

  const updateWeekField = (index, key, value) => {
    setCourseForm((previous) => {
      const weeks = previous.weeks.slice();
      weeks[index] = {
        ...weeks[index],
        [key]: value,
      };
      return {
        ...previous,
        weeks,
      };
    });
  };

  const updateCertificationField = (index, key, value) => {
    setCourseForm((previous) => {
      const certifications = previous.certifications.slice();
      certifications[index] = {
        ...certifications[index],
        [key]: value,
      };
      return {
        ...previous,
        certifications,
      };
    });
  };

  const addWeek = () => {
    setCourseForm((previous) => ({
      ...previous,
      weeks: [...previous.weeks, createBlankWeek()],
    }));
  };

  const removeWeek = (index) => {
    setCourseForm((previous) => ({
      ...previous,
      weeks: previous.weeks.filter((_, weekIndex) => weekIndex !== index),
    }));
  };

  const addCertification = () => {
    setCourseForm((previous) => ({
      ...previous,
      certifications: [...previous.certifications, createBlankCertification()],
    }));
  };

  const removeCertification = (index) => {
    setCourseForm((previous) => ({
      ...previous,
      certifications: previous.certifications.filter((_, certIndex) => certIndex !== index),
    }));
  };

  const resetCourseForm = () => {
    setCourseForm(createInitialCourseForm());
    setCourseFormError(null);
  };

  const handleEditCourse = (course) => {
    setCourseForm(convertCourseToForm(course));
    setCourseFormError(null);
  };

  const handleDeleteCourse = async (course) => {
    if (!token || !course?.id) {
      return;
    }

    const confirmed = window.confirm(
      `Delete the course "${course.name || "Untitled"}"? This action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setDeletingCourseId(course.id);
    setCourseFormError(null);

    try {
      await deleteCourseRequest({ token, courseId: course.id });
      setCourses((previous) => previous.filter((item) => item.id !== course.id));
      if (courseForm.id === course.id) {
        resetCourseForm();
      }
    } catch (err) {
      setCourseFormError(err?.message || "Failed to delete course.");
    } finally {
      setDeletingCourseId(null);
    }
  };

  const handleCourseSubmit = async (event) => {
    event.preventDefault();
    if (!token) {
      return;
    }

    setCourseFormError(null);
    setSavingCourse(true);

    try {
      const payload = convertFormToPayload(courseForm);
      let response;

      if (courseForm.id) {
        response = await updateCourseRequest({ token, courseId: courseForm.id, data: payload });
        setCourses((previous) =>
          previous.map((item) => (item.id === response.course.id ? response.course : item))
        );
      } else {
        response = await createCourseRequest({ token, data: payload });
        setCourses((previous) => [...previous, response.course]);
        resetCourseForm();
      }
    } catch (err) {
      setCourseFormError(err?.message || "Failed to save course.");
    } finally {
      setSavingCourse(false);
    }
  };

  if (!token) {
    return (
      <div className='card p-24'>
        <div className='alert alert-warning mb-0' role='alert'>
          Please sign in to manage courses.
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className='card p-24 d-flex justify-content-center py-80'>
        <div className='text-center'>
          <div className='spinner-border text-primary mb-12' role='status'>
            <span className='visually-hidden'>Loading...</span>
          </div>
          <p className='text-neutral-600 mb-0'>Loading course information…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='card p-24'>
        <div className='alert alert-danger mb-0' role='alert'>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className='card p-24'>
      <div className='mb-40'>
        <div className='d-flex flex-wrap justify-content-between align-items-center gap-16 mb-24'>
          <div>
            <h5 className='mb-8'>Course Page Hero</h5>
            <p className='text-neutral-500 mb-0'>Update the hero section shown on the Our Courses page.</p>
          </div>
        </div>
        <form className='row g-3' onSubmit={handleHeroSubmit}>
          {heroError ? (
            <div className='col-12'>
              <div className='alert alert-danger' role='alert'>
                {heroError}
              </div>
            </div>
          ) : null}
          <div className='col-md-3'>
            <label htmlFor='tagIcon' className='form-label fw-medium'>
              Tag Icon (optional)
            </label>
            <input
              type='text'
              id='tagIcon'
              name='tagIcon'
              value={heroForm.tagIcon}
              onChange={handleHeroChange}
              className='form-control'
              placeholder='e.g. ph-bold ph-graduation-cap'
              disabled={savingHero}
            />
          </div>
          <div className='col-md-3'>
            <label htmlFor='tagText' className='form-label fw-medium'>
              Tag Text
            </label>
            <input
              type='text'
              id='tagText'
              name='tagText'
              value={heroForm.tagText}
              onChange={handleHeroChange}
              className='form-control'
              placeholder='Small heading text'
              disabled={savingHero}
            />
          </div>
          <div className='col-md-6'>
            <label htmlFor='title' className='form-label fw-medium'>
              Title
            </label>
            <input
              type='text'
              id='title'
              name='title'
              value={heroForm.title}
              onChange={handleHeroChange}
              className='form-control'
              placeholder='Main hero headline'
              disabled={savingHero}
            />
          </div>
          <div className='col-12'>
            <label htmlFor='description' className='form-label fw-medium'>
              Description
            </label>
            <textarea
              id='description'
              name='description'
              value={heroForm.description}
              onChange={handleHeroChange}
              className='form-control'
              rows={3}
              placeholder='Short description shown beneath the title'
              disabled={savingHero}
            />
          </div>
          <div className='col-12 d-flex justify-content-end'>
            <button type='submit' className='btn btn-primary-600' disabled={savingHero}>
              {savingHero ? "Saving…" : "Save Hero Content"}
            </button>
          </div>
        </form>
      </div>

      <div className='d-flex flex-wrap justify-content-between align-items-center gap-16 mb-24'>
        <div>
          <h5 className='mb-8'>Courses</h5>
          <p className='text-neutral-500 mb-0'>Manage the flagship series displayed on the public site.</p>
        </div>
        <div className='d-flex gap-12'>
          <button type='button' className='btn btn-outline-primary-600' onClick={resetCourseForm}>
            Add New Course
          </button>
        </div>
      </div>

      {courseFormError ? (
        <div className='alert alert-danger mb-24' role='alert'>
          {courseFormError}
        </div>
      ) : null}

      {sortedCourses.length ? (
        <div className='table-responsive mb-40'>
          <table className='table align-middle'>
            <thead>
              <tr>
                <th>Name</th>
                <th>Slug</th>
                <th className='text-center'>Price</th>
                <th className='text-center'>Order</th>
                <th className='text-end'>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedCourses.map((course) => (
                <tr key={course.id}>
                  <td>{course.name}</td>
                  <td>{course.slug}</td>
                  <td className='text-center'>{course.price || '—'}</td>
                  <td className='text-center'>{course.order ?? "—"}</td>
                  <td className='text-end'>
                    <div className='d-inline-flex gap-8'>
                      <button
                        type='button'
                        className='btn btn-sm btn-outline-primary-600'
                        onClick={() => handleEditCourse(course)}
                      >
                        Edit
                      </button>
                      <button
                        type='button'
                        className='btn btn-sm btn-outline-danger-600'
                        onClick={() => handleDeleteCourse(course)}
                        disabled={deletingCourseId === course.id}
                      >
                        {deletingCourseId === course.id ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className='alert alert-info mb-40' role='alert'>
          No courses have been created yet.
        </div>
      )}

      <div className='border rounded-16 p-24 bg-neutral-5'>
        <div className='d-flex justify-content-between align-items-center flex-wrap gap-16 mb-24'>
          <div>
            <h6 className='mb-4'>{courseForm.id ? `Editing: ${courseForm.name || "Untitled"}` : "New Course"}</h6>
            <p className='text-neutral-500 mb-0'>Fill in the details for this course series.</p>
          </div>
          <button type='button' className='btn btn-link text-decoration-none p-0' onClick={resetCourseForm}>
            Clear Form
          </button>
        </div>

        <form onSubmit={handleCourseSubmit} className='row g-4'>
          <div className='col-md-6'>
            <label htmlFor='name' className='form-label fw-medium'>
              Course Name
            </label>
            <input
              type='text'
              id='name'
              name='name'
              className='form-control'
              value={courseForm.name}
              onChange={handleCourseInputChange}
              required
              disabled={savingCourse}
            />
          </div>
          <div className='col-md-6'>
            <label htmlFor='slug' className='form-label fw-medium'>
              Slug / Identifier
            </label>
            <input
              type='text'
              id='slug'
              name='slug'
              className='form-control'
              value={courseForm.slug}
              onChange={handleCourseInputChange}
              placeholder='Used for anchors and URLs'
              disabled={savingCourse}
            />
          </div>
          <div className='col-md-6'>
            <label htmlFor='subtitle' className='form-label fw-medium'>
              Subtitle
            </label>
            <input
              type='text'
              id='subtitle'
              name='subtitle'
              className='form-control'
              value={courseForm.subtitle}
              onChange={handleCourseInputChange}
              disabled={savingCourse}
            />
          </div>
          <div className='col-md-6'>
            <label htmlFor='price' className='form-label fw-medium'>
              Price (displayed publicly)
            </label>
            <input
              type='text'
              id='price'
              name='price'
              className='form-control'
              value={courseForm.price}
              onChange={handleCourseInputChange}
              placeholder='e.g. ₹19,999 or $1,299'
              disabled={savingCourse}
            />
          </div>
          <div className='col-md-6'>
            <label htmlFor='order' className='form-label fw-medium'>
              Display Order (optional)
            </label>
            <input
              type='number'
              id='order'
              name='order'
              className='form-control'
              value={courseForm.order}
              onChange={handleCourseInputChange}
              disabled={savingCourse}
            />
          </div>
          <div className='col-12'>
            <label htmlFor='focus' className='form-label fw-medium'>
              Focus
            </label>
            <textarea
              id='focus'
              name='focus'
              className='form-control'
              rows={3}
              value={courseForm.focus}
              onChange={handleCourseInputChange}
              disabled={savingCourse}
            />
          </div>
          <div className='col-md-6'>
            <label htmlFor='placementRange' className='form-label fw-medium'>
              Placement Range
            </label>
            <textarea
              id='placementRange'
              name='placementRange'
              className='form-control'
              rows={2}
              value={courseForm.placementRange}
              onChange={handleCourseInputChange}
              disabled={savingCourse}
            />
          </div>
          <div className='col-md-6'>
            <label htmlFor='outcomeSummary' className='form-label fw-medium'>
              Outcome Summary
            </label>
            <textarea
              id='outcomeSummary'
              name='outcomeSummary'
              className='form-control'
              rows={2}
              value={courseForm.outcomeSummary}
              onChange={handleCourseInputChange}
              disabled={savingCourse}
            />
          </div>
          <div className='col-md-6'>
            <label htmlFor='approvalsText' className='form-label fw-medium'>
              Approvals (one per line)
            </label>
            <textarea
              id='approvalsText'
              name='approvalsText'
              className='form-control'
              rows={4}
              value={courseForm.approvalsText}
              onChange={handleCourseInputChange}
              disabled={savingCourse}
            />
          </div>
          <div className='col-md-6'>
            <label htmlFor='deliverablesText' className='form-label fw-medium'>
              Deliverables (one per line)
            </label>
            <textarea
              id='deliverablesText'
              name='deliverablesText'
              className='form-control'
              rows={4}
              value={courseForm.deliverablesText}
              onChange={handleCourseInputChange}
              disabled={savingCourse}
            />
          </div>
          <div className='col-md-6'>
            <label htmlFor='outcomesText' className='form-label fw-medium'>
              Outcomes (one per line)
            </label>
            <textarea
              id='outcomesText'
              name='outcomesText'
              className='form-control'
              rows={4}
              value={courseForm.outcomesText}
              onChange={handleCourseInputChange}
              disabled={savingCourse}
            />
          </div>
          <div className='col-md-6'>
            <label htmlFor='partnersText' className='form-label fw-medium'>
              Placement Partners (one per line)
            </label>
            <textarea
              id='partnersText'
              name='partnersText'
              className='form-control'
              rows={4}
              value={courseForm.partnersText}
              onChange={handleCourseInputChange}
              disabled={savingCourse}
            />
          </div>
          <div className='col-12'>
            <label htmlFor='finalAward' className='form-label fw-medium'>
              Final Award
            </label>
            <textarea
              id='finalAward'
              name='finalAward'
              className='form-control'
              rows={2}
              value={courseForm.finalAward}
              onChange={handleCourseInputChange}
              disabled={savingCourse}
            />
          </div>

          <div className='col-12'>
            <div className='d-flex justify-content-between align-items-center mb-2'>
              <h6 className='mb-0'>Weeks</h6>
              <button type='button' className='btn btn-sm btn-outline-primary-600' onClick={addWeek} disabled={savingCourse}>
                Add Week
              </button>
            </div>
            {courseForm.weeks.length === 0 ? (
              <p className='text-neutral-500 mb-0'>No weeks added yet.</p>
            ) : (
              <div className='d-grid gap-16'>
                {courseForm.weeks.map((week, index) => (
                  <div key={`week-${index}`} className='border rounded-12 p-16 bg-white'>
                    <div className='d-flex justify-content-between align-items-center mb-12'>
                      <h6 className='mb-0'>Week {index + 1}</h6>
                      <button
                        type='button'
                        className='btn btn-sm btn-outline-danger-600'
                        onClick={() => removeWeek(index)}
                        disabled={savingCourse}
                      >
                        Remove
                      </button>
                    </div>
                    <div className='row g-3'>
                      <div className='col-md-5'>
                        <label className='form-label fw-medium'>Title</label>
                        <input
                          type='text'
                          className='form-control'
                          value={week.title}
                          onChange={(event) => updateWeekField(index, "title", event.target.value)}
                          disabled={savingCourse}
                        />
                      </div>
                      <div className='col-md-7'>
                        <label className='form-label fw-medium'>Points (one per line)</label>
                        <textarea
                          className='form-control'
                          rows={3}
                          value={week.pointsText}
                          onChange={(event) => updateWeekField(index, "pointsText", event.target.value)}
                          disabled={savingCourse}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className='col-12'>
            <div className='d-flex justify-content-between align-items-center mb-2'>
              <h6 className='mb-0'>Certifications</h6>
              <button
                type='button'
                className='btn btn-sm btn-outline-primary-600'
                onClick={addCertification}
                disabled={savingCourse}
              >
                Add Certification
              </button>
            </div>
            {courseForm.certifications.length === 0 ? (
              <p className='text-neutral-500 mb-0'>No certifications added yet.</p>
            ) : (
              <div className='d-grid gap-16'>
                {courseForm.certifications.map((cert, index) => (
                  <div key={`cert-${index}`} className='border rounded-12 p-16 bg-white'>
                    <div className='d-flex justify-content-between align-items-center mb-12'>
                      <h6 className='mb-0'>Certification {index + 1}</h6>
                      <button
                        type='button'
                        className='btn btn-sm btn-outline-danger-600'
                        onClick={() => removeCertification(index)}
                        disabled={savingCourse}
                      >
                        Remove
                      </button>
                    </div>
                    <div className='row g-3'>
                      <div className='col-md-3'>
                        <label className='form-label fw-medium'>Level</label>
                        <input
                          type='text'
                          className='form-control'
                          value={cert.level}
                          onChange={(event) => updateCertificationField(index, "level", event.target.value)}
                          disabled={savingCourse}
                        />
                      </div>
                      <div className='col-md-4'>
                        <label className='form-label fw-medium'>Certificate Name</label>
                        <input
                          type='text'
                          className='form-control'
                          value={cert.certificateName}
                          onChange={(event) => updateCertificationField(index, "certificateName", event.target.value)}
                          disabled={savingCourse}
                        />
                      </div>
                      <div className='col-md-5'>
                        <label className='form-label fw-medium'>Coverage (one per line)</label>
                        <textarea
                          className='form-control'
                          rows={3}
                          value={cert.coverageText}
                          onChange={(event) => updateCertificationField(index, "coverageText", event.target.value)}
                          disabled={savingCourse}
                        />
                      </div>
                      <div className='col-12'>
                        <label className='form-label fw-medium'>Outcome</label>
                        <textarea
                          className='form-control'
                          rows={2}
                          value={cert.outcome}
                          onChange={(event) => updateCertificationField(index, "outcome", event.target.value)}
                          disabled={savingCourse}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className='col-12 d-flex justify-content-end gap-12'>
            <button type='button' className='btn btn-outline-secondary-600' onClick={resetCourseForm} disabled={savingCourse}>
              Cancel
            </button>
            <button type='submit' className='btn btn-primary-600' disabled={savingCourse}>
              {savingCourse ? "Saving…" : courseForm.id ? "Update Course" : "Create Course"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CourseManager;
