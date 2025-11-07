import { useEffect, useMemo, useState } from 'react';
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

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await listRawCourses({ token });
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onSelectForEdit = async (slug) => {
    try {
      setError('');
      setSelectedSlug(slug);
      const c = await getRawCourseBySlug({ slug, token });
      setJsonText(pretty(c));
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
    setSelectedSlug('');
    setJsonText(pretty(SAMPLE));
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
      toast.success('Saved');
    } catch (e) {
      const msg = e?.message || 'Failed to save';
      setError(msg);
      if (!String(msg).startsWith('Invalid JSON')) toast.error(msg);
    } finally {
      setSaving(false);
    }
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
    } catch (e) {
      alert('Invalid JSON. Please fix JSON before inserting image.');
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
            <div className='card card-body'>
              <div className='d-flex align-items-center justify-content-between'>
                <h5 className='mb-0'>Customize Courses</h5>
                <div className='d-flex gap-2'>
                  <button type='button' className='btn btn-sm btn-primary' onClick={onNew}>New from Template</button>
                  <button type='button' className='btn btn-sm btn-success' onClick={onSave} disabled={saving}>{saving ? 'Saving...' : 'Save / Upsert'}</button>
                </div>
              </div>
              {error ? <div className='alert alert-danger mt-12'>{error}</div> : null}
            </div>
          </div>

          {/* Left: list */}
          <div className='col-12 col-lg-5'>
            <div className='card card-body h-100'>
              <div className='d-flex align-items-center justify-content-between mb-12'>
                <h6 className='mb-0'>Saved Courses</h6>
                <span className='text-sm text-secondary'>{loading ? 'Loading…' : `${items.length} items`}</span>
              </div>
              <div className='table-responsive'>
                <table className='table'>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Slug</th>
                      <th className='text-end'>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it) => (
                      <tr key={it._id || it.id || it.slug}>
                        <td className='text-truncate' style={{maxWidth: 180}}>{it.name}</td>
                        <td className='text-truncate' style={{maxWidth: 200}}>{it.slug}</td>
                        <td className='text-end'>
                          <button className='btn btn-xs btn-outline-primary me-2' onClick={() => onSelectForEdit(it.slug)}>Edit</button>
                          <button className='btn btn-xs btn-outline-danger' onClick={() => onDelete(it.slug)}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right: JSON editor */}
          <div className='col-12 col-lg-7'>
            <div className='card card-body h-100'>
              <div className='d-flex align-items-center justify-content-between mb-8'>
                <h6 className='mb-0'>{selectedSlug ? `Editing: ${selectedSlug}` : 'New Course'}</h6>
                <div className='d-flex gap-2'>
                  <input id='json-course-image-input' type='file' accept='image/*' className='d-none' onChange={onUploadImage} />
                  <button type='button' className='btn btn-xs btn-outline-primary' onClick={() => document.getElementById('json-course-image-input').click()} disabled={imageUploading}>
                    {imageUploading ? 'Uploading…' : 'Upload Image'}
                  </button>
                  <button type='button' className='btn btn-xs btn-secondary' onClick={() => setJsonText(pretty(JSON.parse(jsonText)))}>Prettify</button>
                </div>
              </div>
              <textarea
                className='form-control'
                style={{ fontFamily: 'monospace', minHeight: 520 }}
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
              />
              <div className='mt-10 text-sm text-secondary'>
                Tip: Slug should be in the form <code>programme-slug/course-slug</code>. If omitted, it will be generated from <code>programmeSlug</code> and <code>courseSlug</code>.
              </div>
            </div>
          </div>
        </div>
      </div>
    </MasterLayout>
  );
};

export default CustomizeCourses;
