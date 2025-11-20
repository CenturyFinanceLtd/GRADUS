import { useEffect, useState } from 'react';
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import { useAuthContext } from '../context/AuthContext';
import {
  listAdminPageMeta,
  createAdminPageMeta,
  updateAdminPageMeta,
  deleteAdminPageMeta,
} from '../services/adminPageMeta';

const DEFAULT_ROBOTS = 'index, follow';
const createEmptyForm = () => ({
  path: '',
  title: '',
  description: '',
  keywords: '',
  robots: DEFAULT_ROBOTS,
  active: true,
});

const normalizeLocalPath = (value = '') => {
  let path = String(value).trim();
  if (!path) {
    return '';
  }
  if (!path.startsWith('/')) {
    path = `/${path}`;
  }
  if (path.length > 1) {
    path = path.replace(/\/+$/, '');
  }
  path = path.replace(/\/+/g, '/');
  return path;
};

const PageMetaPage = () => {
  const { token } = useAuthContext();
  const [items, setItems] = useState([]);
  const [defaultMeta, setDefaultMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingDefault, setSavingDefault] = useState(false);
  const [form, setForm] = useState(createEmptyForm);
  const [defaultForm, setDefaultForm] = useState({
    title: '',
    description: '',
    keywords: '',
    robots: DEFAULT_ROBOTS,
  });
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState(null);

  const load = async () => {
    if (!token) {
      return;
    }
    try {
      setLoading(true);
      const data = await listAdminPageMeta({ token });
      setItems(Array.isArray(data.items) ? data.items : []);
      setDefaultMeta(data.defaultMeta || null);
      if (data.defaultMeta) {
        setDefaultForm({
          title: data.defaultMeta.title || '',
          description: data.defaultMeta.description || '',
          keywords: data.defaultMeta.keywords || '',
          robots: data.defaultMeta.robots || DEFAULT_ROBOTS,
        });
      } else {
        setDefaultForm({
          title: '',
          description: '',
          keywords: '',
          robots: DEFAULT_ROBOTS,
        });
      }
      setError(null);
    } catch (err) {
      setError(err?.message || 'Failed to load page metadata.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleDefaultSubmit = async (event) => {
    event.preventDefault();
    if (!defaultForm.title.trim()) {
      setError('Default title is required.');
      return;
    }
    try {
      setSavingDefault(true);
      if (defaultMeta?.id) {
        await updateAdminPageMeta({
          token,
          id: defaultMeta.id,
          payload: {
            title: defaultForm.title,
            description: defaultForm.description,
            keywords: defaultForm.keywords,
            robots: defaultForm.robots,
          },
        });
      } else {
        await createAdminPageMeta({
          token,
          payload: {
            isDefault: true,
            title: defaultForm.title,
            description: defaultForm.description,
            keywords: defaultForm.keywords,
            robots: defaultForm.robots,
          },
        });
      }
      await load();
    } catch (err) {
      setError(err?.message || 'Failed to update default metadata.');
    } finally {
      setSavingDefault(false);
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setForm({
      path: item.path || '',
      title: item.title || '',
      description: item.description || '',
      keywords: item.keywords || '',
      robots: item.robots || DEFAULT_ROBOTS,
      active: item.active !== false,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(createEmptyForm());
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.title.trim()) {
      setError('Both path and title are required.');
      return;
    }
    const normalizedPath = normalizeLocalPath(form.path);
    if (!normalizedPath) {
      setError('Both path and title are required.');
      return;
    }
    setForm((s) => ({ ...s, path: normalizedPath }));
    try {
      setSaving(true);
      if (editingId) {
        await updateAdminPageMeta({
          token,
          id: editingId,
          payload: {
            path: normalizedPath,
            title: form.title,
            description: form.description,
            keywords: form.keywords,
            robots: form.robots,
            active: form.active,
          },
        });
      } else {
        await createAdminPageMeta({
          token,
          payload: {
            path: normalizedPath,
            title: form.title,
            description: form.description,
            keywords: form.keywords,
            robots: form.robots,
            active: form.active,
          },
        });
      }
      cancelEdit();
      await load();
    } catch (err) {
      setError(err?.message || 'Failed to save page metadata.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete metadata for ${item.path}?`)) {
      return;
    }
    try {
      await deleteAdminPageMeta({ token, id: item.id });
      if (editingId === item.id) {
        cancelEdit();
      }
      await load();
    } catch (err) {
      setError(err?.message || 'Failed to delete entry.');
    }
  };

  const handleToggleActive = async (item) => {
    try {
      await updateAdminPageMeta({
        token,
        id: item.id,
        payload: { active: !item.active },
      });
      await load();
    } catch (err) {
      setError(err?.message || 'Failed to update status.');
    }
  };

  const formatTimestamp = (value) => {
    if (!value) {
      return '—';
    }
    try {
      return new Date(value).toLocaleString();
    } catch (e) {
      return value;
    }
  };

  return (
    <MasterLayout>
      <Breadcrumb title='Page Meta' />
      <div className='row gy-4'>
        <div className='col-xxl-4'>
          <div className='card h-100'>
            <div className='card-header bg-base py-16 px-24 border-bottom'>
              <h6 className='text-lg fw-semibold mb-0'>Default Metadata</h6>
            </div>
            <div className='card-body p-24'>
              <form onSubmit={handleDefaultSubmit} className='d-flex flex-column gap-3'>
                <div>
                  <label className='form-label'>Title</label>
                  <input
                    className='form-control'
                    value={defaultForm.title}
                    onChange={(e) => setDefaultForm((s) => ({ ...s, title: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className='form-label'>Description</label>
                  <textarea
                    className='form-control'
                    rows={4}
                    value={defaultForm.description}
                    onChange={(e) => setDefaultForm((s) => ({ ...s, description: e.target.value }))}
                  />
                </div>
                <div>
                  <label className='form-label'>Keywords (comma separated)</label>
                  <textarea
                    className='form-control'
                    rows={3}
                    value={defaultForm.keywords}
                    onChange={(e) => setDefaultForm((s) => ({ ...s, keywords: e.target.value }))}
                  />
                </div>
                <div>
                  <label className='form-label'>Robots</label>
                  <input
                    className='form-control'
                    value={defaultForm.robots}
                    onChange={(e) => setDefaultForm((s) => ({ ...s, robots: e.target.value }))}
                  />
                </div>
                <button type='submit' className='btn btn-primary-600 mt-2' disabled={savingDefault}>
                  {savingDefault ? 'Saving…' : 'Save Default Meta'}
                </button>
              </form>
            </div>
          </div>
        </div>
        <div className='col-xxl-8'>
          <div className='card mb-4'>
            <div className='card-header bg-base py-16 px-24 border-bottom'>
              <h6 className='text-lg fw-semibold mb-0'>{editingId ? 'Edit Page Meta' : 'Add Page Meta'}</h6>
            </div>
            <div className='card-body p-24'>
              <form onSubmit={handleSubmit} className='row g-3'>
                <div className='col-md-6'>
                  <label className='form-label'>Path</label>
                  <input
                    className='form-control'
                    placeholder='/about-us'
                    value={form.path}
                    onChange={(e) => setForm((s) => ({ ...s, path: e.target.value }))}
                    onBlur={() => setForm((s) => ({ ...s, path: normalizeLocalPath(s.path) }))}
                    required
                  />
                </div>
                <div className='col-md-6'>
                  <label className='form-label'>Title</label>
                  <input
                    className='form-control'
                    value={form.title}
                    onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
                    required
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
                <div className='col-12'>
                  <label className='form-label'>Keywords (comma separated)</label>
                  <textarea
                    className='form-control'
                    rows={3}
                    value={form.keywords}
                    onChange={(e) => setForm((s) => ({ ...s, keywords: e.target.value }))}
                  />
                </div>
                <div className='col-md-6'>
                  <label className='form-label'>Robots</label>
                  <input
                    className='form-control'
                    value={form.robots}
                    onChange={(e) => setForm((s) => ({ ...s, robots: e.target.value }))}
                  />
                </div>
                <div className='col-md-6'>
                  <label className='form-label'>Active</label>
                  <select
                    className='form-select'
                    value={form.active ? 'true' : 'false'}
                    onChange={(e) => setForm((s) => ({ ...s, active: e.target.value === 'true' }))}
                  >
                    <option value='true'>Visible</option>
                    <option value='false'>Hidden</option>
                  </select>
                </div>
                <div className='col-12 d-flex gap-2'>
                  <button type='submit' className='btn btn-primary-600' disabled={saving}>
                    {editingId ? 'Save Changes' : 'Add Page Meta'}
                  </button>
                  {editingId ? (
                    <button type='button' className='btn btn-light border' onClick={cancelEdit} disabled={saving}>
                      Cancel
                    </button>
                  ) : null}
                </div>
              </form>
            </div>
          </div>
          <div className='card'>
            <div className='card-header bg-base py-16 px-24 border-bottom d-flex align-items-center justify-content-between'>
              <h6 className='text-lg fw-semibold mb-0'>Page Overrides</h6>
              <button type='button' className='btn btn-outline-secondary btn-sm' onClick={load} disabled={loading}>
                Refresh
              </button>
            </div>
            <div className='card-body p-0'>
              <div className='table-responsive'>
                <table className='table table-striped mb-0'>
                  <thead>
                    <tr>
                      <th style={{ width: '20%' }}>Path</th>
                      <th>Title</th>
                      <th style={{ width: '15%' }}>Robots</th>
                      <th style={{ width: '10%' }}>Status</th>
                      <th style={{ width: '20%' }}>Updated</th>
                      <th style={{ width: '20%' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={6} className='text-center py-4'>
                          {loading ? 'Loading entries…' : 'No overrides yet.'}
                        </td>
                      </tr>
                    ) : (
                      items.map((item) => (
                        <tr key={item.id}>
                          <td><code>{item.path}</code></td>
                          <td>{item.title}</td>
                          <td>{item.robots || '—'}</td>
                          <td>
                            <span className={`badge ${item.active ? 'bg-success-subtle text-success-600' : 'bg-neutral-100 text-neutral-600'}`}>
                              {item.active ? 'Active' : 'Hidden'}
                            </span>
                          </td>
                          <td>{formatTimestamp(item.updatedAt || item.createdAt)}</td>
                          <td>
                            <div className='d-flex flex-wrap gap-2'>
                              <button type='button' className='btn btn-sm btn-outline-primary' onClick={() => startEdit(item)}>
                                Edit
                              </button>
                              <button
                                type='button'
                                className='btn btn-sm btn-outline-secondary'
                                onClick={() => handleToggleActive(item)}
                              >
                                {item.active ? 'Hide' : 'Enable'}
                              </button>
                              <button type='button' className='btn btn-sm btn-outline-danger' onClick={() => handleDelete(item)}>
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          {error ? <div className='alert alert-danger mt-3'>{error}</div> : null}
        </div>
      </div>
    </MasterLayout>
  );
};

export default PageMetaPage;
