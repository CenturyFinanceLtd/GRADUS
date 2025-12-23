import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import useAuth from '../hook/useAuth';
import { getTicketDetails, replyToTicket, updateTicket, requestClosure, confirmClosure, requestAssignment, acceptAssignment, declineAssignment } from '../services/adminTickets';
import { fetchAdminUsers } from '../services/adminUsers';

const TicketDetailsLayer = () => {
  const { token, admin } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();

  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);
  const [savingMeta, setSavingMeta] = useState(false);
  const [closureState, setClosureState] = useState({ otp: '', solved: 'true' });
  const [assignPanelOpen, setAssignPanelOpen] = useState(false);
  const [adminSearch, setAdminSearch] = useState('');
  const [adminList, setAdminList] = useState([]);
  const [assignTarget, setAssignTarget] = useState('');

  const bottomRef = useRef(null);
  const scrollToBottom = () => bottomRef.current?.scrollIntoView({ behavior: 'smooth' });

  const load = useCallback(async (silent = false) => {
    if (!token) return;
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await getTicketDetails({ token, id });
      setTicket(res?.item || null);
      if (res?.messages) {
        setMessages(prev => {
          if (prev.length !== res.messages.length) {
            // Auto scroll only on new content
            setTimeout(scrollToBottom, 50);
            return res.messages;
          }
          return prev;
        });
      }
    } catch (err) {
      if (!silent) setError(err?.message || 'Failed to load ticket');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [token, id]);

  useEffect(() => {
    load();
    const interval = setInterval(() => load(true), 5000);
    return () => clearInterval(interval);
  }, [load]);

  const loadAdmins = async () => {
    try {
      const res = await fetchAdminUsers(token, { search: adminSearch });
      const items = Array.isArray(res?.items) ? res.items : (Array.isArray(res?.users) ? res.users : []);
      setAdminList(items);
    } catch {
      setAdminList([]);
    }
  };

  useEffect(() => {
    if (assignPanelOpen) {
      loadAdmins();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignPanelOpen]);

  const send = async (e) => {
    e.preventDefault();
    if (!draft.trim()) return;
    setSending(true);
    setActionMessage(null);
    try {
      const res = await replyToTicket({ token, id, body: draft });
      setMessages((prev) => [...prev, res.item]);
      setDraft('');
      setTimeout(scrollToBottom, 50);
    } catch (err) {
      setActionMessage({ type: 'error', text: err?.message || 'Failed to send reply' });
    } finally {
      setSending(false);
    }
  };

  const handleMetaChange = async (field, value) => {
    setSavingMeta(true);
    setActionMessage(null);
    try {
      const res = await updateTicket({ token, id, data: { [field]: value } });
      setTicket((prev) => ({ ...prev, ...res.item }));
      setActionMessage({ type: 'success', text: 'Updated successfully.' });
    } catch (err) {
      setActionMessage({ type: 'error', text: err?.message || 'Update failed.' });
    } finally {
      setSavingMeta(false);
    }
  };

  const handleRequestAssignment = async () => {
    if (!assignTarget) return;
    setSavingMeta(true);
    setActionMessage(null);
    try {
      await requestAssignment({ token, id, toAdminId: assignTarget });
      await load();
      setAssignPanelOpen(false);
      setAssignTarget('');
      setActionMessage({ type: 'success', text: 'Assignment transfer requested.' });
    } catch (err) {
      setActionMessage({ type: 'error', text: err?.message || 'Failed to request assignment.' });
    } finally {
      setSavingMeta(false);
    }
  };

  const handleAccept = async () => {
    try {
      await acceptAssignment({ token, id });
      await load();
      setActionMessage({ type: 'success', text: 'Assignment accepted.' });
    } catch (err) {
      setActionMessage({ type: 'error', text: err?.message || 'Failed to accept assignment.' });
    }
  };

  const handleDecline = async () => {
    try {
      await declineAssignment({ token, id });
      await load();
      setActionMessage({ type: 'success', text: 'Assignment declined.' });
    } catch (err) {
      setActionMessage({ type: 'error', text: err?.message || 'Failed to decline assignment.' });
    }
  };

  const handleRequestClosure = async () => {
    setActionMessage(null);
    try {
      await requestClosure({ token, id });
      await load();
      setActionMessage({ type: 'success', text: 'OTP sent to user email for confirmation.' });
    } catch (err) {
      setActionMessage({ type: 'error', text: err?.message || 'Failed to request closure.' });
    }
  };

  const handleConfirmClosure = async () => {
    setActionMessage(null);
    try {
      await confirmClosure({ token, id, otp: closureState.otp, solved: closureState.solved === 'true' });
      await load();
      setClosureState({ otp: '', solved: 'true' });
      setActionMessage({ type: 'success', text: 'Ticket closed successfully.' });
    } catch (err) {
      setActionMessage({ type: 'error', text: err?.message || 'Failed to close ticket.' });
    }
  };

  const formatDateTime = (value) => {
    try { return new Date(value).toLocaleString(); } catch { return value; }
  };

  if (loading) return <div className='card p-24'><div className='text-center py-64'>Loading...</div></div>;
  if (error) return <div className='card p-24'><div className='alert alert-danger'>{error}</div></div>;
  if (!ticket) return null;
  const myId = admin?._id || admin?.id;
  const isMine = Boolean(ticket.assignedTo && ticket.assignedTo === myId);

  return (
    <div className='card p-24'>
      <div className='d-flex justify-content-between align-items-center mb-16'>
        <div>
          <h5 className='mb-8'>{ticket.subject}</h5>
          <div className='text-neutral-500'>
            <span className='text-capitalize'>{ticket.category}</span> •
            <span className='text-capitalize'> {ticket.priority}</span> •
            <span className='text-capitalize'> {ticket.status.replace(/_/g, ' ')}</span>
          </div>
          {ticket.user ? (
            <div className='small mt-4'>
              <strong>User:</strong> {ticket.user.firstName || ticket.user.lastName ? `${ticket.user.firstName || ''} ${ticket.user.lastName || ''}`.trim() : ticket.user.email} — {ticket.user.email}
            </div>
          ) : null}
        </div>
        <div className='d-flex gap-8'>
          <button className='btn btn-outline-secondary' onClick={() => navigate('/tickets')}>Back</button>
        </div>
      </div>

      {actionMessage ? (
        <div className={`alert alert-${actionMessage.type === 'success' ? 'success' : 'danger'} mb-16`}>{actionMessage.text}</div>
      ) : null}

      <div className='d-flex gap-16 mb-16 flex-wrap'>
        <div>
          <label className='small mb-4 d-block'>Status</label>
          <select
            className='form-select form-select-sm'
            value={ticket.status}
            onChange={(e) => handleMetaChange('status', e.target.value)}
            disabled={savingMeta}
          >
            <option value='open'>Open</option>
            <option value='in_progress'>In Progress</option>
            <option value='on_hold'>On Hold</option>
            <option value='resolved'>Resolved</option>
            <option value='closed'>Closed</option>
          </select>
        </div>
        <div>
          <label className='small mb-4 d-block'>Priority</label>
          <select
            className='form-select form-select-sm'
            value={ticket.priority}
            onChange={(e) => handleMetaChange('priority', e.target.value)}
            disabled={savingMeta}
          >
            <option value='low'>Low</option>
            <option value='medium'>Medium</option>
            <option value='high'>High</option>
            <option value='urgent'>Urgent</option>
          </select>
        </div>
        <div>
          <label className='small mb-4 d-block'>Category</label>
          <select
            className='form-select form-select-sm'
            value={ticket.category}
            onChange={(e) => handleMetaChange('category', e.target.value)}
            disabled={savingMeta}
          >
            <option value='general'>General</option>
            <option value='billing'>Billing</option>
            <option value='technical'>Technical</option>
            <option value='course'>Course</option>
            <option value='account'>Account</option>
            <option value='other'>Other</option>
          </select>
        </div>
      </div>

      <div className='row'>
        <div className='col-lg-8'>
          <div className='card p-16 mb-16' style={{ maxHeight: '50vh', overflowY: 'auto' }}>
            <ul className='list-unstyled mb-0'>
              {messages.map((m) => (
                <li key={m.id} className={`mb-12 ${m.authorType === 'user' ? '' : 'text-end'}`}>
                  <div className={`d-inline-block p-12 radius-8 ${m.authorType === 'user' ? 'bg-main-25' : 'bg-neutral-100'}`}>
                    <div className='small text-neutral-600 mb-4'>
                      {m.authorType === 'user' ? 'User' : 'You'} • {formatDateTime(m.createdAt)}
                    </div>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{m.body}</div>
                  </div>
                </li>
              ))}
              <div ref={bottomRef} />
            </ul>
          </div>
          {ticket.status === 'closed' ? (
            <div className='card p-16'>
              <div className='alert alert-success mb-0'>This ticket is closed. Replies are disabled.</div>
            </div>
          ) : isMine ? (
            <form onSubmit={send} className='card p-16 vstack gap-12'>
              <textarea
                className='form-control border-neutral-30 radius-8'
                rows={4}
                placeholder='Write a reply...'
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                required
              />
              <div className='text-end'>
                <button type='submit' className='btn btn-primary' disabled={sending}>
                  {sending ? 'Sending...' : 'Send Reply'}
                </button>
              </div>
            </form>
          ) : (
            <div className='card p-16'>
              <div className='alert alert-info mb-12'>Only the assigned admin can reply to this ticket.</div>
              <button type='button' className='btn btn-sm btn-outline-primary' onClick={() => handleMetaChange('assignedTo', myId)} disabled={savingMeta}>
                Assign to me
              </button>
            </div>
          )}
        </div>
        <div className='col-lg-4'>
          <div className='card p-16'>
            <h6 className='mb-12'>Assignee</h6>
            <div className='d-flex gap-8'>
              {ticket.assignedTo ? (
                isMine ? (
                  <>
                    <button
                      type='button'
                      className='btn btn-sm btn-outline-secondary'
                      onClick={() => handleMetaChange('assignedTo', null)}
                      disabled={savingMeta}
                    >
                      Unassign
                    </button>
                    <button
                      type='button'
                      className='btn btn-sm btn-outline-info'
                      onClick={() => setAssignPanelOpen((p) => !p)}
                    >
                      Assign to other…
                    </button>
                  </>
                ) : (
                  <>
                    {/* Someone else owns it: hide Assign to me; cannot transfer unless owner */}
                    <span className='small text-neutral-500'>Owned by {ticket.assignee?.name || ticket.assignee?.email}. Ask owner to transfer.</span>
                  </>
                )
              ) : (
                <>
                  <button
                    type='button'
                    className='btn btn-sm btn-outline-primary'
                    onClick={() => handleMetaChange('assignedTo', myId)}
                    disabled={savingMeta}
                  >
                    Assign to me
                  </button>
                  <button
                    type='button'
                    className='btn btn-sm btn-outline-info'
                    onClick={() => setAssignPanelOpen((p) => !p)}
                  >
                    Assign to other…
                  </button>
                </>
              )}
            </div>
            <div className='small mt-12'>
              Current: {ticket.assignee ? `${ticket.assignee.name || ticket.assignee.email} (${ticket.assignee.email})` : 'Unassigned'}
            </div>
            {ticket.assignment?.transfer ? (
              <div className='alert alert-warning mt-12'>
                {ticket.assignment.transfer.to && ticket.assignment.transfer.to.id === (admin?._id || admin?.id)
                  ? (
                    <>
                      Transfer requested to you by {ticket.assignment.transfer.from?.name || ticket.assignment.transfer.from?.email}.<br />
                      <div className='d-flex gap-8 mt-8'>
                        <button type='button' className='btn btn-sm btn-success' onClick={handleAccept}>Accept</button>
                        <button type='button' className='btn btn-sm btn-outline-danger' onClick={handleDecline}>Decline</button>
                      </div>
                    </>
                  )
                  : (
                    <>
                      Awaiting acceptance by {ticket.assignment.transfer.to?.name || ticket.assignment.transfer.to?.email}
                    </>
                  )}
              </div>
            ) : null}
            {assignPanelOpen ? (
              <div className='mt-12'>
                <div className='d-flex gap-8 mb-8'>
                  <input
                    type='search'
                    className='form-control form-control-sm'
                    placeholder='Search admin user'
                    value={adminSearch}
                    onChange={(e) => setAdminSearch(e.target.value)}
                  />
                  <button type='button' className='btn btn-sm btn-outline-primary' onClick={loadAdmins}>Search</button>
                </div>
                <select
                  className='form-select form-select-sm'
                  value={assignTarget}
                  onChange={(e) => setAssignTarget(e.target.value)}
                >
                  <option value=''>Select admin</option>
                  {adminList.map((u) => (
                    <option key={u.id || u._id} value={u.id || u._id}>
                      {(u.fullName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email)} — {u.email}
                    </option>
                  ))}
                </select>
                <div className='text-end mt-8'>
                  <button type='button' className='btn btn-sm btn-primary' onClick={handleRequestAssignment} disabled={!assignTarget || savingMeta}>
                    Send request
                  </button>
                </div>
              </div>
            ) : null}
          </div>
          <div className='card p-16 mt-16'>
            <h6 className='mb-12'>Close Ticket (OTP)</h6>
            {ticket.status !== 'closed' && (
              <>
                <div className='d-flex gap-8 mb-12'>
                  <button type='button' className='btn btn-sm btn-outline-primary' onClick={handleRequestClosure} disabled={savingMeta || ticket.status === 'pending_confirmation' || !isMine}>
                    Send OTP to user
                  </button>
                </div>
                <div className='vstack gap-8'>
                  <input
                    type='text'
                    className='form-control form-control-sm'
                    placeholder='Enter OTP from user'
                    value={closureState.otp}
                    onChange={(e) => setClosureState((p) => ({ ...p, otp: e.target.value }))}
                  />
                  <select
                    className='form-select form-select-sm'
                    value={closureState.solved}
                    onChange={(e) => setClosureState((p) => ({ ...p, solved: e.target.value }))}
                  >
                    <option value='true'>Problem Solved (Yes)</option>
                    <option value='false'>Not Solved (No)</option>
                  </select>
                  <button type='button' className='btn btn-sm btn-danger' onClick={handleConfirmClosure} disabled={!closureState.otp.trim() || !isMine}>
                    Confirm and Close
                  </button>
                  {ticket.status === 'pending_confirmation' && (
                    <div className='small text-warning mt-8'>Waiting for OTP confirmation…</div>
                  )}
                  {!isMine && (
                    <div className='small text-neutral-500'>Only the assigned admin can send or confirm OTP.</div>
                  )}
                </div>
              </>
            )}
            {ticket.status === 'closed' && (
              <div className='alert alert-success mb-0'>Closed — Outcome: {ticket.resolutionOutcome}</div>
            )}
          </div>
          {Array.isArray(ticket.assignment?.history) && ticket.assignment.history.length > 0 ? (
            <div className='card p-16 mt-16'>
              <h6 className='mb-12'>Assignment History</h6>
              <ul className='list-unstyled mb-0'>
                {ticket.assignment.history.map((h, idx) => (
                  <li key={idx} className='mb-6 small'>
                    <strong>{h.user?.name || h.user?.email || h.user?.id || 'Unknown'}</strong> • {h.action.replace(/_/g, ' ')} • {formatDateTime(h.at)}
                    {h.by ? <> by {h.by?.name || h.by?.email}</> : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default TicketDetailsLayer;
