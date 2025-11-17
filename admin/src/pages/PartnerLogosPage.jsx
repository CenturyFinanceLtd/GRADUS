import { useEffect, useMemo, useRef, useState } from 'react';
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import { useAuthContext } from '../context/AuthContext';
import {
  bulkUploadAdminPartners,
  createAdminPartner,
  deleteAdminPartner,
  listAdminPartners,
  updateAdminPartner,
} from '../services/adminPartners';

const initialFormState = { file: null };

const initialBulkState = {
  files: [],
};

const PartnerLogosPage = () => {
  const { token } = useAuthContext();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState(initialFormState);
  const [bulkForm, setBulkForm] = useState(initialBulkState);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', website: '', programs: '', order: '' });

  const createFileInputRef = useRef(null);
  const bulkFileInputRef = useRef(null);

  const load = async () => {
    try {
      setLoading(true);
      const data = await listAdminPartners({ token });
      setItems(Array.isArray(data) ? data : []);
      setError(null);
    } catch (e) {
      setError(e?.message || 'Failed to load partner logos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.file) return;
    try {
      setSaving(true);
      await createAdminPartner({
        token,
        file: form.file,
        name: '',
        website: '',
        programs: '',
        order: 0,
        active: true,
      });
      setForm(initialFormState);
      if (createFileInputRef.current) {
        createFileInputRef.current.value = '';
      }
      await load();
    } catch (e) {
      setError(e?.message || 'Failed to create partner');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkUpload = async (e) => {
    e.preventDefault();
    if (!bulkForm.files.length) return;
    try {
      setSaving(true);
      await bulkUploadAdminPartners({ token, files: bulkForm.files });
      setBulkForm(initialBulkState);
      if (bulkFileInputRef.current) {
        bulkFileInputRef.current.value = '';
      }
      await load();
    } catch (e) {
      setError(e?.message || 'Bulk upload failed');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (item) => {
    setEditingId(item._id);
      setEditForm({
        name: item.name || '',
        website: item.website || '',
        programs: Array.isArray(item.programs) ? item.programs.join(', ') : '',
        order: typeof item.order !== 'undefined' && item.order !== null ? String(item.order) : '',
      });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ name: '', website: '', programs: '', order: '' });
  };

  const saveEdit = async (id) => {
    try {
      setSaving(true);
      await updateAdminPartner({
        token,
        id,
          patch: {
            name: editForm.name,
            website: editForm.website,
            programs: editForm.programs,
            order: editForm.order === '' ? 0 : Number(editForm.order || 0),
          },
      });
      cancelEdit();
      await load();
    } catch (e) {
      setError(e?.message || 'Failed to save partner');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (item) => {
    try {
      setSaving(true);
      await updateAdminPartner({ token, id: item._id, patch: { active: !item.active } });
      await load();
    } catch (e) {
      setError(e?.message || 'Failed to update status');
    } finally {
      setSaving(false);
    }
  };

  const replaceLogo = async (id, file) => {
    if (!file) return;
    try {
      setSaving(true);
      await updateAdminPartner({ token, id, file });
      await load();
    } catch (e) {
      setError(e?.message || 'Failed to replace logo');
    } finally {
      setSaving(false);
    }
  };

  const removePartner = async (id) => {
    if (!window.confirm('Delete this logo?')) return;
    try {
      await deleteAdminPartner({ token, id });
      await load();
    } catch (e) {
      setError(e?.message || 'Failed to delete partner');
    }
  };

  const sortedItems = useMemo(
    () => (Array.isArray(items) ? [...items].sort((a, b) => (a.order || 0) - (b.order || 0)) : []),
    [items]
  );

  return (
    <MasterLayout>
      <Breadcrumb title='Partner Logos (Cloudinary)' />

      {error ? <div className='alert alert-danger mb-3'>{error}</div> : null}

      <div className='row gy-4'>
        <div className='col-xxl-5'>
          <div className='card h-100 mb-3' style={{ maxHeight: 290 }}>
            <div className='card-header bg-base py-16 px-24 border-bottom'>
              <h6 className='text-lg fw-semibold mb-0'>Add Partner Logo</h6>
            </div>
            <div className='card-body p-24'>
              <form onSubmit={handleCreate}>
                <div className='row g-3'>
                  <div className='col-12'>
                    <label className='form-label'>Logo *</label>
                    <input
                      type='file'
                      className='form-control form-control-lg'
                      accept='image/*'
                      ref={createFileInputRef}
                      onChange={(e) => setForm((prev) => ({ ...prev, file: e.target.files?.[0] || null }))}
                      required
                    />
                    <small className='text-muted d-block mt-2'>
                      Only the logo image is needed; names auto-fill from the file name.
                    </small>
                  </div>
                  <div className='col-12'>
                    <button className='btn btn-primary w-100 py-3' type='submit' disabled={saving}>
                      {saving ? 'Saving...' : 'Save Partner'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>

          <div className='card h-100' style={{ maxHeight: 290 }}>
            <div className='card-header bg-base py-16 px-24 border-bottom'>
              <h6 className='text-lg fw-semibold mb-0'>Bulk Upload Logos</h6>
            </div>
            <div className='card-body p-24'>
              <form onSubmit={handleBulkUpload}>
                <div className='row g-3'>
                  <div className='col-12'>
                    <label className='form-label'>Select Images</label>
                    <input
                      type='file'
                      className='form-control'
                      accept='image/*'
                      multiple
                      ref={bulkFileInputRef}
                      onChange={(e) =>
                        setBulkForm((prev) => ({ ...prev, files: Array.from(e.target.files || []) }))
                      }
                    />
                    <small className='text-muted d-block mt-2'>
                      Upload hundreds at once; names are auto-filled from filenames and set active by default.
                    </small>
                  </div>
                  <div className='col-12'>
                    <button className='btn btn-outline-primary w-100 py-3' type='submit' disabled={saving}>
                      {saving ? 'Uploading...' : 'Upload All'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className='col-xxl-7'>
          <div className='card h-100'>
            <div className='card-header bg-base py-16 px-24 border-bottom d-flex align-items-center justify-content-between'>
              <h6 className='text-lg fw-semibold mb-0'>Existing Logos</h6>
              {loading ? <span className='text-muted small'>Loading...</span> : null}
            </div>
            <div className='card-body p-0'>
              <div className='table-responsive'>
                <table className='table mb-0 align-middle'>
                  <thead className='table-light'>
                    <tr>
                      <th style={{ width: 72 }}>Logo</th>
                      <th>Name</th>
                      <th>Website</th>
                      <th>Programs</th>
                      <th>Order</th>
                      <th>Active</th>
                      <th style={{ width: 180 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedItems.length === 0 ? (
                      <tr>
                        <td colSpan='7' className='text-center py-24'>
                          No partner logos yet
                        </td>
                      </tr>
                    ) : (
                      sortedItems.map((item) => {
                        const isEditing = editingId === item._id;
                        return (
                          <tr key={item._id}>
                            <td>
                              {item.logoUrl ? (
                                <img
                                  src={item.logoUrl}
                                  alt={item.name || 'logo'}
                                  style={{ maxHeight: 44, width: 'auto' }}
                                />
                              ) : (
                                <span className='text-muted'>No logo</span>
                              )}
                            </td>
                            <td>
                              {isEditing ? (
                                <input
                                  className='form-control form-control-sm'
                                  value={editForm.name}
                                  onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                                />
                              ) : (
                                <div className='fw-semibold'>{item.name}</div>
                              )}
                            </td>
                            <td>
                              {isEditing ? (
                                <input
                                  className='form-control form-control-sm'
                                  value={editForm.website}
                                  onChange={(e) =>
                                    setEditForm((prev) => ({ ...prev, website: e.target.value }))
                                  }
                                />
                              ) : item.website ? (
                                <a href={item.website} target='_blank' rel='noreferrer noopener'>
                                  {item.website}
                                </a>
                              ) : (
                                <span className='text-muted'>—</span>
                              )}
                            </td>
                            <td>
                              {isEditing ? (
                                <input
                                  className='form-control form-control-sm'
                                  value={editForm.programs}
                                  onChange={(e) =>
                                    setEditForm((prev) => ({ ...prev, programs: e.target.value }))
                                  }
                                />
                              ) : Array.isArray(item.programs) && item.programs.length ? (
                                <span className='badge text-bg-light'>
                                  {item.programs.join(', ')}
                                </span>
                              ) : (
                                <span className='text-muted'>—</span>
                              )}
                            </td>
                            <td style={{ maxWidth: 90 }}>
                              {isEditing ? (
                                <input
                                  type='number'
                                  className='form-control form-control-sm'
                                  value={editForm.order}
                                  onChange={(e) => setEditForm((prev) => ({ ...prev, order: e.target.value }))}
                                />
                              ) : (
                                <span>{item.order || 0}</span>
                              )}
                            </td>
                            <td>
                              <div className='form-check form-switch'>
                                <input
                                  className='form-check-input'
                                  type='checkbox'
                                  role='switch'
                                  checked={Boolean(item.active)}
                                  onChange={() => toggleActive(item)}
                                  disabled={saving}
                                />
                              </div>
                            </td>
                            <td>
                              <div className='d-flex flex-column gap-1'>
                                {isEditing ? (
                                  <>
                                    <button
                                      className='btn btn-sm btn-success'
                                      onClick={() => saveEdit(item._id)}
                                      disabled={saving}
                                    >
                                      Save
                                    </button>
                                    <button
                                      className='btn btn-sm btn-outline-secondary'
                                      onClick={cancelEdit}
                                      type='button'
                                      disabled={saving}
                                    >
                                      Cancel
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      className='btn btn-sm btn-outline-primary'
                                      onClick={() => startEdit(item)}
                                      type='button'
                                      disabled={saving}
                                    >
                                      Edit
                                    </button>
                                    <label className='btn btn-sm btn-outline-info mb-0'>
                                      <input
                                        type='file'
                                        accept='image/*'
                                        hidden
                                        onChange={(e) => replaceLogo(item._id, e.target.files?.[0])}
                                      />
                                      Replace Logo
                                    </label>
                                    <button
                                      className='btn btn-sm btn-outline-danger'
                                      onClick={() => removePartner(item._id)}
                                      type='button'
                                      disabled={saving}
                                    >
                                      Delete
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
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

export default PartnerLogosPage;
