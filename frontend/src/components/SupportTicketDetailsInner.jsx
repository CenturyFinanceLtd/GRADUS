import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { addTicketMessage, closeTicket, getTicketDetails } from '../services/ticketService.js';

const SupportTicketDetailsInner = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  const bottomRef = useRef(null);

  const scrollToBottom = () => {
    try {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    } catch {
      // ignore scroll errors
    }
  };

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getTicketDetails({ token, id });
      setTicket(res?.item || null);
      setMessages(res?.messages || []);
      setTimeout(scrollToBottom, 50);
    } catch (err) {
      setError(err?.message || 'Failed to load ticket');
    } finally {
      setLoading(false);
    }
  }, [token, id]);

  useEffect(() => {
    load();
  }, [load]);

  const send = async (e) => {
    e.preventDefault();
    if (!draft.trim()) return;
    setSending(true);
    setActionMessage(null);
    try {
      const res = await addTicketMessage({ token, id, body: draft });
      setMessages((prev) => [...prev, res.item]);
      setDraft('');
      setTimeout(scrollToBottom, 50);
    } catch (err) {
      setActionMessage({ type: 'error', text: err?.message || 'Failed to send message' });
    } finally {
      setSending(false);
    }
  };

  const handleClose = async () => {
    try {
      await closeTicket({ token, id });
      await load();
      setActionMessage({ type: 'success', text: 'Ticket closed.' });
    } catch (err) {
      setActionMessage({ type: 'error', text: err?.message || 'Failed to close ticket' });
    }
  };

  const formatDateTime = (value) => {
    try {
      return new Date(value).toLocaleString();
    } catch {
      return value;
    }
  };

  if (loading) return (
    <section className='section-space-sm-top section-space-sm-bottom'><div className='container'><div className='text-center py-64'>Loading...</div></div></section>
  );
  if (error) return (
    <section className='section-space-sm-top section-space-sm-bottom'><div className='container'><div className='alert alert-danger'>{error}</div></div></section>
  );
  if (!ticket) return null;

  return (
    <section className='section-space-sm-top section-space-sm-bottom'>
      <div className='container'>
        <div className='d-flex justify-content-between align-items-center mb-16'>
          <div>
            <h5 className='mb-8'>{ticket.subject}</h5>
            <p className='text-neutral-500 mb-0'>
              <span className='text-capitalize'>{ticket.category}</span> •
              <span className='text-capitalize'> {ticket.priority}</span> •
              <span className='text-capitalize'> {ticket.status.replace(/_/g, ' ')}</span>
            </p>
          </div>
          <div className='d-flex gap-12'>
            <button type='button' className='btn btn-outline-secondary' onClick={() => navigate('/support')}>Back</button>
            {ticket.status !== 'closed' && (
              <button type='button' className='btn btn-outline-danger' onClick={handleClose}>Close Ticket</button>
            )}
          </div>
        </div>

        {actionMessage ? (
          <div className={`alert alert-${actionMessage.type === 'success' ? 'success' : 'danger'} mb-16`}>
            {actionMessage.text}
          </div>
        ) : null}

        <div className='card p-0 mb-16'>
          <div className='support-chat__scroll' style={{ maxHeight: '50vh', overflowY: 'auto', padding: '16px' }}>
            <ul className='list-unstyled mb-0'>
              {messages.map((m) => (
                <li key={m.id} className={`mb-12 ${m.authorType === 'user' ? 'support-chat__row--user' : 'support-chat__row--agent'}`}>
                  <div className={`support-chat__bubble ${m.authorType === 'user' ? 'support-chat__bubble--user' : 'support-chat__bubble--agent'}`}>
                    <div className='support-chat__meta'>
                      {m.authorType === 'user' ? 'You' : 'Support'} • {formatDateTime(m.createdAt)}
                    </div>
                    <div className='support-chat__text'>{m.body}</div>
                  </div>
                </li>
              ))}
              <div ref={bottomRef} />
            </ul>
          </div>
        </div>

        {ticket.status === 'closed' ? (
          <div className='alert alert-info mb-0'>This ticket is closed. You can open a new ticket if you need further help.</div>
        ) : ticket.status === 'pending_confirmation' ? (
          <div className='alert alert-warning mb-0'>Support requested an OTP confirmation sent to your registered email. Please share the OTP with the executive to close the ticket.</div>
        ) : (
          <form onSubmit={send} className='card p-16 vstack gap-12'>
            <textarea
              className='form-control border-neutral-30 radius-8'
              rows={4}
              placeholder='Write a message...'
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              required
            />
            <div className='text-end'>
              <button type='submit' className='btn btn-primary' disabled={sending}>
                {sending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
};

export default SupportTicketDetailsInner;
