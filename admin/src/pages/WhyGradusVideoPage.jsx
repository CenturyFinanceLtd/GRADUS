import { useEffect, useState, useRef } from 'react';
import MasterLayout from '../masterLayout/MasterLayout';
import Breadcrumb from '../components/Breadcrumb';
import { useAuthContext } from '../context/AuthContext';
import {
  listAdminWhyGradusVideo,
  createAdminWhyGradusVideo,
  updateAdminWhyGradusVideo,
  deleteAdminWhyGradusVideo,
} from '../services/adminWhyGradusVideo';
import './WhyGradusVideoPage.css';

const defaultForm = {
  title: '',
  subtitle: '',
  description: '',
  ctaLabel: '',
  ctaHref: '',
  active: true,
  order: 0,
  file: null,
};

const WhyGradusVideoPage = () => {
  const { token } = useAuthContext();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const data = await listAdminWhyGradusVideo({ token });
      setItems(data);
      setError(null);
    } catch (e) {
      setError(e?.message || 'Failed to load videos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFile = (file) => setForm((s) => ({ ...s, file }));
  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  };
  const onDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };
  const onDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setIsDragging(false);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.file && !editingId) return;
    try {
      setSaving(true);
      if (editingId) {
        await updateAdminWhyGradusVideo({
          token,
          id: editingId,
          patch: {
            title: form.title,
            subtitle: form.subtitle,
            description: form.description,
            ctaLabel: form.ctaLabel,
            ctaHref: form.ctaHref,
            active: form.active,
            order: form.order,
          },
        });
      } else {
        await createAdminWhyGradusVideo({
          token,
          file: form.file,
          title: form.title,
          subtitle: form.subtitle,
          description: form.description,
          ctaLabel: form.ctaLabel,
          ctaHref: form.ctaHref,
          active: form.active,
          order: form.order,
        });
      }
      setForm(defaultForm);
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err?.message || 'Failed to upload');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (item) => {
    setEditingId(item._id);
    setForm({
      title: item.title || '',
      subtitle: item.subtitle || '',
      description: item.description || '',
      ctaLabel: item.ctaLabel || '',
      ctaHref: item.ctaHref || '',
      active: !!item.active,
      order: Number(item.order || 0),
      file: null,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(defaultForm);
  };

  const toggleActive = async (item) => {
    try {
      await updateAdminWhyGradusVideo({ token, id: item._id, patch: { active: !item.active } });
      await load();
    } catch (e) {
      setError(e?.message || 'Failed to update');
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this video?')) return;
    try {
      await deleteAdminWhyGradusVideo({ token, id });
      await load();
    } catch (e) {
      setError(e?.message || 'Failed to delete');
    }
  };

  const formatSize = (file) => {
    if (!file?.size) return '';
    return `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <MasterLayout>
      <Breadcrumb title="Why Gradus Video" />
      <div className='row gy-4'>
        <div className='col-xxl-5'>
          <div className='card h-100'>
            <div className='card-header bg-base py-16 px-24 border-bottom'>
              <h6 className='text-lg fw-semibold mb-0'>Upload Video</h6>
            </div>
            <div className='card-body p-24'>
              <form onSubmit={onSubmit}>
                <div className='row g-3'>
                  <div className='col-12'>
                    <label className='form-label'>Title</label>
                    <input className='form-control' value={form.title} onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))} />
                  </div>
                  <div className='col-12'>
                    <label className='form-label'>Subtitle</label>
                    <input className='form-control' value={form.subtitle} onChange={(e) => setForm((s) => ({ ...s, subtitle: e.target.value }))} />
                  </div>
                  <div className='col-12'>
                    <label className='form-label'>Description</label>
                    <textarea className='form-control' rows={3} value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} />
                  </div>
                  <div className='col-6'>
                    <label className='form-label'>CTA Label</label>
                    <input className='form-control' value={form.ctaLabel} onChange={(e) => setForm((s) => ({ ...s, ctaLabel: e.target.value }))} />
                  </div>
                  <div className='col-6'>
                    <label className='form-label'>CTA Link</label>
                    <input className='form-control' value={form.ctaHref} onChange={(e) => setForm((s) => ({ ...s, ctaHref: e.target.value }))} />
                  </div>
                  <div className='col-6'>
                    <label className='form-label'>Active</label>
                    <select className='form-select' value={String(form.active)} onChange={(e) => setForm((s) => ({ ...s, active: e.target.value === 'true' }))}>
                      <option value='true'>Yes</option>
                      <option value='false'>No</option>
                    </select>
                  </div>
                  <div className='col-6'>
                    <label className='form-label'>Order</label>
                    <input type='number' className='form-control' value={form.order} onChange={(e) => setForm((s) => ({ ...s, order: Number(e.target.value || 0) }))} />
                  </div>
                  <div className='col-12'>
                    <label className='form-label'>Video File (mp4/webm/mov)</label>
                    <input ref={fileInputRef} type='file' accept='video/*' className='visually-hidden' onChange={(e) => handleFile(e.target.files?.[0] || null)} />
                    <div
                      className={`upload-dropzone ${isDragging ? 'is-dragging' : ''}`}
                      onDragOver={onDrop}
                      onDragEnter={onDragOver}
                      onDragLeave={onDragLeave}
                      onDrop={onDrop}
                      role='button'
                      tabIndex={0}
                      onClick={(e) => {
                        e.preventDefault();
                        fileInputRef.current?.click();
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          fileInputRef.current?.click();
                        }
                      }}
                    >
                      <div className='dropzone-icon'>
                        <i className='ph ph-cloud-arrow-up' aria-hidden='true'></i>
                      </div>
                      <p className='dropzone-label'>
                        {form.file ? 'File ready to upload' : 'Drag & drop your video'}
                      </p>
                      <p className='dropzone-file'>
                        {form.file ? `${form.file.name} • ${formatSize(form.file)}` : 'MP4, MOV or WEBM up to 200 MB'}
                      </p>
                      <div className='dropzone-actions'>
                        <button type='button' className='btn btn-outline-primary btn-sm'>
                          Browse files
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className='mt-16 d-flex gap-2 align-items-center'>
                  <button type='submit' className='btn btn-primary-600' disabled={saving || (!form.file && !editingId)}>
                    {editingId ? 'Save Changes' : 'Upload'}
                  </button>
                  {editingId ? (
                    <button type='button' className='btn btn-outline-secondary' onClick={cancelEdit} disabled={saving}>
                      Cancel
                    </button>
                  ) : null}
                  {saving ? <span className='text-sm text-neutral-500'>Uploading…</span> : null}
                </div>
                {error ? <div className='text-danger mt-12'>{error}</div> : null}
              </form>
            </div>
          </div>
        </div>

        <div className='col-xxl-7'>
          <div className='card h-100'>
            <div className='card-header bg-base py-16 px-24 border-bottom d-flex align-items-center justify-content-between'>
              <h6 className='text-lg fw-semibold mb-0'>Existing Items</h6>
              <button className='btn btn-outline-secondary btn-sm' onClick={load} disabled={loading}>Refresh</button>
            </div>
            <div className='card-body p-0'>
              <div className='table-responsive'>
                <table className='table table-striped mb-0 align-middle'>
                  <thead>
                    <tr>
                      <th style={{ width: 120 }}>Preview</th>
                      <th>Title</th>
                      <th>Active</th>
                      <th style={{ width: 80 }}>Order</th>
                      <th style={{ width: 140 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(items || []).map((it) => (
                      <tr key={it._id}>
                        <td>
                          <video src={it.secureUrl} style={{ width: 120, height: 80, borderRadius: 8 }} muted playsInline />
                        </td>
                        <td>
                          <div className='fw-semibold'>{it.title || '(No title)'}</div>
                          {it.subtitle ? <div className='text-xs text-neutral-500 mt-1'>{it.subtitle}</div> : null}
                        </td>
                        <td>
                          <span className={`badge ${it.active ? 'bg-success-600' : 'bg-neutral-400'}`}>{it.active ? 'Yes' : 'No'}</span>
                        </td>
                        <td>{it.order || 0}</td>
                        <td className='d-flex flex-wrap gap-2'>
                          <button className='btn btn-sm btn-outline-primary' onClick={() => startEdit(it)}>Edit</button>
                          <button className='btn btn-sm btn-outline-secondary' onClick={() => toggleActive(it)}>Toggle</button>
                          <button className='btn btn-sm btn-outline-danger' onClick={() => remove(it._id)}>Delete</button>
                        </td>
                      </tr>
                    ))}
                    {!items?.length ? (
                      <tr>
                        <td colSpan={5} className='text-center py-24 text-neutral-500'>
                          {loading ? 'Loading…' : 'No videos yet'}
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MasterLayout>
  );
};

export default WhyGradusVideoPage;
