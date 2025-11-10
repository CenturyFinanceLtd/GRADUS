
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import MasterLayout from '../masterLayout/MasterLayout';
import { useAuthContext } from '../context/AuthContext';
import { fetchCourseDetail, saveCourseDetail, uploadLectureVideo } from '../services/adminCourseDetails';
import { toast } from 'react-toastify';

const createId = (prefix) => `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now()}`;

const buildEmptyLecture = () => ({
  lectureId: createId('lecture'),
  title: '',
  duration: '',
  description: '',
  video: {
    url: '',
    publicId: '',
    folder: '',
    assetType: 'video',
    duration: 0,
    bytes: 0,
    format: '',
  },
});

const buildEmptySection = () => ({
  sectionId: createId('section'),
  title: '',
  subtitle: '',
  summary: '',
  lectures: [buildEmptyLecture()],
  assignments: [],
  quizzes: [],
  projects: [],
  outcomes: [],
  notes: [],
});

const buildEmptyModule = (order = 0) => ({
  moduleId: createId('module'),
  order,
  moduleLabel: `Module ${order + 1}`,
  title: '',
  weeksLabel: '',
  summary: '',
  topicsCovered: [],
  outcomes: [],
  variant: 'default',
  sections: [buildEmptySection()],
  capstone: { summary: '', deliverables: [], rubric: [] },
});

const linesToArray = (value) =>
  value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

const arrayToLines = (arr) => (Array.isArray(arr) ? arr.join('\n') : '');

const CourseDetailData = () => {
  const { courseKey = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { token } = useAuthContext();

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const slugParam = searchParams.get('slug');
  const stateSlug = location.state?.slug;

  const slug = useMemo(() => {
    const raw = slugParam || stateSlug || '';
    try {
      return decodeURIComponent(raw || '');
    } catch {
      return raw;
    }
  }, [slugParam, stateSlug]);

  const [courseMeta, setCourseMeta] = useState(null);
  const [modules, setModules] = useState([]);
  const [activeModuleIndex, setActiveModuleIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [uploadingMap, setUploadingMap] = useState({});

  const activeModule = modules[activeModuleIndex] || null;

  const assignOrders = (items) =>
    items.map((module, index) => ({
      ...module,
      order: index,
      moduleLabel: module.moduleLabel || `Module ${index + 1}`,
      sections: Array.isArray(module.sections) && module.sections.length ? module.sections : [buildEmptySection()],
      capstone: module.capstone || { summary: '', deliverables: [], rubric: [] },
    }));

  const loadDetail = async () => {
    if (!slug) {
      setError('Course slug is missing. Please navigate again from Customize Courses.');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError('');
      const data = await fetchCourseDetail({ slug, token });
      const fetchedModules = data?.detail?.modules || [];
      setCourseMeta(data?.course || null);
      setModules(assignOrders(fetchedModules.length ? fetchedModules : [buildEmptyModule(0)]));
      setActiveModuleIndex(0);
    } catch (err) {
      setError(err?.message || 'Failed to load detailed course data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);
  const updateModules = (updater) => {
    setModules((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      return assignOrders(next);
    });
  };

  const updateModuleAt = (moduleIndex, updater) => {
    updateModules((prev) =>
      prev.map((module, idx) => {
        if (idx !== moduleIndex) return module;
        const patch = typeof updater === 'function' ? updater(module) : updater;
        return { ...module, ...patch };
      })
    );
  };

  const updateSectionAt = (moduleIndex, sectionIndex, updater) => {
    updateModuleAt(moduleIndex, (module) => {
      const sections = Array.isArray(module.sections) ? module.sections : [];
      const nextSections = sections.map((section, idx) => {
        if (idx !== sectionIndex) return section;
        const patch = typeof updater === 'function' ? updater(section) : updater;
        return { ...section, ...patch };
      });
      return { ...module, sections: nextSections };
    });
  };

  const updateLectureAt = (moduleIndex, sectionIndex, lectureIndex, updater) => {
    updateSectionAt(moduleIndex, sectionIndex, (section) => {
      const lectures = Array.isArray(section.lectures) ? section.lectures : [];
      const nextLectures = lectures.map((lecture, idx) => {
        if (idx !== lectureIndex) return lecture;
        const patch = typeof updater === 'function' ? updater(lecture) : updater;
        return { ...lecture, ...patch };
      });
      return { ...section, lectures: nextLectures };
    });
  };

  const addModule = () => {
    const nextIndex = modules.length;
    updateModules((prev) => [...prev, buildEmptyModule(prev.length)]);
    setActiveModuleIndex(nextIndex);
  };

  const removeModule = (moduleIndex) => {
    updateModules((prev) => prev.filter((_, idx) => idx !== moduleIndex));
    setActiveModuleIndex((prev) => {
      if (prev === moduleIndex) return Math.max(0, prev - 1);
      if (prev > moduleIndex) return prev - 1;
      return prev;
    });
  };

  const addSection = (moduleIndex) => {
    updateModuleAt(moduleIndex, (module) => ({
      ...module,
      sections: [...(module.sections || []), buildEmptySection()],
    }));
  };

  const removeSection = (moduleIndex, sectionIndex) => {
    updateModuleAt(moduleIndex, (module) => {
      const sections = (module.sections || []).filter((_, idx) => idx !== sectionIndex);
      return { ...module, sections: sections.length ? sections : [buildEmptySection()] };
    });
  };

  const addLecture = (moduleIndex, sectionIndex) => {
    updateSectionAt(moduleIndex, sectionIndex, (section) => ({
      ...section,
      lectures: [...(section.lectures || []), buildEmptyLecture()],
    }));
  };

  const removeLecture = (moduleIndex, sectionIndex, lectureIndex) => {
    updateSectionAt(moduleIndex, sectionIndex, (section) => {
      const lectures = (section.lectures || []).filter((_, idx) => idx !== lectureIndex);
      return { ...section, lectures: lectures.length ? lectures : [buildEmptyLecture()] };
    });
  };
  const handleSave = async () => {
    if (!slug) {
      toast.error('Missing course slug');
      return;
    }
    try {
      setSaving(true);
      setError('');
      const payload = {
        modules: modules.map((module, index) => ({
          ...module,
          order: index,
        })),
      };
      await saveCourseDetail({ slug, data: payload, token });
      toast.success('Detailed course data saved');
      await loadDetail();
    } catch (err) {
      const message = err?.message || 'Failed to save detailed data';
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleLectureVideoUpload = async (moduleIndex, sectionIndex, lectureIndex, fileInputEvent) => {
    const file = fileInputEvent?.target?.files?.[0];
    if (!file || !slug) return;
    const key = `${moduleIndex}-${sectionIndex}-${lectureIndex}`;
    try {
      setUploadingMap((prev) => ({ ...prev, [key]: true }));
      const asset = await uploadLectureVideo({
        slug,
        file,
        programme: courseMeta?.programme,
        token,
      });
      updateLectureAt(moduleIndex, sectionIndex, lectureIndex, (lecture) => ({
        ...lecture,
        video: {
          url: asset?.url || '',
          publicId: asset?.publicId || '',
          folder: asset?.folder || '',
          assetType: asset?.resourceType || 'video',
          duration: asset?.duration || 0,
          bytes: asset?.bytes || 0,
          format: asset?.format || '',
        },
      }));
      toast.success('Lecture video uploaded');
    } catch (err) {
      toast.error(err?.message || 'Failed to upload video');
    } finally {
      setUploadingMap((prev) => ({ ...prev, [key]: false }));
      if (fileInputEvent?.target) {
        fileInputEvent.target.value = '';
      }
    }
  };

  const heroSubtitle = courseMeta
    ? `${courseMeta.programme || ''} • ${courseMeta.slug || slug || ''}`.trim()
    : slug || '';

  const variantOptions = [
    { label: 'Standard module', value: 'default' },
    { label: 'Capstone module', value: 'capstone' },
  ];
  return (
    <MasterLayout>
      <div className='container-xxl'>
        <div className='d-flex flex-wrap align-items-center justify-content-between mb-4'>
          <div>
            <p className='text-uppercase small text-muted mb-1'>Course Builder</p>
            <h4 className='mb-1'>Detailed Course Data</h4>
            <div className='text-muted'>
              {courseMeta?.name || location.state?.courseName || courseKey}
              {heroSubtitle ? <span className='ms-2'>• {heroSubtitle}</span> : null}
            </div>
          </div>
          <div className='d-flex flex-wrap gap-2'>
            <button type='button' className='btn btn-outline-secondary' onClick={() => navigate(-1)}>
              Back
            </button>
            <button
              type='button'
              className='btn btn-primary'
              onClick={handleSave}
              disabled={saving || !modules.length}
            >
              {saving ? 'Saving...' : 'Save Detailed Data'}
            </button>
          </div>
        </div>
        {error ? <div className='alert alert-danger'>{error}</div> : null}
        {loading ? (
          <div className='card card-body shadow-sm'>
            <div className='text-center py-5'>Loading detailed modules...</div>
          </div>
        ) : (
          <div className='row g-4'>
            <div className='col-12 col-lg-4'>
              <div className='card shadow-sm h-100'>
                <div className='card-body d-flex flex-column'>
                  <div className='d-flex justify-content-between align-items-center mb-3'>
                    <h6 className='mb-0'>Modules</h6>
                    <button type='button' className='btn btn-sm btn-outline-primary' onClick={addModule}>
                      Add module
                    </button>
                  </div>
                  <div className='list-group flex-grow-1 overflow-auto'>
                    {modules.map((module, index) => (
                      <button
                        type='button'
                        key={module.moduleId}
                        className={`list-group-item list-group-item-action mb-2 rounded-3 ${
                          index === activeModuleIndex ? 'active' : ''
                        }`}
                        onClick={() => setActiveModuleIndex(index)}
                      >
                        <div className='d-flex justify-content-between align-items-center'>
                          <div>
                            <div className='fw-semibold'>{module.moduleLabel || `Module ${index + 1}`}</div>
                            <div className='small text-muted'>{module.title || module.weeksLabel || 'Untitled'}</div>
                          </div>
                          {modules.length > 1 ? (
                            <button
                              type='button'
                              className='btn btn-sm btn-outline-danger ms-2'
                              onClick={(event) => {
                                event.stopPropagation();
                                removeModule(index);
                              }}
                            >
                              Remove
                            </button>
                          ) : null}
                        </div>
                      </button>
                    ))}
                    {!modules.length ? (
                      <div className='text-center text-muted py-4'>No modules yet. Add one to begin.</div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
            <div className='col-12 col-lg-8'>
              {activeModule ? (
                <div className='card shadow-sm'>
                  <div className='card-body'>
                    <div className='d-flex flex-wrap justify-content-between align-items-center mb-3'>
                      <div>
                        <p className='text-uppercase small text-muted mb-1'>Editing module</p>
                        <h5 className='mb-0'>{activeModule.moduleLabel || `Module ${activeModuleIndex + 1}`}</h5>
                      </div>
                      <select
                        className='form-select form-select-sm'
                        style={{ maxWidth: 220 }}
                        value={activeModule.variant || 'default'}
                        onChange={(event) =>
                          updateModuleAt(activeModuleIndex, {
                            variant: event.target.value === 'capstone' ? 'capstone' : 'default',
                          })
                        }
                      >
                        {variantOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className='row g-3'>
                      <div className='col-md-6'>
                        <label className='form-label'>Module label</label>
                        <input
                          type='text'
                          className='form-control'
                          value={activeModule.moduleLabel || ''}
                          onChange={(event) =>
                            updateModuleAt(activeModuleIndex, { moduleLabel: event.target.value })
                          }
                        />
                      </div>
                      <div className='col-md-6'>
                        <label className='form-label'>Weeks label</label>
                        <input
                          type='text'
                          className='form-control'
                          value={activeModule.weeksLabel || ''}
                          onChange={(event) =>
                            updateModuleAt(activeModuleIndex, { weeksLabel: event.target.value })
                          }
                        />
                      </div>
                      <div className='col-12'>
                        <label className='form-label'>Module title</label>
                        <input
                          type='text'
                          className='form-control'
                          value={activeModule.title || ''}
                          onChange={(event) => updateModuleAt(activeModuleIndex, { title: event.target.value })}
                        />
                      </div>
                      <div className='col-12'>
                        <label className='form-label'>Module summary</label>
                        <textarea
                          className='form-control'
                          rows={3}
                          value={activeModule.summary || ''}
                          onChange={(event) => updateModuleAt(activeModuleIndex, { summary: event.target.value })}
                        />
                      </div>
                      <div className='col-12 col-md-6'>
                        <label className='form-label'>Topics covered (one per line)</label>
                        <textarea
                          className='form-control'
                          rows={4}
                          value={arrayToLines(activeModule.topicsCovered)}
                          onChange={(event) =>
                            updateModuleAt(activeModuleIndex, { topicsCovered: linesToArray(event.target.value) })
                          }
                        />
                      </div>
                      <div className='col-12 col-md-6'>
                        <label className='form-label'>Outcomes (one per line)</label>
                        <textarea
                          className='form-control'
                          rows={4}
                          value={arrayToLines(activeModule.outcomes)}
                          onChange={(event) =>
                            updateModuleAt(activeModuleIndex, { outcomes: linesToArray(event.target.value) })
                          }
                        />
                      </div>
                    </div>
                    <hr className='my-4' />
                    <div className='d-flex justify-content-between align-items-center mb-3'>
                      <h6 className='mb-0'>Weekly sections</h6>
                      <button
                        type='button'
                        className='btn btn-sm btn-outline-primary'
                        onClick={() => addSection(activeModuleIndex)}
                      >
                        Add section
                      </button>
                    </div>
                    {activeModule.sections?.map((section, sectionIndex) => (
                      <div className='border rounded-4 p-3 mb-4' key={section.sectionId}>
                        <div className='d-flex justify-content-between align-items-center mb-3'>
                          <div>
                            <strong>Section {sectionIndex + 1}</strong>
                            <div className='text-muted small'>{section.title || 'Untitled section'}</div>
                          </div>
                          {activeModule.sections.length > 1 ? (
                            <button
                              type='button'
                              className='btn btn-sm btn-outline-danger'
                              onClick={() => removeSection(activeModuleIndex, sectionIndex)}
                            >
                              Remove
                            </button>
                          ) : null}
                        </div>
                        <div className='row g-3'>
                          <div className='col-md-6'>
                            <label className='form-label'>Section title</label>
                            <input
                              type='text'
                              className='form-control'
                              value={section.title || ''}
                              onChange={(event) =>
                                updateSectionAt(activeModuleIndex, sectionIndex, { title: event.target.value })
                              }
                            />
                          </div>
                          <div className='col-md-6'>
                            <label className='form-label'>Section subtitle</label>
                            <input
                              type='text'
                              className='form-control'
                              value={section.subtitle || ''}
                              onChange={(event) =>
                                updateSectionAt(activeModuleIndex, sectionIndex, { subtitle: event.target.value })
                              }
                            />
                          </div>
                          <div className='col-12'>
                            <label className='form-label'>Summary</label>
                            <textarea
                              className='form-control'
                              rows={2}
                              value={section.summary || ''}
                              onChange={(event) =>
                                updateSectionAt(activeModuleIndex, sectionIndex, { summary: event.target.value })
                              }
                            />
                          </div>
                          <div className='col-md-6'>
                            <label className='form-label'>Assignments (one per line)</label>
                            <textarea
                              className='form-control'
                              rows={3}
                              value={arrayToLines(section.assignments)}
                              onChange={(event) =>
                                updateSectionAt(activeModuleIndex, sectionIndex, {
                                  assignments: linesToArray(event.target.value),
                                })
                              }
                            />
                          </div>
                          <div className='col-md-6'>
                            <label className='form-label'>Quizzes (one per line)</label>
                            <textarea
                              className='form-control'
                              rows={3}
                              value={arrayToLines(section.quizzes)}
                              onChange={(event) =>
                                updateSectionAt(activeModuleIndex, sectionIndex, {
                                  quizzes: linesToArray(event.target.value),
                                })
                              }
                            />
                          </div>
                          <div className='col-md-6'>
                            <label className='form-label'>Projects (one per line)</label>
                            <textarea
                              className='form-control'
                              rows={3}
                              value={arrayToLines(section.projects)}
                              onChange={(event) =>
                                updateSectionAt(activeModuleIndex, sectionIndex, {
                                  projects: linesToArray(event.target.value),
                                })
                              }
                            />
                          </div>
                          <div className='col-md-6'>
                            <label className='form-label'>Outcomes (one per line)</label>
                            <textarea
                              className='form-control'
                              rows={3}
                              value={arrayToLines(section.outcomes)}
                              onChange={(event) =>
                                updateSectionAt(activeModuleIndex, sectionIndex, {
                                  outcomes: linesToArray(event.target.value),
                                })
                              }
                            />
                          </div>
                        </div>
                        <div className='mt-4'>
                          <div className='d-flex justify-content-between align-items-center mb-3'>
                            <h6 className='mb-0'>Lectures</h6>
                            <button
                              type='button'
                              className='btn btn-sm btn-outline-secondary'
                              onClick={() => addLecture(activeModuleIndex, sectionIndex)}
                            >
                              Add lecture
                            </button>
                          </div>
                          {section.lectures?.map((lecture, lectureIndex) => {
                            const key = `${activeModuleIndex}-${sectionIndex}-${lectureIndex}`;
                            const isUploading = uploadingMap[key];
                            return (
                              <div className='border rounded-3 p-3 mb-3' key={lecture.lectureId}>
                                <div className='d-flex justify-content-between align-items-center mb-3'>
                                  <strong>Lecture {lectureIndex + 1}</strong>
                                  {section.lectures.length > 1 ? (
                                    <button
                                      type='button'
                                      className='btn btn-sm btn-outline-danger'
                                      onClick={() =>
                                        removeLecture(activeModuleIndex, sectionIndex, lectureIndex)
                                      }
                                    >
                                      Remove
                                    </button>
                                  ) : null}
                                </div>
                                <div className='row g-3'>
                                  <div className='col-md-6'>
                                    <label className='form-label'>Lecture name</label>
                                    <input
                                      type='text'
                                      className='form-control'
                                      value={lecture.title || ''}
                                      onChange={(event) =>
                                        updateLectureAt(activeModuleIndex, sectionIndex, lectureIndex, {
                                          title: event.target.value,
                                        })
                                      }
                                    />
                                  </div>
                                  <div className='col-md-6'>
                                    <label className='form-label'>Duration / tag</label>
                                    <input
                                      type='text'
                                      className='form-control'
                                      value={lecture.duration || ''}
                                      onChange={(event) =>
                                        updateLectureAt(activeModuleIndex, sectionIndex, lectureIndex, {
                                          duration: event.target.value,
                                        })
                                      }
                                    />
                                  </div>
                                  <div className='col-12'>
                                    <label className='form-label'>Description</label>
                                    <textarea
                                      className='form-control'
                                      rows={2}
                                      value={lecture.description || ''}
                                      onChange={(event) =>
                                        updateLectureAt(activeModuleIndex, sectionIndex, lectureIndex, {
                                          description: event.target.value,
                                        })
                                      }
                                    />
                                  </div>
                                  <div className='col-12'>
                                    {lecture.video?.url ? (
                                      <div className='alert alert-success d-flex justify-content-between align-items-center'>
                                        <span>Video attached</span>
                                        <a
                                          href={lecture.video.url}
                                          target='_blank'
                                          rel='noreferrer'
                                          className='btn btn-sm btn-light'
                                        >
                                          Preview
                                        </a>
                                      </div>
                                    ) : (
                                      <div className='alert alert-secondary mb-2'>No video uploaded</div>
                                    )}
                                    <label className='btn btn-sm btn-outline-primary'>
                                      {isUploading ? 'Uploading...' : 'Upload video'}
                                      <input
                                        type='file'
                                        accept='video/*'
                                        className='d-none'
                                        disabled={isUploading}
                                        onChange={(event) =>
                                          handleLectureVideoUpload(
                                            activeModuleIndex,
                                            sectionIndex,
                                            lectureIndex,
                                            event
                                          )
                                        }
                                      />
                                    </label>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    {activeModule.variant === 'capstone' ? (
                      <div className='border rounded-4 p-3'>
                        <h6>Capstone details</h6>
                        <div className='row g-3'>
                          <div className='col-12'>
                            <label className='form-label'>Summary</label>
                            <textarea
                              className='form-control'
                              rows={3}
                              value={activeModule.capstone?.summary || ''}
                              onChange={(event) =>
                                updateModuleAt(activeModuleIndex, {
                                  capstone: {
                                    ...(activeModule.capstone || {}),
                                    summary: event.target.value,
                                  },
                                })
                              }
                            />
                          </div>
                          <div className='col-12 col-md-6'>
                            <label className='form-label'>Deliverables (one per line)</label>
                            <textarea
                              className='form-control'
                              rows={3}
                              value={arrayToLines(activeModule.capstone?.deliverables)}
                              onChange={(event) =>
                                updateModuleAt(activeModuleIndex, {
                                  capstone: {
                                    ...(activeModule.capstone || {}),
                                    deliverables: linesToArray(event.target.value),
                                  },
                                })
                              }
                            />
                          </div>
                          <div className='col-12 col-md-6'>
                            <label className='form-label'>Rubric / examples (one per line)</label>
                            <textarea
                              className='form-control'
                              rows={3}
                              value={arrayToLines(activeModule.capstone?.rubric)}
                              onChange={(event) =>
                                updateModuleAt(activeModuleIndex, {
                                  capstone: {
                                    ...(activeModule.capstone || {}),
                                    rubric: linesToArray(event.target.value),
                                  },
                                })
                              }
                            />
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className='card card-body shadow-sm'>
                  <div className='text-center py-5'>Select a module to edit detailed data.</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </MasterLayout>
  );
};

export default CourseDetailData;

