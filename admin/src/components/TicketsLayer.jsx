import { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import useAuth from '../hook/useAuth';
import { listTickets } from '../services/adminTickets';
import { Link } from 'react-router-dom';

const TicketsLayer = () => {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ status: '', priority: '', outcome: '', search: '' });

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await listTickets({ token, ...filters });
      setItems(res?.items || []);
    } catch (err) {
      setError(err?.message || 'Failed to load tickets');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [token, filters]);

  useEffect(() => { load(); }, [load]);

  const onKeyDownSearch = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      load();
    }
  };

  // Chip helpers for consistent visual tags
  const chipStyleBase = { display: 'inline-flex', alignItems: 'center', padding: '4px 8px', borderRadius: '999px', fontSize: 12, fontWeight: 600 };
  const statusColors = (status) => {
    const map = {
      not_opened: { bg: '#f3f4f6', fg: '#374151' },
      opened: { bg: '#eef2ff', fg: '#4338ca' },
      in_progress: { bg: '#eff6ff', fg: '#1d4ed8' },
      pending_confirmation: { bg: '#fff7ed', fg: '#b45309' },
      closed: { bg: '#ecfdf5', fg: '#047857' },
    };
    return map[status] || map.not_opened;
  };
  const priorityColors = (priority) => {
    const map = {
      low: { bg: '#f3f4f6', fg: '#374151' },
      medium: { bg: '#eef2ff', fg: '#4338ca' },
      high: { bg: '#fff7ed', fg: '#b45309' },
      urgent: { bg: '#fee2e2', fg: '#b91c1c' },
    };
    return map[(priority || '').toLowerCase()] || map.medium;
  };
  const StatusChip = ({ value }) => {
    const c = statusColors(value);
    return <span style={{ ...chipStyleBase, backgroundColor: c.bg, color: c.fg }} className='text-capitalize'>{String(value || '').replace(/_/g, ' ')}</span>;
  };
  const PriorityChip = ({ value }) => {
    const c = priorityColors(value);
    return <span style={{ ...chipStyleBase, backgroundColor: c.bg, color: c.fg }} className='text-capitalize'>{value}</span>;
  };

  StatusChip.propTypes = { value: PropTypes.string };
  PriorityChip.propTypes = { value: PropTypes.string };

  const formatDateTime = (value) => {
    try {
      return new Date(value).toLocaleString();
    } catch {
      return value;
    }
  };

  return (
    <div className='card p-24'>
      <div className='d-flex flex-wrap gap-12 justify-content-between align-items-end mb-16'>
        <div>
          <h5 className='mb-8'>Support Tickets</h5>
          <p className='text-neutral-500 mb-0'>Manage incoming tickets from website users.</p>
        </div>
        <div className='d-flex flex-wrap gap-8'>
          <select
            className='form-select form-select-sm'
            value={filters.status}
            onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}
          >
            <option value=''>All Statuses</option>
            <option value='not_opened'>Not Opened</option>
            <option value='opened'>Opened</option>
            <option value='in_progress'>In Progress</option>
            <option value='pending_confirmation'>Pending Confirmation</option>
            <option value='closed'>Closed</option>
          </select>

          <input
            type='search'
            placeholder='Search subject or user'
            className='form-control form-control-sm'
            value={filters.search}
            onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
            onKeyDown={onKeyDownSearch}
          />
          <button className='btn btn-outline-primary btn-sm' onClick={load} disabled={loading}>
            {loading ? 'Loading...' : 'Apply'}
          </button>
        </div>
      </div>

      {error ? (
        <div className='alert alert-danger' role='alert'>{error}</div>
      ) : (
        <>
          {/* Desktop/tablet table */}
          <div className='table-responsive d-none d-md-block'>
            <table className='table align-middle'>
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>User</th>
                  <th>Status</th>
                  <th>Outcome</th>
                  <th>Updated</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan='6' className='text-center py-24'>No tickets found.</td>
                  </tr>
                ) : (
                  items.map((t) => (
                    <tr key={t.id}>
                      <td>{t.subject}</td>
                      <td>
                        {t.user ? (
                          <>
                            {t.user.firstName || t.user.lastName
                              ? `${t.user.firstName || ''} ${t.user.lastName || ''}`.trim()
                              : t.user.email}
                            <div className='small text-neutral-500'>{t.user.email}</div>
                          </>
                        ) : '—'}
                      </td>

                      <td><StatusChip value={t.status} /></td>
                      <td>
                        {t.status === 'closed' ? (
                          <span style={{ ...chipStyleBase, backgroundColor: t.resolutionOutcome === 'solved' ? '#ecfdf5' : '#fee2e2', color: t.resolutionOutcome === 'solved' ? '#047857' : '#b91c1c' }}>
                            {t.resolutionOutcome === 'solved' ? 'Solved' : 'Not Solved'}
                          </span>
                        ) : (
                          <span className='text-neutral-400'>—</span>
                        )}
                      </td>
                      <td>{formatDateTime(t.lastMessageAt || t.updatedAt)}</td>
                      <td>
                        <Link to={`/ticket/${t.id}`} className='btn btn-sm btn-outline-primary'>View</Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile-friendly stacked cards */}
          <div className='d-block d-md-none'>
            {items.length === 0 ? (
              <div className='alert alert-info mb-0'>No tickets found.</div>
            ) : (
              items.map((t) => (
                <div key={t.id} className='card p-16 mb-12'>
                  <div className='d-flex justify-content-between align-items-start gap-8'>
                    <div>
                      <div className='fw-semibold mb-6'>{t.subject}</div>
                      <div className='small text-neutral-500 mb-8'>
                        {t.user ? (
                          <>
                            {(t.user.firstName || t.user.lastName) ? `${t.user.firstName || ''} ${t.user.lastName || ''}`.trim() : t.user.email}
                            <div className='small text-neutral-500'>{t.user.email}</div>
                          </>
                        ) : '—'}
                      </div>
                      <div className='d-flex flex-wrap gap-6'>

                        <StatusChip value={t.status} />
                        {t.status === 'closed' ? (
                          <span style={{ ...chipStyleBase, backgroundColor: t.resolutionOutcome === 'solved' ? '#ecfdf5' : '#fee2e2', color: t.resolutionOutcome === 'solved' ? '#047857' : '#b91c1c' }}>
                            {t.resolutionOutcome === 'solved' ? 'Solved' : 'Not Solved'}
                          </span>
                        ) : null}
                        <span className='small text-neutral-500'>Updated {formatDateTime(t.lastMessageAt || t.updatedAt)}</span>
                      </div>
                    </div>
                    <div>
                      <Link to={`/ticket/${t.id}`} className='btn btn-sm btn-outline-primary'>View</Link>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default TicketsLayer;
