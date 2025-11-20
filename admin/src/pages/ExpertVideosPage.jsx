import { useEffect, useState, useRef } from 'react';
import MasterLayout from '../masterLayout/MasterLayout';
import Breadcrumb from '../components/Breadcrumb';
import { useAuthContext } from '../context/AuthContext';
import {
  listAdminExpertVideos,
  createAdminExpertVideo,
  updateAdminExpertVideo,
  deleteAdminExpertVideo,
} from '../services/adminExpertVideos';
import './ExpertVideosPage.css';

const uploadStageMessages = {
  signature: 'Preparing secure upload link...',
  upload: 'Uploading video to Cloudinary... This may take a while.',
  finalize: 'Saving expert video metadata...',
};

const defaultForm = { title: '', subtitle: '', description: '', active: true, order: 0, file: null };

const ExpertVideosPage = () => {
  const { token } = useAuthContext();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', subtitle: '', description: '', order: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStage, setUploadStage] = useState(null);
  const fileInputRef = useRef(null);

  const load = async () => {
    try {
      setLoading(true);
      const data = await listAdminExpertVideos({ token });
      setItems(data);
      setError(null);
    } catch (e) {
      setError(e?.message || 'Failed to load expert videos');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelection = (file) => {
    setForm((s) => ({ ...s, file }));
  };

  const onFileInputChange = (e) => {
    const file = e.target.files?.[0] || null;
    handleFileSelection(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget)) {
      return;
    }
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      handleFileSelection(file);
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const handleDropzoneKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openFileDialog();
    }
  };

  const formatFileLabel = (file) => {
    if (!file) return '';
    const sizeMb = file.size ? (file.size / (1024 * 1024)).toFixed(1) : null;
    return sizeMb ? `${file.name} • ${sizeMb} MB` : file.name;
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.file || !form.title) return;
    try {
      setSaving(true);
      setUploadStage(null);
      await createAdminExpertVideo({
        token,
        file: form.file,
        title: form.title,
        subtitle: form.subtitle,
        description: form.description,
        active: form.active,
        order: form.order,
        onStageChange: setUploadStage,
      });
      setForm(defaultForm);
      await load();
    } catch (e) {
      setError(e?.message || 'Failed to upload');
    } finally {
      setSaving(false);
      setUploadStage(null);
    }
  };

  const onDelete = async (id) => {
    if (!window.confirm('Delete this expert video?')) return;
    try {
      await deleteAdminExpertVideo({ token, id });
      await load();
    } catch (e) {
      setError(e?.message || 'Failed to delete');
    }
  };

  const onToggle = async (item) => {
    try {
      await updateAdminExpertVideo({ token, id: item._id, patch: { active: !item.active } });
      await load();
    } catch (e) {
      setError(e?.message || 'Failed to update status');
    }
  };

  const startEdit = (item) => {
    setEditingId(item._id);
    setEditForm({
      title: item.title || '',
      subtitle: item.subtitle || '',
      description: item.description || '',
      order: Number(item.order || 0),
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ title: '', subtitle: '', description: '', order: 0 });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    try {
      setSaving(true);
      await updateAdminExpertVideo({
        token,
        id: editingId,
        patch: {
          title: editForm.title,
          subtitle: editForm.subtitle,
          description: editForm.description,
          order: Number(editForm.order || 0),
        },
      });
      await load();
      cancelEdit();
    } catch (e) {
      setError(e?.message || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const renderControls = (item) => {
    if (editingId === item._id) {
      return (
        <>
          <button className='btn btn-sm btn-success' disabled={saving || !editForm.title} onClick={saveEdit}>
            Save
          </button>
          <button className='btn btn-sm btn-outline-secondary' onClick={cancelEdit}>
            Cancel
          </button>
        </>
      );
    }

    return (
      <>
        <button className='btn btn-sm btn-outline-primary' onClick={() => startEdit(item)}>
          Edit
        </button>
        <button className='btn btn-sm btn-outline-secondary' onClick={() => onToggle(item)}>
          Toggle
        </button>
        <button className='btn btn-sm btn-outline-danger' onClick={() => onDelete(item._id)}>
          Delete
        </button>
      </>
    );
  };

  return (
    <MasterLayout>
      <Breadcrumb title="Expert Videos" />
      <div className='row gy-4'>
        <div className='col-xxl-5'>
          <div className='card h-100'>
            <div className='card-header bg-base py-16 px-24 border-bottom'>
              <h6 className='text-lg fw-semibold mb-0'>Upload Expert Video</h6>
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
                      required
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
                  <div className='col-12'>
                    <label className='form-label'>Description</label>
                    <textarea
                      className='form-control'
                      rows={3}
                      value={form.description}
                      onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
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
                    <label className='form-label'>Video File (mp4/webm/mov)</label>
                    <input
                      ref={fileInputRef}
                      type='file'
                      accept='video/*'
                      className='visually-hidden'
                      onChange={onFileInputChange}
                    />
                    <div
                      className={`upload-dropzone ${isDragging ? 'is-dragging' : ''}`}
                      onDragOver={handleDragOver}
                      onDragEnter={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={(e) => {
                        e.preventDefault();
                        openFileDialog();
                      }}
                      role='button'
                      tabIndex={0}
                      onKeyDown={handleDropzoneKeyDown}
                    >
                      <div className='dropzone-icon'>
                        <i className='ph ph-cloud-arrow-up' aria-hidden='true'></i>
                      </div>
                      <p className='dropzone-label'>
                        {form.file ? 'File ready to upload' : 'Drag & drop your expert video'}
                      </p>
                      <p className='dropzone-file'>
                        {form.file ? formatFileLabel(form.file) : 'MP4, MOV or WEBM up to 200 MB'}
                      </p>
                      <div className='dropzone-actions'>
                        <button
                          type='button'
                          className='btn btn-outline-primary btn-sm'
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            openFileDialog();
                          }}
                        >
                          Browse files
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className='mt-16 d-flex gap-2 align-items-center flex-wrap'>
                  <button type='submit' className='btn btn-primary-600' disabled={saving || !form.file || !form.title}>
                    Upload
                  </button>
                  {saving ? (
                    <span className='text-sm text-neutral-500'>{uploadStageMessages[uploadStage] || 'Processing upload...'}</span>
                  ) : null}
                </div>
                {error ? <div className='text-danger mt-12'>{error}</div> : null}
              </form>
            </div>
          </div>
        </div>

        <div className='col-xxl-7'>
          <div className='card h-100'>
            <div className='card-header bg-base py-16 px-24 border-bottom d-flex align-items-center justify-content-between'>
              <h6 className='text-lg fw-semibold mb-0'>Expert Video Library</h6>
              <button className='btn btn-outline-secondary btn-sm' onClick={load} disabled={loading}>
                Refresh
              </button>
            </div>
            <div className='card-body p-0'>
              <div className='table-responsive'>
                <table className='table table-striped mb-0 align-middle'>
                  <thead>
                    <tr>
                      <th style={{ width: 110 }}>Preview</th>
                      <th>Title</th>
                      <th>Subtitle</th>
                      <th>Active</th>
                      <th style={{ width: 90 }}>Order</th>
                      <th style={{ width: 220 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(items || []).map((item) => (
                      <tr key={item._id}>
                        <td>
                          <video src={item.secureUrl} style={{ width: 100, height: 70, borderRadius: 8 }} muted playsInline />
                        </td>
                        <td>
                          {editingId === item._id ? (
                            <input
                              className='form-control form-control-sm'
                              value={editForm.title}
                              onChange={(e) => setEditForm((s) => ({ ...s, title: e.target.value }))}
                            />
                          ) : (
                            item.title
                          )}
                          {editingId === item._id ? (
                            <textarea
                              className='form-control form-control-sm mt-2'
                              rows={2}
                              value={editForm.description}
                              onChange={(e) => setEditForm((s) => ({ ...s, description: e.target.value }))}
                            />
                          ) : item.description ? (
                            <div className='text-xs text-neutral-500 mt-1'>
                              {item.description.length > 80 ? item.description.slice(0, 80) + '…' : item.description}
                            </div>
                          ) : null}
                        </td>
                        <td>
                          {editingId === item._id ? (
                            <input
                              className='form-control form-control-sm'
                              value={editForm.subtitle}
                              onChange={(e) => setEditForm((s) => ({ ...s, subtitle: e.target.value }))}
                            />
                          ) : (
                            item.subtitle
                          )}
                        </td>
                        <td>
                          <span className={`badge ${item.active ? 'bg-success-600' : 'bg-neutral-400'}`}>
                            {item.active ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td>
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
                        <td className='d-flex flex-wrap gap-2'>{renderControls(item)}</td>
                      </tr>
                    ))}
                    {!items?.length ? (
                      <tr>
                        <td colSpan={6} className='text-center py-24 text-neutral-500'>
                          {loading ? 'Loading�?�' : 'No expert videos yet'}
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

export default ExpertVideosPage;
