import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { createTicket, listMyTickets } from '../services/ticketService.js';

const categories = [
  { value: 'general', label: 'General' },
  { value: 'billing', label: 'Billing' },
  { value: 'technical', label: 'Technical' },
  { value: 'course', label: 'Course' },
  { value: 'account', label: 'Account' },
  { value: 'other', label: 'Other' },
];

const priorities = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const SupportInner = () => {
  const { token } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');

  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('general');
  const [priority, setPriority] = useState('medium');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState(null);

  const fetchTickets = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await listMyTickets({ token, status: statusFilter || undefined });
      setTickets(res?.items || []);
    } catch (err) {
      setError(err?.message || 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const resetForm = () => {
    setSubject('');
    setCategory('general');
    setPriority('medium');
    setDescription('');
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!token) return;
    setCreating(true);
    setMessage(null);
    try {
      await createTicket({ token, subject, category, priority, description });
      setMessage({ type: 'success', text: 'Ticket created successfully.' });
      resetForm();
      await fetchTickets();
    } catch (err) {
      setMessage({ type: 'error', text: err?.message || 'Failed to create ticket.' });
    } finally {
      setCreating(false);
    }
  };

  const formatDateTime = (value) => {
    try {
      return new Date(value).toLocaleString();
    } catch {
      return value;
    }
  };

  return (
    <section className='section-space-sm-top section-space-sm-bottom'>
      <div className='container'>
        <div className='row g-4'>
          <div className='col-lg-5'>
            <div className='card p-24 h-100'>
              <h5 className='mb-12'>Create Support Ticket</h5>
              <p className='text-neutral-500 mb-16'>Describe your issue and our team will get back to you.</p>
              {message ? (
                <div className={`alert alert-${message.type === 'success' ? 'success' : 'danger'}`} role='alert'>
                  {message.text}
                </div>
              ) : null}
              <form onSubmit={handleCreate} className='vstack gap-12'>
                <div>
                  <label className='mb-8'>Subject</label>
                  <input
                    type='text'
                    className='form-control border-neutral-30 radius-8'
                    placeholder='Short summary'
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                  />
                </div>
                <div className='d-flex gap-12'>
                  <div className='flex-grow-1'>
                    <label className='mb-8'>Category</label>
                    <select
                      className='form-select border-neutral-30 radius-8'
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      {categories.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className='flex-grow-1'>
                    <label className='mb-8'>Priority</label>
                    <select
                      className='form-select border-neutral-30 radius-8'
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                    >
                      {priorities.map((p) => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className='mb-8'>Description</label>
                  <textarea
                    className='form-control border-neutral-30 radius-8'
                    rows={6}
                    placeholder='Provide details, steps to reproduce, screenshots (if any)'
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                  />
                </div>
                <div className='d-flex justify-content-end'>
                  <button type='submit' className='btn btn-primary' disabled={creating}>
                    {creating ? 'Submitting...' : 'Submit Ticket'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className='col-lg-7'>
            <div className='card p-24 h-100'>
              <div className='d-flex justify-content-between align-items-center mb-16'>
                <div>
                  <h5 className='mb-8'>My Tickets</h5>
                  <p className='text-neutral-500 mb-0'>Track progress and open details to chat with support.</p>
                </div>
                <div className='d-flex gap-8'>
                  <select className='form-select form-select-sm' value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value=''>All Statuses</option>
                    <option value='not_opened'>Not Opened</option>
                    <option value='opened'>Opened</option>
                    <option value='in_progress'>In Progress</option>
                    <option value='pending_confirmation'>Pending Confirmation</option>
                    <option value='closed'>Closed</option>
                  </select>
                  <button type='button' className='btn btn-outline-primary' onClick={fetchTickets} disabled={loading}>
                    {loading ? 'Loading...' : 'Refresh'}
                  </button>
                </div>
              </div>
              {error ? (
                <div className='alert alert-danger mb-0' role='alert'>{error}</div>
              ) : (
                <div className='vstack gap-12'>
                  {loading && tickets.length === 0 ? (
                    <>
                      {[...Array(3)].map((_, i) => (
                        <div key={`sk-${i}`} className='support-item support-item--skeleton'>
                          <div className='support-item__title skeleton-bar' />
                          <div className='d-flex gap-6 mt-6'>
                            <span className='skeleton-pill' />
                            <span className='skeleton-pill' />
                          </div>
                        </div>
                      ))}
                    </>
                  ) : tickets.length === 0 ? (
                    <div className='alert alert-info mb-0'>No tickets yet. Create your first ticket from the form at left.</div>
                  ) : (
                    tickets.map((t) => (
                      <a key={t.id} href={`/support/${t.id}`} className='support-item text-decoration-none'>
                        <div className='support-item__row'>
                          <div className='support-item__icon'><i className='ph ph-ticket' /></div>
                          <div className='support-item__body'>
                            <div className='support-item__title'>{t.subject}</div>
                            <div className='support-item__meta'>
                              <span className='chip chip--muted text-capitalize'>{t.category}</span>
                              <span className='chip chip--muted text-capitalize'>{t.priority}</span>
                              <span className='chip chip--primary text-capitalize'>{t.status.replace(/_/g, ' ')}</span>
                              <span className='support-item__time'>Updated {formatDateTime(t.lastMessageAt || t.updatedAt)}</span>
                            </div>
                          </div>
                          <div className='support-item__chevron'><i className='ph ph-caret-right' /></div>
                        </div>
                      </a>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SupportInner;
