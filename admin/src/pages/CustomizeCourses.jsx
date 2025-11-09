import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MasterLayout from '../masterLayout/MasterLayout';
import { useAuthContext } from '../context/AuthContext';
import {
  listRawCourses,
  upsertRawCourse,
  deleteCourseBySlug,
  getRawCourseBySlug,
} from '../services/adminCourses';
import { toast } from 'react-toastify';
import { uploadImage } from '../services/uploads';

const SAMPLE = {
  name: 'Full Stack Development Mastery (MERN)',
  programme: 'Gradus X',
  programmeSlug: 'gradus-x',
  courseSlug: 'full-stack-development-mastery-mern',
  slug: 'gradus-x/full-stack-development-mastery-mern',
  hero: { subtitle: 'This course is part of GradusX', priceINR: 18000, enrolledText: '176,437 already enrolled' },
  stats: { modules: 5, mode: 'Online', level: 'Intermediate–Advanced', duration: '6 Weeks' },
  aboutProgram: [
    'The Full Stack Development Mastery Program is a hands-on, intensive course designed to help learners master the complete web development cycle using the MERN stack — MongoDB, Express.js, React, and Node.js.',
    'Starting from frontend React applications to backend REST APIs and databases, this program teaches you how to design, develop, and deploy full-stack web applications that are scalable and production-ready.',
    'By the end of the program, learners will have built a complete full-stack project connecting all layers of a modern web app.',
  ],
  learn: [
    'Frontend development using React.js and modern UI design',
    'Backend logic and REST API development using Node.js and Express.js',
    'Database design and CRUD operations with MongoDB',
    'Authentication, authorization, and JWT-based security',
    'Deployment and environment configuration for full-stack apps',
  ],
  skills: ['Problem Solving', 'Project Work', 'Collaboration', 'Best Practices', 'Foundations', 'Full Stack Development'],
  details: { effort: '8-10 hours per week', language: 'English', prerequisites: 'Basic HTML/CSS/JS (covered in Module 1)' },
  capstone: {
    summary: 'Build a complete agentic AI assistant integrating:',
    bullets: [
      'React front-end with routing and state',
      'Node.js/Express back-end APIs',
      'Database for persistence and auth',
      'Security, testing, and deployment pipeline',
    ],
  },
  careerOutcomes: ['Full Stack Developer', 'Back-end Engineer', 'Web Application Developer', 'DevOps Engineer'],
  toolsFrameworks: [
    'Front-end: React, JavaScript, CSS (Tailwind)',
    'Back-end: Node.js, Express',
    'Database: MongoDB, PostgreSQL',
    'Tools: Git, npm, Docker, Vercel/Heroku',
    'Testing/Auth: Jest, Cypress, JWT/Passport.js',
  ],
  modules: [
    {
      title: 'Backend Foundations',
      weeksLabel: 'Weeks 1–2',
      topics: [
        'Introduction to Node.js and Express.js',
        'Setting up a backend server and routing',
        'RESTful API principles and architecture',
        'Working with JSON and middleware',
        'Building APIs for CRUD operations',
      ],
      outcome:
        'Develop functional backend APIs using Node.js and Express.js and understand request-response cycles and REST principles.',
    },
    {
      title: 'Database Integration',
      weeksLabel: 'Weeks 3–4',
      topics: [
        'MongoDB fundamentals and data modeling',
        'CRUD operations and Mongoose ORM',
        'Relating collections and handling queries',
        'Error handling, validation, and performance optimization',
        'Authentication and authorization using JWT',
      ],
      outcome: 'Integrate MongoDB with backend APIs and implement secure user authentication and role-based access.',
    },
    {
      title: 'Frontend with React & Capstone',
      weeksLabel: 'Weeks 5–6',
      topics: [
        'Connecting backend APIs to React frontend',
        'Fetching, displaying, and managing data dynamically',
        'State management, hooks, and context API',
        'End-to-end integration of client and server',
        'Capstone: Build and deploy a complete MERN stack web application',
      ],
      extras: {
        projectTitle: 'Capstone Project',
        projectDescription:
          'Build and deploy a complete MERN stack web application demonstrating full-stack integration.',
        examples: ['Task manager', 'E-commerce prototype', 'Blog platform'],
        deliverables: [
          'Fully functional full-stack application',
          'Hosted project with GitHub repository and deployment link',
        ],
      },
      outcome:
        'Build, connect, and deploy a full-stack web app using MERN and showcase a professional, portfolio-ready project.',
    },
  ],
  instructors: [
    { name: 'Gradus Mentor', subtitle: 'Industry Practitioner - 120k learners' },
    { name: 'Guest Expert', subtitle: 'Visiting Faculty - 27k learners' },
  ],
  offeredBy: { name: 'Gradus India', subtitle: 'A subsidiary of Century Finance Limited', logo: '/assets/images/cfl.png' },
};

const pretty = (obj) => JSON.stringify(obj, null, 2);

const CustomizeCourses = () => {
  const { token } = useAuthContext();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [jsonText, setJsonText] = useState(pretty(SAMPLE));
  const [saving, setSaving] = useState(false);
  const [selectedSlug, setSelectedSlug] = useState('');
  const [imageUploading, setImageUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [lastSync, setLastSync] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState('create');
  const imageInputRef = useRef(null);

  useEffect(() => {
    document.body.style.overflow = editorOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [editorOpen]);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter((it) => {
      const fields = [it?.name, it?.slug, it?.programme, it?.programmeSlug, it?.courseSlug];
      return fields.some((field) => field?.toLowerCase().includes(term));
    });
  }, [items, search]);

  const jsonState = useMemo(() => {
    try {
      return { valid: true, parsed: JSON.parse(jsonText || '{}') };
    } catch (err) {
      return { valid: false, error: err?.message || 'Unable to parse JSON' };
    }
  }, [jsonText]);

  const selectedCourse = useMemo(
    () => items.find((it) => (selectedSlug ? it.slug === selectedSlug : false)),
    [items, selectedSlug],
  );

  const currentCourseMeta = useMemo(() => {
    const base =
      (editorOpen ? (jsonState.valid ? jsonState.parsed : null) : null) || selectedCourse || SAMPLE;
    const modulesFromStats = base?.stats?.modules;
    const modulesFromArray = Array.isArray(base?.modules) ? base.modules.length : undefined;
    return {
      name: base?.name || (selectedSlug ? selectedSlug.split('/').pop() : 'New Course'),
      programme: base?.programme || base?.programmeSlug || 'Programme TBD',
      duration: base?.stats?.duration || base?.duration || '',
      modules: modulesFromStats || modulesFromArray || 0,
    };
  }, [editorOpen, jsonState, selectedCourse, selectedSlug]);

  const heroDescription = useMemo(() => {
    if (editorOpen) {
      return 'JSON editor is open. Save your changes or cancel to return to the dashboard.';
    }
    if (selectedCourse) {
      const focusName = selectedCourse.name || selectedCourse.slug || 'this course';
      return `Currently focused on ${focusName}. Click Edit to open the JSON modal or Add Course to start a new draft.`;
    }
    return 'Start with the curated template, tailor the content, and publish a polished course in minutes.';
  }, [editorOpen, selectedCourse]);

  const heroStats = [
    { label: 'Total Courses', value: items.length || 0 },
    { label: 'Visible Now', value: filteredItems.length || 0 },
    { label: 'Active Modules', value: currentCourseMeta.modules || 0 },
    {
      label: 'Last Sync',
      value: lastSync ? lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--',
    },
  ];

  const jsonStatusStyles = jsonState.valid
    ? { backgroundColor: 'rgba(25,135,84,.12)', color: '#198754' }
    : { backgroundColor: 'rgba(220,53,69,.15)', color: '#dc3545' };

  const jsonStatusLabel = jsonState.valid ? 'JSON valid' : 'JSON invalid';

  const isFiltering = Boolean(search.trim());
  const coursesLabel = isFiltering
    ? `Showing ${filteredItems.length} of ${items.length}`
    : `${items.length} total courses`;

  const modalTitle = editorMode === 'edit' ? 'Edit Course' : 'Add Course';
  const modalPrimaryLabel =
    editorMode === 'edit' ? (saving ? 'Saving...' : 'Save Changes') : (saving ? 'Adding...' : 'Add Course');
  const canDismissEditor = !saving;
  const closeEditor = () => {
    if (!canDismissEditor) return;
    setEditorOpen(false);
  };

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await listRawCourses({ token });
      const normalized = Array.isArray(data) ? data : [];
      setItems(normalized);
      setSelectedSlug((prev) => {
        if (prev && normalized.some((course) => course.slug === prev)) return prev;
        return normalized[0]?.slug || '';
      });
      setLastSync(new Date());
    } catch (e) {
      setError(e?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const onSelectForEdit = async (slug) => {
    try {
      setError('');
      setSelectedSlug(slug);
      const c = await getRawCourseBySlug({ slug, token });
      setJsonText(pretty(c));
      setEditorMode('edit');
      setEditorOpen(true);
    } catch (e) {
      setError(e?.message || 'Failed to load course');
    }
  };

  const onDelete = async (slug) => {
    if (!window.confirm(`Delete course ${slug}?`)) return;
    try {
      setError('');
      await deleteCourseBySlug({ slug, token });
      if (selectedSlug === slug) {
        setSelectedSlug('');
        setJsonText(pretty(SAMPLE));
      }
      await load();
      toast.success('Course deleted');
    } catch (e) {
      const msg = e?.message || 'Failed to delete';
      setError(msg);
      toast.error(msg);
    }
  };

  const onNew = () => {
    setJsonText(pretty(SAMPLE));
    setEditorMode('create');
    setEditorOpen(true);
    setError('');
  };

  const onSave = async () => {
    try {
      setSaving(true);
      setError('');
      let parsed = null;
      try {
        parsed = JSON.parse(jsonText);
      } catch (e) {
        const msg = 'Invalid JSON: ' + e.message;
        toast.error(msg);
        throw new Error(msg);
      }
      if (!parsed || typeof parsed !== 'object') {
        const msg = 'JSON must be an object';
        toast.error(msg);
        throw new Error(msg);
      }
      const saved = await upsertRawCourse({ data: parsed, token });
      setSelectedSlug(saved?.slug || '');
      await load();
      toast.success(editorMode === 'edit' ? 'Course updated' : 'Course added');
      setEditorOpen(false);
    } catch (e) {
      const msg = e?.message || 'Failed to save';
      setError(msg);
      if (!String(msg).startsWith('Invalid JSON')) toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const prettifyJson = () => {
    try {
      setJsonText(pretty(JSON.parse(jsonText || '{}')));
      toast.success('JSON formatted');
    } catch (err) {
      const msg = err?.message || 'Invalid JSON';
      toast.error(`Fix JSON before prettifying: ${msg}`);
    }
  };

  const triggerImageUpload = () => {
    if (imageUploading) return;
    imageInputRef.current?.click();
  };

  const insertImageIntoJson = (uploaded) => {
    try {
      const obj = JSON.parse(jsonText || '{}');
      obj.image = {
        ...(obj.image || {}),
        url: uploaded?.url || '',
        publicId: uploaded?.publicId || '',
      };
      setJsonText(pretty(obj));
    } catch (err) {
      console.error('Failed to merge uploaded image into JSON', err);
      toast.error('Invalid JSON. Please fix JSON before inserting image.');
    }
  };

  const onUploadImage = async (e) => {
    const file = e?.target?.files && e.target.files[0];
    if (!file) return;
    try {
      setImageUploading(true);
      const uploaded = await uploadImage({ file, token });
      insertImageIntoJson(uploaded);
      toast.success('Image uploaded');
    } catch (err) {
      const msg = err?.message || 'Upload failed';
      toast.error(msg);
    } finally {
      setImageUploading(false);
      // reset input so same file can be reselected
      e.target.value = '';
    }
  };

  return (
    <MasterLayout>
      <div className='container-xxl'>
        <div className='row g-4'>
          <div className='col-12'>
            <div className='card border-0 shadow-sm overflow-hidden'>
              <div className='row g-0 align-items-center'>
                <div
                  className='col-lg-8 p-4 p-lg-5 text-white'
                  style={{ background: 'linear-gradient(135deg, #101936, #243b55)' }}
                >
                  <p className='text-uppercase small fw-semibold mb-2 text-white-50'>Course builder</p>
                  <h4 className='mb-3 text-white'>Customize Courses</h4>
                  {selectedCourse ? (
                    <div className='text-white-50 small mb-2'>
                      {selectedCourse.programme || selectedCourse.programmeSlug || 'Programme'}
                      {selectedCourse.stats?.duration ? ` • ${selectedCourse.stats.duration}` : ''}
                      {selectedCourse.slug ? ` • ${selectedCourse.slug}` : ''}
                    </div>
                  ) : null}
                  <p className='mb-0' style={{ opacity: 0.85 }}>
                    {heroDescription}
                  </p>
                </div>
                <div className='col-lg-4 p-4 bg-light'>
                  <div className='row g-3'>
                    {heroStats.map((stat) => (
                      <div className='col-6' key={stat.label}>
                        <div className='border rounded-3 bg-white p-3 text-center h-100 shadow-sm'>
                          <div className='text-uppercase small text-muted mb-1'>{stat.label}</div>
                          <div className='fs-5 fw-semibold text-dark'>{stat.value}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className='border-top px-4 py-3 bg-white d-flex flex-wrap align-items-center gap-2'>
                <div className='text-muted small me-auto'>
                  {selectedCourse
                    ? `Focused on ${selectedCourse.slug}`
                    : 'Select a course or add a new one to start editing'}
                </div>
                <button type='button' className='btn btn-sm btn-primary' onClick={onNew}>
                  Add Course
                </button>
              </div>
            </div>
          </div>
          {error ? (
            <div className='col-12'>
              <div className='alert alert-danger mb-0'>{error}</div>
            </div>
          ) : null}

          <div className='col-12'>
            <div className='card border-0 shadow-sm h-100'>
              <div className='card-body d-flex flex-column'>
                <div className='d-flex flex-wrap align-items-start gap-3'>
                  <div>
                    <p className='text-uppercase small text-muted mb-1'>Saved courses</p>
                    <h5 className='mb-0'>{coursesLabel}</h5>
                    {lastSync ? (
                      <span className='small text-muted'>Synced {lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    ) : null}
                  </div>
                  <button
                    type='button'
                    className='btn btn-sm btn-outline-secondary ms-auto'
                    onClick={load}
                    disabled={loading}
                  >
                    {loading ? 'Refreshing...' : 'Refresh'}
                  </button>
                </div>
                <div className='mt-3'>
                  <div className='input-group input-group-sm shadow-sm'>
                    <span className='input-group-text bg-white border-0 text-muted'>Search</span>
                    <input
                      type='text'
                      className='form-control border-0'
                      placeholder='Search by name or slug'
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                    {search ? (
                      <button className='btn btn-light border-0' type='button' onClick={() => setSearch('')}>
                        Clear
                      </button>
                    ) : null}
                  </div>
                </div>
                <div className='table-responsive mt-4'>
                  <table className='table align-middle mb-0'>
                    <thead className='text-muted text-uppercase small'>
                      <tr>
                        <th style={{ width: '35%' }}>Name</th>
                        <th style={{ width: '35%' }}>Slug</th>
                        <th className='text-end' style={{ width: '30%' }}>
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={3} className='text-center text-muted py-5'>
                            Loading courses...
                          </td>
                        </tr>
                      ) : filteredItems.length ? (
                        filteredItems.map((it) => (
                      <tr
                        key={it._id || it.id || it.slug}
                        className={`saved-course-row ${selectedSlug === it.slug ? 'table-active' : ''}`}
                        style={{ cursor: 'pointer' }}
                        onClick={() => setSelectedSlug(it.slug)}
                      >
                        <td className='text-truncate' style={{ maxWidth: 160 }}>
                          <div className='fw-semibold'>{it.name}</div>
                          <div className='text-muted small'>{it.programme || it.programmeSlug}</div>
                        </td>
                        <td className='text-truncate text-muted small' style={{ maxWidth: 200 }}>
                          {it.slug}
                            </td>
                        <td className='text-end'>
                          <div className='btn-group btn-group-sm'>
                            <button
                              type='button'
                              className='btn btn-outline-primary'
                              onClick={(event) => {
                                event.stopPropagation();
                                onSelectForEdit(it.slug);
                              }}
                            >
                              Edit
                            </button>
                            <button
                              type='button'
                              className='btn btn-outline-danger'
                              onClick={(event) => {
                                event.stopPropagation();
                                onDelete(it.slug);
                              }}
                            >
                              Delete
                            </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className='text-center text-muted py-5'>
                            {isFiltering ? 'No courses match your search.' : 'No courses available yet.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className='mt-3 small text-muted border-top pt-3'>
                  Tip: Use the Edit button to open the JSON editor modal. Nothing is displayed on the right panel anymore, so changes only happen inside the popup.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {editorOpen ? (
        <div
          className='position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center'
          style={{ background: 'rgba(5,10,24,0.75)', zIndex: 1050 }}
          role='dialog'
          aria-modal='true'
        >
          <div className='bg-white rounded-4 shadow-lg w-100' style={{ maxWidth: 960, maxHeight: '92vh' }}>
            <div className='d-flex align-items-start justify-content-between border-bottom px-4 py-3'>
              <div>
                <p className='text-uppercase small text-muted mb-1'>{modalTitle}</p>
                <h5 className='mb-1'>{currentCourseMeta.name}</h5>
                <div className='text-muted small'>
                  {editorMode === 'edit' && selectedSlug ? selectedSlug : 'New course draft'}
                </div>
              </div>
              <span className='badge fw-semibold text-uppercase' style={jsonStatusStyles}>
                {jsonStatusLabel}
              </span>
            </div>
            <div className='px-4 py-3 border-bottom d-flex flex-wrap gap-2 align-items-center'>
              <button type='button' className='btn btn-sm btn-outline-secondary' onClick={() => setJsonText(pretty(SAMPLE))}>
                New from Template
              </button>
              <button
                type='button'
                className='btn btn-sm btn-outline-primary'
                onClick={triggerImageUpload}
                disabled={imageUploading}
              >
                {imageUploading ? 'Uploading...' : 'Upload Image'}
              </button>
              <button type='button' className='btn btn-sm btn-outline-dark' onClick={prettifyJson}>
                Prettify JSON
              </button>
              <span className='small text-muted ms-auto'>
                {editorMode === 'edit' ? 'Editing existing record' : 'Adding a brand new course'}
              </span>
            </div>
            {!jsonState.valid && jsonState.error ? (
              <div className='alert alert-warning mb-0 rounded-0 px-4 py-2 small'>{jsonState.error}</div>
            ) : null}
            <div className='px-4 py-3' style={{ maxHeight: '55vh', overflow: 'auto' }}>
              <textarea
                className='form-control border rounded-3 shadow-sm'
                style={{ fontFamily: 'monospace', minHeight: 420 }}
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                aria-label='Course JSON editor'
              />
            </div>
            <div className='border-top px-4 py-3 d-flex justify-content-between align-items-center'>
              <button
                type='button'
                className='btn btn-outline-secondary'
                onClick={closeEditor}
                disabled={!canDismissEditor}
              >
                Cancel
              </button>
              <button type='button' className='btn btn-success' onClick={onSave} disabled={saving}>
                {modalPrimaryLabel}
              </button>
            </div>
            <input ref={imageInputRef} type='file' accept='image/*' className='d-none' onChange={onUploadImage} />
          </div>
        </div>
      ) : null}
    </MasterLayout>
  );
};

export default CustomizeCourses;
