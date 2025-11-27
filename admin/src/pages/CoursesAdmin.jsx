import { useEffect, useMemo, useState } from 'react';
import MasterLayout from '../masterLayout/MasterLayout';
import { PUBLIC_SITE_BASE } from '../config/env';
import { useAuthContext } from '../context/AuthContext';
import {
  listAdminCourses,
  createAdminCourse,
  updateAdminCourse,
  deleteAdminCourse,
  bulkCreateCourses,
} from '../services/adminCourses';
import { uploadImage } from '../services/uploads';

const defaultForm = {
  name: '',
  slug: '',
  programme: 'Gradus X',
  price: '',
  level: '',
  duration: '',
  mode: '',
  effort: '',
  language: '',
  prerequisites: '',
  subtitle: '',
  focus: '',
  approvals: '',
  placementRange: '',
  outcomeSummary: '',
  deliverables: '',
  finalAward: '',
  outcomesText: '',
  skillsText: '',
  capstoneText: '',
  careerText: '',
  toolsText: '',
  imageUrl: '',
  imageAlt: '',
  assessmentMaxAttempts: 3,
};

const programmeOptions = ['Gradus X', 'Gradus Finlit', 'Gradus Lead'];

    const toCourseUrl = (it) => {
    const localSlugify = (input) => {
      if (!input) return '';
      return String(input)
        .normalize('NFKD')
        .replace(/[&+]/g, ' and ')
        .replace(/[/_]/g, ' ')
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-');
    };
    const prog = (it && it.programme) || 'Gradus X';
    const slug = (it && (it.slug || it.name)) || '';
    const path = `/${localSlugify(prog)}/${localSlugify(slug)}`;
    return (typeof PUBLIC_SITE_BASE === 'string' && PUBLIC_SITE_BASE) ? (PUBLIC_SITE_BASE + path) : path;
  };


const CoursesAdmin = () => {
  const { token } = useAuthContext();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [modules, setModules] = useState([{ title: '', hours: '', pointsText: '' }]);
  const [slugTouched, setSlugTouched] = useState(false);
  const [editId, setEditId] = useState(null);
  const [partners, setPartners] = useState([{ name: '', logo: '', website: '' }]);
  const [certifications, setCertifications] = useState([{ level: '', certificateName: '', coverageText: '', outcome: '' }]);
  const [imageUploading, setImageUploading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listAdminCourses({ token });
      setItems(data);
    } catch (e) {
      setError(e?.message || 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // simple slugify helper (mirrors frontend)
  const slugify = (input) => {
    if (!input) return '';
    return String(input)
      .normalize('NFKD')
      .replace(/[&+]/g, ' and ')
      .replace(/[/_]/g, ' ')
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-');
  };

  const programmeSlug = useMemo(() => slugify(form.programme), [form.programme]);
  const courseSlug = useMemo(() => (form.slug ? slugify(form.slug) : slugify(form.name)), [form.name, form.slug]);

  const downloadTemplate = () => {
    const example = [
      {
        name: 'Technical Analysis',
        slug: 'technical-analysis',
        programme: 'Gradus Finlit',
        price: 'INR 15,000',
        level: 'Beginner',
        duration: '4 weeks',
        mode: 'Self-paced',
        details: { effort: '3-5 hrs/week', language: 'English', prerequisites: '' },
        outcomes: ['Read charts', 'Identify trends'],
        skills: ['Charts', 'Indicators'],
        capstonePoints: ['Case study project'],
        careerOutcomes: ['Trader', 'Analyst'],
        toolsFrameworks: ['TradingView'],
        weeks: [
          { title: 'Intro', hours: '3 hours to complete', points: ['Basics', 'Setup'] },
        ],
      },
    ];
    const blob = new Blob([JSON.stringify(example, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'courses-template.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const onUploadFile = async (e) => {
    const file = e?.target?.files?.[0];
    if (!file) return;
    try {
      setSaving(true);
      setError(null);
      const text = await file.text();
      const items = JSON.parse(text);
      if (!Array.isArray(items)) throw new Error('JSON must be an array of courses');
      const results = await bulkCreateCourses({ items, token });
      const ok = results.filter((r) => r.ok).length;
      const fail = results.length - ok;
      await load();
      alert(`Imported ${ok} course(s). ${fail ? fail + ' failed' : 'All succeeded'}.`);
    } catch (err) {
      setError(err?.message || 'Upload failed');
    } finally {
      setSaving(false);
      if (e?.target) e.target.value = '';
    }
  };

    const handleSubmit = async (e) => {
      e?.preventDefault?.();
      try {
        setSaving(true);
        setError(null);
        // Parse textareas into arrays/structures
        const parseLines = (txt) => (txt || '').split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
        const parseCSV = (txt) => (txt || '').split(',').map((s) => s.trim()).filter(Boolean);
        const weeksFromModules = modules.map((m) => ({
          title: (m.title || '').trim(),
          hours: (m.hours || '').trim(),
          points: parseLines(m.pointsText || ''),
        }));

        const payload = {
          name: form.name,
          slug: courseSlug,
          programme: form.programme,
          price: form.price,
          level: form.level,
          duration: form.duration,
          mode: form.mode,
          subtitle: form.subtitle,
          focus: form.focus,
          approvals: parseCSV(form.approvals),
          placementRange: form.placementRange,
          outcomeSummary: form.outcomeSummary,
          deliverables: parseLines(form.deliverables),
          finalAward: form.finalAward,
          details: {
            effort: form.effort,
            language: form.language,
            prerequisites: form.prerequisites,
          },
          outcomes: parseLines(form.outcomesText),
          skills: parseCSV(form.skillsText),
          capstonePoints: parseLines(form.capstoneText),
          careerOutcomes: parseLines(form.careerText),
          toolsFrameworks: parseLines(form.toolsText),
          assessmentMaxAttempts: Number(form.assessmentMaxAttempts) || 3,
          weeks: weeksFromModules,
          partners: partners.map(p => ({ name: p.name.trim(), logo: p.logo.trim(), website: p.website.trim() })).filter(p => p.name),
        certifications: certifications.map(c => ({ level: c.level.trim(), certificateName: c.certificateName.trim(), coverage: parseLines(c.coverageText), outcome: c.outcome.trim() })).filter(c => c.certificateName),
        };

        // Attach image fields if present
        if (form.imageUrl) payload.imageUrl = String(form.imageUrl).trim();
        if (form.imageAlt) payload.imageAlt = String(form.imageAlt).trim();

        let saved = null;
        if (editId) {
          saved = await updateAdminCourse({ id: editId, data: payload, token });
        } else {
          saved = await createAdminCourse({ data: payload, token });
        }
        setForm(defaultForm);
        setModules([{ title: '', hours: '', pointsText: '' }]);
        setPartners([{ name: '', logo: '', website: '' }]);
        setCertifications([{ level: '', certificateName: '', coverageText: '', outcome: '' }]);
        setSlugTouched(false);
        setEditId(null);
        if (saved) await load();
      } catch (e) {
        setError(e?.response?.data?.message || e?.message || 'Save failed');
      } finally {
        setSaving(false);
      }
    };

    const onEdit = (item) => {
      setEditId(item.id);
      const weeksArr = Array.isArray(item.weeks) ? item.weeks : [];
      const modState = weeksArr.length
        ? weeksArr.map((w) => ({ title: w.title || '', hours: w.hours || '', pointsText: (w.points || []).join('\n') }))
        : [{ title: '', hours: '', pointsText: '' }];

      setForm({
        name: item.name || '',
        slug: item.slug || '',
        programme: item.programme || 'Gradus X',
        price: item.price || '',
        level: item.level || '',
        duration: item.duration || '',
        mode: item.mode || '',
        effort: item.details?.effort || '',
        language: item.details?.language || '',
        prerequisites: item.details?.prerequisites || '',
        subtitle: item.subtitle || '',
        focus: item.focus || '',
        approvals: (item.approvals || []).join(', '),
        placementRange: item.placementRange || '',
        outcomeSummary: item.outcomeSummary || '',
        deliverables: (item.deliverables || []).join('\n'),
        finalAward: item.finalAward || '',
        outcomesText: (item.outcomes || []).join('\n'),
        skillsText: (item.skills || []).join(', '),
        capstoneText: (item.capstonePoints || []).join('\n'),
        careerText: (item.careerOutcomes || []).join('\n'),
        toolsText: (item.toolsFrameworks || []).join('\n'),
        assessmentMaxAttempts: item.assessmentMaxAttempts ?? 3,
      });
      setModules(modState);
      setPartners(Array.isArray(item.partners) && item.partners.length ? item.partners.map(p => ({ ...p })) : [{ name: '', logo: '', website: '' }]);
      setCertifications(Array.isArray(item.certifications) && item.certifications.length ? item.certifications.map(c => ({ ...c, coverageText: (c.coverage || []).join('\n') })) : [{ level: '', certificateName: '', coverageText: '', outcome: '' }]);
    };

  const onDelete = async (id) => {
    if (!window.confirm('Delete this course?')) return;
    try {
      await deleteAdminCourse({ id, token });
      await load();
    } catch (e) {
      alert(e?.message || 'Delete failed');
    }
  };

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => {
      const next = { ...f, [name]: value };
      if (name === 'name' && !slugTouched && !f.slug) {
        next.slug = slugify(value);
      }
      return next;
    });
  };

  const onSlugChange = (e) => {
    setSlugTouched(true);
    setForm((f) => ({ ...f, slug: e.target.value }));
  };

  const onImageChange = async (e) => {
    const file = e?.target?.files && e.target.files[0];
    if (!file) return;
    try {
      setImageUploading(true);
      const uploaded = await uploadImage({ file, token });
      setForm((f) => ({ ...f, imageUrl: uploaded.url }));
    } catch (err) {
      alert(err?.message || 'Image upload failed');
    } finally {
      setImageUploading(false);
    }
  };

  const clearImage = () => setForm((f) => ({ ...f, imageUrl: '' }));

  return (
    <MasterLayout>
      <div className='container py-4'>
        <h2 className='mb-4'>Courses</h2>
        {error ? <div className='alert alert-danger'>{error}</div> : null}
        <form onSubmit={handleSubmit} className='border rounded-3 p-4 mb-4 bg-white'>
          <h5 className='mb-3'>Basic Information</h5>
          <div className='row g-3 mb-2'>
            <div className='col-md-4'>
              <label className='form-label'>Name</label>
              <input name='name' value={form.name} onChange={onChange} className='form-control' placeholder='e.g., Technical Analysis' required />
            </div>
            <div className='col-md-4'>
              <label className='form-label'>Slug</label>
              <input name='slug' value={form.slug} onChange={onSlugChange} className='form-control' placeholder='auto from name if blank' />
              <div className='form-text'>Preview: /{programmeSlug}/{courseSlug || 'your-course'}</div>
            </div>
            <div className='col-md-4'>
              <label className='form-label'>Programme</label>
              <select name='programme' value={form.programme} onChange={onChange} className='form-select'>
                {programmeOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div className='col-md-3'>
              <label className='form-label'>Price (optional)</label>
              <input name='price' value={form.price} onChange={onChange} className='form-control' placeholder='INR 63,700' />
            </div>
            <div className='col-md-3'>
              <label className='form-label'>Level</label>
              <input name='level' value={form.level} onChange={onChange} className='form-control' placeholder='Beginner' />
            </div>
            <div className='col-md-3'>
              <label className='form-label'>Duration</label>
              <input name='duration' value={form.duration} onChange={onChange} className='form-control' placeholder='4 weeks' />
            </div>
            <div className='col-md-3'>
              <label className='form-label'>Mode</label>
              <input name='mode' value={form.mode} onChange={onChange} className='form-control' placeholder='Self-paced' />
            </div>
            <div className='col-md-3'>
              <label className='form-label'>Assessment max attempts</label>
              <input
                type='number'
                min='1'
                name='assessmentMaxAttempts'
                value={form.assessmentMaxAttempts}
                onChange={onChange}
                className='form-control'
                placeholder='e.g., 3'
              />
              <div className='form-text'>Limit per learner per assessment.</div>
            </div>
            <div className='col-md-4'>
              <label className='form-label'>Course Image</label>
              {form.imageUrl ? (
                <div className='d-flex align-items-center gap-2'>
                  <img src={form.imageUrl} alt='' style={{ width: '96px', height: '64px', objectFit: 'cover', borderRadius: 8, border: '1px solid #eee' }} />
                  <button type='button' className='btn btn-outline-danger btn-sm' onClick={clearImage}>Remove</button>
                </div>
              ) : (
                <input type='file' accept='image/*' className='form-control' onChange={onImageChange} disabled={imageUploading} />
              )}
              <div className='form-text'>{imageUploading ? 'Uploading…' : 'Recommended ~392x306 or similar aspect.'}</div>
            </div>
            <div className='col-md-4'>
              <label className='form-label'>Image Alt Text</label>
              <input name='imageAlt' value={form.imageAlt} onChange={onChange} className='form-control' placeholder='Short description for accessibility' />
            </div>
            <div className='col-md-4'>
              <label className='form-label'>Effort</label>
              <input name='effort' value={form.effort} onChange={onChange} className='form-control' placeholder='3-5 hrs/week' />
            </div>
            <div className='col-md-4'>
              <label className='form-label'>Language</label>
              <input name='language' value={form.language} onChange={onChange} className='form-control' placeholder='English' />
            </div>
            <div className='col-md-4'>
              <label className='form-label'>Prerequisites</label>
              <input name='prerequisites' value={form.prerequisites} onChange={onChange} className='form-control' placeholder='Optional' />
            </div>
            <div className='col-md-6'>
              <label className='form-label'>Subtitle</label>
              <input name='subtitle' value={form.subtitle} onChange={onChange} className='form-control' placeholder='e.g., Become a full-stack developer' />
            </div>
            <div className='col-md-6'>
              <label className='form-label'>Focus</label>
              <input name='focus' value={form.focus} onChange={onChange} className='form-control' placeholder='e.g., MERN Stack' />
            </div>
          </div>
          <h5 className='mb-3 mt-2'>Content</h5>
          <div className='row g-3'>
            <div className='col-12'>
              <label className='form-label'>What you'll learn (one per line)</label>
              <textarea name='outcomesText' value={form.outcomesText} onChange={onChange} className='form-control' rows={4} placeholder='One per line' />
            </div>
            <div className='col-12'>
              <label className='form-label'>Skills (comma separated)</label>
              <textarea name='skillsText' value={form.skillsText} onChange={onChange} className='form-control' rows={2} placeholder='Comma separated' />
              <div className='form-text'>Separate with commas.</div>
            </div>
            <div className='col-12'>
              <label className='form-label'>Capstone points (one per line)</label>
              <textarea name='capstoneText' value={form.capstoneText} onChange={onChange} className='form-control' rows={3} placeholder='One per line' />
            </div>
            <div className='col-12'>
              <label className='form-label'>Career outcomes (one per line)</label>
              <textarea name='careerText' value={form.careerText} onChange={onChange} className='form-control' rows={3} placeholder='One per line' />
            </div>
            <div className='col-12'>
              <label className='form-label'>Tools & Frameworks (one per line)</label>
              <textarea name='toolsText' value={form.toolsText} onChange={onChange} className='form-control' rows={3} placeholder='One per line' />
            </div>
          </div>
          <h5 className='mb-3 mt-4'>Details</h5>
          <div className='row g-3'>
            <div className='col-12'>
              <label className='form-label'>Approvals (comma separated)</label>
              <input name='approvals' value={form.approvals} onChange={onChange} className='form-control' placeholder='e.g., NASSCOM, UGC' />
            </div>
            <div className='col-md-6'>
              <label className='form-label'>Placement Range</label>
              <input name='placementRange' value={form.placementRange} onChange={onChange} className='form-control' placeholder='e.g., 5-12 LPA' />
            </div>
            <div className='col-md-6'>
              <label className='form-label'>Final Award</label>
              <input name='finalAward' value={form.finalAward} onChange={onChange} className='form-control' placeholder='e.g., Certificate of Completion' />
            </div>
            <div className='col-12'>
              <label className='form-label'>Outcome Summary</label>
              <textarea name='outcomeSummary' value={form.outcomeSummary} onChange={onChange} className='form-control' rows={3} placeholder='A brief summary of the course outcomes' />
            </div>
            <div className='col-12'>
              <label className='form-label'>Deliverables (one per line)</label>
              <textarea name='deliverables' value={form.deliverables} onChange={onChange} className='form-control' rows={3} placeholder='e.g., A portfolio of projects' />
            </div>
          </div>
                    <h5 className='mb-3 mt-4'>Modules</h5>
          <div className='row g-3'>
            {modules.map((m, idx) => (
              <div className='col-12' key={`module-${idx}`}>
                <div className='border rounded-3 p-3 bg-white'>
                  <div className='d-flex justify-content-between align-items-center mb-3'>
                    <strong>Module {idx + 1}</strong>
                    <div className='d-flex gap-2'>
                      <button type='button' className='btn btn-sm btn-outline-secondary' onClick={() => setModules((mods) => mods.filter((_, i) => i !== idx))} disabled={modules.length <= 1}>Remove</button>
                      <button type='button' className='btn btn-sm btn-outline-secondary' onClick={() => setModules((mods) => { if (idx === 0) return mods; const arr = mods.slice(); const tmp = arr[idx-1]; arr[idx-1] = arr[idx]; arr[idx] = tmp; return arr; })} disabled={idx === 0}>Up</button>
                      <button type='button' className='btn btn-sm btn-outline-secondary' onClick={() => setModules((mods) => { if (idx === mods.length - 1) return mods; const arr = mods.slice(); const tmp = arr[idx+1]; arr[idx+1] = arr[idx]; arr[idx] = tmp; return arr; })} disabled={idx === modules.length - 1}>Down</button>
                    </div>
                  </div>
                  <div className='row g-3'>
                    <div className='col-md-6'>
                      <label className='form-label'>Title</label>
                      <input className='form-control' value={m.title} onChange={(e) => setModules((mods) => mods.map((mm,i)=> i===idx? { ...mm, title: e.target.value } : mm))} placeholder='e.g., Introduction to Full Stack Development' />
                    </div>
                    <div className='col-md-6'>
                      <label className='form-label'>Duration/Weeks</label>
                      <input className='form-control' value={m.hours} onChange={(e) => setModules((mods) => mods.map((mm,i)=> i===idx? { ...mm, hours: e.target.value } : mm))} placeholder='Weeks 1' />
                    </div>
                    <div className='col-12'>
                      <label className='form-label'>Topics Covered (one per line)</label>
                      <textarea rows={3} className='form-control' value={m.pointsText} onChange={(e) => setModules((mods) => mods.map((mm,i)=> i===idx? { ...mm, pointsText: e.target.value } : mm))} placeholder={'Orientation & course expectations\nTools setup and quick wins\nFirst mini-project'} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div className='col-12'>
              <button type='button' className='btn btn-sm btn-outline-primary' onClick={() => setModules((mods) => [...mods, { title: '', hours: '', pointsText: '' }])}>+ Add Module</button>
            </div>
          </div>
          <h5 className='mb-3 mt-4'>Partners</h5>
          <div className='row g-3'>
            {partners.map((p, idx) => (
              <div className='col-12' key={`partner-${idx}`}>
                <div className='border rounded-3 p-3 bg-white'>
                  <div className='d-flex justify-content-between align-items-center mb-3'>
                    <strong>Partner {idx + 1}</strong>
                    <div className='d-flex gap-2'>
                      <button type='button' className='btn btn-sm btn-outline-secondary' onClick={() => setPartners((parts) => parts.filter((_, i) => i !== idx))} disabled={partners.length <= 1}>Remove</button>
                      <button type='button' className='btn btn-sm btn-outline-secondary' onClick={() => setPartners((parts) => { if (idx === 0) return parts; const arr = parts.slice(); const tmp = arr[idx-1]; arr[idx-1] = arr[idx]; arr[idx] = tmp; return arr; })} disabled={idx === 0}>Up</button>
                      <button type='button' className='btn btn-sm btn-outline-secondary' onClick={() => setPartners((parts) => { if (idx === parts.length - 1) return parts; const arr = parts.slice(); const tmp = arr[idx+1]; arr[idx+1] = arr[idx]; arr[idx] = tmp; return arr; })} disabled={idx === partners.length - 1}>Down</button>
                    </div>
                  </div>
                  <div className='row g-3'>
                    <div className='col-md-4'>
                      <label className='form-label'>Name</label>
                      <input className='form-control' value={p.name} onChange={(e) => setPartners((parts) => parts.map((pp,i)=> i===idx? { ...pp, name: e.target.value } : pp))} placeholder='e.g., Google' />
                    </div>
                    <div className='col-md-4'>
                      <label className='form-label'>Logo URL</label>
                      <input className='form-control' value={p.logo} onChange={(e) => setPartners((parts) => parts.map((pp,i)=> i===idx? { ...pp, logo: e.target.value } : pp))} placeholder='e.g., /images/google.png' />
                    </div>
                    <div className='col-md-4'>
                      <label className='form-label'>Website</label>
                      <input className='form-control' value={p.website} onChange={(e) => setPartners((parts) => parts.map((pp,i)=> i===idx? { ...pp, website: e.target.value } : pp))} placeholder='e.g., https://google.com' />
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div className='col-12'>
              <button type='button' className='btn btn-sm btn-outline-primary' onClick={() => setPartners((parts) => [...parts, { name: '', logo: '', website: '' }])}>+ Add Partner</button>
            </div>
          </div>
          <h5 className='mb-3 mt-4'>Certifications</h5>
          <div className='row g-3'>
            {certifications.map((c, idx) => (
              <div className='col-12' key={`cert-${idx}`}>
                <div className='border rounded-3 p-3 bg-white'>
                  <div className='d-flex justify-content-between align-items-center mb-3'>
                    <strong>Certification {idx + 1}</strong>
                    <div className='d-flex gap-2'>
                      <button type='button' className='btn btn-sm btn-outline-secondary' onClick={() => setCertifications((prev) => prev.filter((_, i) => i !== idx))} disabled={certifications.length <= 1}>Remove</button>
                      <button type='button' className='btn btn-sm btn-outline-secondary' onClick={() => setCertifications((prev) => { if (idx === 0) return prev; const arr = prev.slice(); const tmp = arr[idx-1]; arr[idx-1] = arr[idx]; arr[idx] = tmp; return arr; })} disabled={idx === 0}>Up</button>
                      <button type='button' className='btn btn-sm btn-outline-secondary' onClick={() => setCertifications((certs) => { if (idx === certs.length - 1) return certs; const arr = certs.slice(); const tmp = arr[idx+1]; arr[idx+1] = arr[idx]; arr[idx] = tmp; return arr; })} disabled={idx === certs.length - 1}>Down</button>
                    </div>
                  </div>
                  <div className='row g-3'>
                    <div className='col-md-6'>
                      <label className='form-label'>Level</label>
                      <input className='form-control' value={c.level} onChange={(e) => setCertifications((prev) => prev.map((cc,i)=> i===idx? { ...cc, level: e.target.value } : cc))} placeholder='e.g., Professional' />
                    </div>
                    <div className='col-md-6'>
                      <label className='form-label'>Certificate Name</label>
                      <input className='form-control' value={c.certificateName} onChange={(e) => setCertifications((prev) => prev.map((cc,i)=> i===idx? { ...cc, certificateName: e.target.value } : cc))} placeholder='e.g., Google Certified Professional' />
                    </div>
                    <div className='col-12'>
                      <label className='form-label'>Coverage (one per line)</label>
                      <textarea rows={3} className='form-control' value={c.coverageText} onChange={(e) => setCertifications((prev) => prev.map((cc,i)=> i===idx? { ...cc, coverageText: e.target.value } : cc))} placeholder={'e.g., Cloud Architecture\nSecurity'} />
                    </div>
                    <div className='col-12'>
                      <label className='form-label'>Outcome</label>
                      <input className='form-control' value={c.outcome} onChange={(e) => setCertifications((prev) => prev.map((cc,i)=> i===idx? { ...cc, outcome: e.target.value } : cc))} placeholder='e.g., Demonstrate expertise in Google Cloud' />
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div className='col-12'>
              <button type='button' className='btn btn-sm btn-outline-primary' onClick={() => setCertifications((prev) => [...prev, { level: '', certificateName: '', coverageText: '', outcome: '' }])}>+ Add Certification</button>
            </div>
          </div><div className='d-flex justify-content-end gap-2 mt-3'>
            {editId ? <button type='button' className='btn btn-outline-secondary' onClick={() => { setEditId(null); setForm(defaultForm); setSlugTouched(false); setModules([{ title: '', hours: '', pointsText: '' }]); setPartners([{ name: '', logo: '', website: '' }]); setCertifications([{ level: '', certificateName: '', coverageText: '', outcome: '' }]); }}>Cancel</button> : null}
            <button disabled={saving} className='btn btn-main'>{editId ? 'Update' : 'Create'} Course</button>
          </div>
        </form>
        <div className='bg-white border rounded-3 p-4'>
          <div className='d-flex justify-content-between align-items-center mb-2'>
            <h5 className='mb-0'>All Courses</h5>
            <div className='d-flex gap-2'>
              <input id='courses-upload-input' type='file' accept='.json,application/json' className='d-none' onChange={onUploadFile} />
              <button type='button' className='btn btn-sm btn-outline-success' onClick={() => document.getElementById('courses-upload-input').click()} disabled={saving}>Upload JSON</button>
              <button type='button' className='btn btn-sm btn-outline-secondary' onClick={downloadTemplate}>Template</button>
              <button className='btn btn-sm btn-outline-secondary' onClick={load} disabled={loading}>Refresh</button>
            </div>
          </div>
          <div className='table-responsive'>
            <table className='table'>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Slug</th>
                  <th>Programme</th>
                  <th>Price</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id}>
                    <td>{it.name}</td>
                    <td>{it.slug}</td>
                    <td>{it.programme || 'Gradus X'}</td>
                    <td>{it.price || '-'}</td>
                    <td className='text-end'>
                      <a className='btn btn-sm btn-outline-success me-2' href={toCourseUrl(it)} target='_blank' rel='noreferrer'>View</a>
                      <button className='btn btn-sm btn-outline-primary me-2' onClick={() => onEdit(it)}>Edit</button>
                      <button className='btn btn-sm btn-outline-danger' onClick={() => onDelete(it.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
                {!items.length && (
                  <tr><td colSpan={5} className='text-center text-muted'>No courses</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </MasterLayout>
  );
};

export default CoursesAdmin;
