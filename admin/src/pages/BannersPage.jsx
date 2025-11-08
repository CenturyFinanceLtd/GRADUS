import { useEffect, useState, useRef } from 'react';
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import { useAuthContext } from '../context/AuthContext';
import {
  listAdminBanners,
  createAdminBanner,
  updateAdminBanner,
  deleteAdminBanner,
} from '../services/adminBanners';

const initialFormState = {
  title: '',
  subtitle: '',
  ctaLabel: '',
  ctaUrl: '',
  order: 0,
  active: true,
  file: null,
};

const BannersPage = () => {
  const { token } = useAuthContext();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(initialFormState);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    title: '',
    subtitle: '',
    ctaLabel: '',
    ctaUrl: '',
    order: 0,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const fileInputRef = useRef(null);

  const load = async () => {
    try {
      setLoading(true);
      const data = await listAdminBanners({ token });
      setItems(data);
      setError(null);
    } catch (e) {
      setError(e?.message || 'Failed to load banners');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.file) return;
    try {
      setSaving(true);
      await createAdminBanner({
        token,
        file: form.file,
        title: form.title,
        subtitle: form.subtitle,
        ctaLabel: form.ctaLabel,
        ctaUrl: form.ctaUrl,
        order: Number(form.order || 0),
        active: form.active,
      });
      setForm(initialFormState);
      setPreviewUrl((current) => {
        if (current) {
          URL.revokeObjectURL(current);
        }
        return '';
      });
      await load();
    } catch (e) {
      setError(e?.message || 'Failed to create banner');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id) => {
    if (!window.confirm('Delete this banner?')) return;
    try {
      await deleteAdminBanner({ token, id });
      await load();
    } catch (e) {
      setError(e?.message || 'Failed to delete banner');
    }
  };

  const onToggle = async (item) => {
    try {
      await updateAdminBanner({ token, id: item._id, patch: { active: !item.active } });
      await load();
    } catch (e) {
      setError(e?.message || 'Failed to update banner');
    }
  };

  const startEdit = (item) => {
    setEditingId(item._id);
    setEditForm({
      title: item.title || '',
      subtitle: item.subtitle || '',
      ctaLabel: item.ctaLabel || '',
      ctaUrl: item.ctaUrl || '',
      order: Number(item.order || 0),
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ title: '', subtitle: '', ctaLabel: '', ctaUrl: '', order: 0 });
  };

  const saveEdit = async (id) => {
    try {
      setSaving(true);
      await updateAdminBanner({
        token,
        id,
        patch: {
          title: editForm.title,
          subtitle: editForm.subtitle,
          ctaLabel: editForm.ctaLabel,
          ctaUrl: editForm.ctaUrl,
          order: Number(editForm.order || 0),
        },
      });
      await load();
      cancelEdit();
    } catch (e) {
      setError(e?.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const replaceImage = async (id, file) => {
    if (!file) return;
    try {
      setSaving(true);
      await updateAdminBanner({ token, id, file });
      await load();
    } catch (e) {
      setError(e?.message || 'Failed to replace image');
    } finally {
      setSaving(false);
    }
  };

  const handleFileSelection = (file) => {
    setForm((s) => ({ ...s, file }));
    setPreviewUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }
      return file ? URL.createObjectURL(file) : '';
    });
  };

  const onFileChange = (e) => {
    const nextFile = e.target.files?.[0] || null;
    handleFileSelection(nextFile);
  };

  const onDropFile = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    let file = event.dataTransfer?.files?.[0];
    if (!file && event.dataTransfer?.items?.length) {
      const item = Array.from(event.dataTransfer.items).find((it) => it.kind === 'file');
      if (item) {
        file = item.getAsFile();
      }
    }
    if (file) {
      handleFileSelection(file);
    }
  };

  const onDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const onDragLeave = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.relatedTarget && event.currentTarget.contains(event.relatedTarget)) {
      return;
    }
    setIsDragging(false);
  };

  return (
    <MasterLayout>
      <Breadcrumb title='Homepage Banners' />
      {error ? <div className='alert alert-danger mt-3'>{error}</div> : null}
      <div className='row gy-4'>
        <div className='col-xxl-5'>
          <div className='card h-100'>
            <div className='card-header bg-base py-16 px-24 border-bottom'>
              <h6 className='text-lg fw-semibold mb-0'>Add New Banner</h6>
            </div>
            <div className='card-body p-24'>
              <form onSubmit={onSubmit}>
                <div className='row g-3'>
                  <div className='col-12'>
                    <label className='form-label'>Title</label>
                    <input
                      className='form-control'
                      value={form.title}
                      onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
                    />
                  </div>
                  <div className='col-12'>
                    <label className='form-label'>Subtitle</label>
                    <input
                      className='form-control'
                      value={form.subtitle}
                      onChange={(e) => setForm((s) => ({ ...s, subtitle: e.target.value }))}
                    />
                  </div>
                  <div className='col-6'>
                    <label className='form-label'>CTA Label</label>
                    <input
                      className='form-control'
                      value={form.ctaLabel}
                      onChange={(e) => setForm((s) => ({ ...s, ctaLabel: e.target.value }))}
                    />
                  </div>
                  <div className='col-6'>
                    <label className='form-label'>CTA URL</label>
                    <input
                      className='form-control'
                      value={form.ctaUrl}
                      onChange={(e) => setForm((s) => ({ ...s, ctaUrl: e.target.value }))}
                      placeholder='https://...'
                    />
                  </div>
                  <div className='col-6'>
                    <label className='form-label'>Active</label>
                    <select
                      className='form-select'
                      value={String(form.active)}
                      onChange={(e) => setForm((s) => ({ ...s, active: e.target.value === 'true' }))}
                    >
                      <option value='true'>Yes</option>
                      <option value='false'>No</option>
                    </select>
                  </div>
                  <div className='col-6'>
                    <label className='form-label'>Order</label>
                    <input
                      type='number'
                      className='form-control'
                      value={form.order}
                      onChange={(e) => setForm((s) => ({ ...s, order: Number(e.target.value || 0) }))}
                    />
                  </div>
                  <div className='col-12'>
                    <label className='form-label'>Banner Image (JPG/PNG/WebP)</label>
                    <div
                      className='border rounded-3 p-4 text-center'
                      style={{
                        cursor: 'pointer',
                        borderStyle: 'dashed',
                        borderWidth: 2,
                        borderColor: isDragging ? 'var(--bs-primary, #0d6efd)' : 'rgba(15,23,42,0.2)',
                        backgroundColor: isDragging ? 'rgba(13,110,253,0.08)' : '#fff',
                        transition: 'background-color 0.2s ease, border-color 0.2s ease',
                      }}
                      onDragOver={onDragOver}
                      onDragEnter={onDragOver}
                      onDragLeave={onDragLeave}
                      onDrop={onDropFile}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <p className='fw-semibold mb-2'>Drag & drop your banner here</p>
                      <p className='text-sm text-neutral-600 mb-3'>or click to browse</p>
                      {form.file ? (
                        <>
                          {previewUrl ? (
                            <div className='mb-3'>
                              <img
                                src={previewUrl}
                                alt='Selected banner preview'
                                style={{ maxWidth: '100%', borderRadius: 8, boxShadow: '0 4px 20px rgba(15,23,42,0.08)' }}
                              />
                            </div>
                          ) : null}
                          <div className='text-sm text-neutral-900'>
                            Selected: <span className='fw-medium'>{form.file.name}</span>
                          </div>
                        </>
                      ) : (
                        <div className='text-sm text-neutral-500'>Recommended size: 1920×720px</div>
                      )}
                    </div>
                    <input
                      type='file'
                      accept='image/*'
                      className='d-none'
                      ref={fileInputRef}
                      onChange={onFileChange}
                    />
                  </div>
                </div>
                <div className='mt-16 d-flex gap-3 align-items-center'>
                  <button type='submit' className='btn btn-primary-600' disabled={saving || !form.file}>
                    Upload Banner
                  </button>
                  {saving ? <span className='text-sm text-neutral-500'>Saving…</span> : null}
                </div>
                <p className='text-sm text-neutral-500 mt-12 mb-0'>
                  Images upload straight to Cloudinary and are served on gradusindia.in automatically.
                </p>
              </form>
            </div>
          </div>
        </div>

        <div className='col-xxl-7'>
          <div className='card h-100'>
            <div className='card-header bg-base py-16 px-24 border-bottom d-flex align-items-center justify-content-between'>
              <h6 className='text-lg fw-semibold mb-0'>Existing Banners</h6>
              <button type='button' className='btn btn-outline-secondary btn-sm' onClick={load} disabled={loading}>
                Refresh
              </button>
            </div>
            <div className='card-body p-0'>
              <div className='table-responsive'>
                <table className='table table-striped mb-0'>
                  <thead>
                    <tr>
                      <th style={{ width: 120 }}>Preview</th>
                      <th>Title</th>
                      <th>CTA</th>
                      <th>Order</th>
                      <th>Active</th>
                      <th style={{ width: 220 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(items || []).map((item) => (
                      <tr key={item._id}>
                        <td>
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.title || 'banner'}
                              style={{ width: 96, height: 56, objectFit: 'cover', borderRadius: 8 }}
                            />
                          ) : (
                            <div className='text-neutral-500'>No image</div>
                          )}
                        </td>
                        <td>
                          {editingId === item._id ? (
                            <>
                              <input
                                className='form-control form-control-sm mb-2'
                                value={editForm.title}
                                onChange={(e) => setEditForm((s) => ({ ...s, title: e.target.value }))}
                                placeholder='Title'
                              />
                              <input
                                className='form-control form-control-sm'
                                value={editForm.subtitle}
                                onChange={(e) => setEditForm((s) => ({ ...s, subtitle: e.target.value }))}
                                placeholder='Subtitle'
                              />
                            </>
                          ) : (
                            <>
                              <div className='fw-semibold'>{item.title || <span className='text-neutral-500'>Untitled</span>}</div>
                              <div className='text-sm text-neutral-600'>{item.subtitle}</div>
                            </>
                          )}
                        </td>
                        <td>
                          {editingId === item._id ? (
                            <>
                              <input
                                className='form-control form-control-sm mb-2'
                                value={editForm.ctaLabel}
                                onChange={(e) => setEditForm((s) => ({ ...s, ctaLabel: e.target.value }))}
                                placeholder='CTA label'
                              />
                              <input
                                className='form-control form-control-sm'
                                value={editForm.ctaUrl}
                                onChange={(e) => setEditForm((s) => ({ ...s, ctaUrl: e.target.value }))}
                                placeholder='CTA URL'
                              />
                            </>
                          ) : (
                            <>
                              <div>{item.ctaLabel || <span className='text-neutral-500'>—</span>}</div>
                              <div className='text-xs text-neutral-500 text-break' style={{ maxWidth: 160 }}>
                                {item.ctaUrl}
                              </div>
                            </>
                          )}
                        </td>
                        <td style={{ width: 80 }}>
                          {editingId === item._id ? (
                            <input
                              type='number'
                              className='form-control form-control-sm'
                              value={editForm.order}
                              onChange={(e) => setEditForm((s) => ({ ...s, order: e.target.value }))}
                            />
                          ) : (
                            item.order || 0
                          )}
                        </td>
                        <td>
                          <span className={`badge ${item.active ? 'bg-success-600' : 'bg-neutral-400'}`}>
                            {item.active ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td>
                          <div className='d-flex flex-column gap-2'>
                            {editingId === item._id ? (
                              <div className='d-flex gap-2 flex-wrap'>
                                <button
                                  className='btn btn-sm btn-success'
                                  disabled={saving}
                                  onClick={() => saveEdit(item._id)}
                                >
                                  Save
                                </button>
                                <button className='btn btn-sm btn-outline-secondary' onClick={cancelEdit}>
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button className='btn btn-sm btn-outline-primary' onClick={() => startEdit(item)}>
                                Edit
                              </button>
                            )}
                            <label className='btn btn-sm btn-outline-info mb-0'>
                              Replace Image
                              <input
                                type='file'
                                accept='image/*'
                                hidden
                                onChange={(e) => {
                                  replaceImage(item._id, e.target.files?.[0]);
                                  e.target.value = '';
                                }}
                              />
                            </label>
                            <div className='d-flex gap-2 flex-wrap'>
                              <button className='btn btn-sm btn-outline-secondary' onClick={() => onToggle(item)}>
                                Toggle
                              </button>
                              <button className='btn btn-sm btn-outline-danger' onClick={() => onDelete(item._id)}>
                                Delete
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!items?.length ? (
                      <tr>
                        <td colSpan={6} className='text-center py-24 text-neutral-500'>
                          {loading ? 'Loading…' : 'No banners uploaded yet'}
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

export default BannersPage;
