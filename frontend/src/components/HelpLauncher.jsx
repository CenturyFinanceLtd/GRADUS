import { useEffect, useRef, useState } from 'react';
import apiClient from '../services/apiClient';
import { useAuth } from '../context/AuthContext.jsx';
import { listMyTickets, getTicketDetails, createTicket, addTicketMessage } from '../services/ticketService.js';

const WELCOME_MESSAGE = {
  id: 'assistant-welcome',
  role: 'assistant',
  content:
    "Hi there! I'm GradusAI. Ask me anything about our programs, placements, mentors, or how to get started.",
};

const createMessageId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const MAX_PAGE_CONTEXT_LENGTH = 2800;

const collectPageContext = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return null;
  }
  const path = window.location?.pathname || '/';
  const url = window.location?.href || path;
  const title = document.title || '';
  const main = document.querySelector('main') || document.body;
  if (!main) return { path, url, title };
  const headingText = Array.from(main.querySelectorAll('h1, h2, h3'))
    .slice(0, 12)
    .map((el) => (el.textContent || '').trim())
    .filter(Boolean)
    .join(' | ')
    .slice(0, 320);
  const rawText = (main.innerText || main.textContent || '').replace(/\s+/g, ' ').trim();
  if (!rawText) return { path, url, title, headings: headingText || undefined };
  return { path, url, title, headings: headingText || undefined, content: rawText.slice(0, MAX_PAGE_CONTEXT_LENGTH) };
};

const extractLineSegments = (line) => {
  if (!line) return [];
  const markdownRegex = /\[([^\]]+)\]\s*\((https?:\/\/[^\s)]+)\)/g;
  const segments = [];
  let lastIndex = 0;
  let match;
  while ((match = markdownRegex.exec(line)) !== null) {
    if (match.index > lastIndex) segments.push({ type: 'text', value: line.slice(lastIndex, match.index) });
    segments.push({ type: 'link', value: match[2], label: match[1].trim() });
    lastIndex = markdownRegex.lastIndex;
  }
  if (lastIndex < line.length) segments.push({ type: 'text', value: line.slice(lastIndex) });
  const expanded = [];
  segments.forEach((segment) => {
    if (segment.type === 'link') { expanded.push(segment); return; }
    const text = segment.value;
    if (!text) return;
    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    let cursor = 0; let urlMatch;
    while ((urlMatch = urlRegex.exec(text)) !== null) {
      if (urlMatch.index > cursor) expanded.push({ type: 'text', value: text.slice(cursor, urlMatch.index) });
      const rawUrl = urlMatch[0];
      const trimmedUrl = rawUrl.replace(/[),.;!?]+$/g, '');
      expanded.push({ type: 'link', value: trimmedUrl, label: trimmedUrl });
      const trailing = rawUrl.slice(trimmedUrl.length);
      if (trailing) expanded.push({ type: 'text', value: trailing });
      cursor = urlRegex.lastIndex;
    }
    if (cursor < text.length) expanded.push({ type: 'text', value: text.slice(cursor) });
  });
  return expanded;
};

const HelpLauncher = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const { isAuthenticated, token } = useAuth();
  const [mode, setMode] = useState('ai'); // 'ai' | 'chooser' | 'support_list' | 'support_chat'
  // Support state
  const [supportLoading, setSupportLoading] = useState(false);
  const [supportError, setSupportError] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null); // { item, messages }
  const [supportInput, setSupportInput] = useState('');
  const [sendingSupport, setSendingSupport] = useState(false);
  const [creatingTicket, setCreatingTicket] = useState(false);
  const [newTicket, setNewTicket] = useState({ subject: '', category: 'general', priority: 'medium', description: '' });
  const statusLabel = (s) => (s || '').replace(/_/g, ' ');
  const statusClass = (s) => {
    switch (s) {
      case 'not_opened': return 'chip--neutral';
      case 'opened': return 'chip--info';
      case 'in_progress': return 'chip--primary';
      case 'pending_confirmation': return 'chip--warning';
      case 'closed': return 'chip--success';
      default: return 'chip--neutral';
    }
  };

  const renderLine = (line, keyBase) => {
    const segments = extractLineSegments(line);
    if (!segments.length) {
      return (
        <span key={`${keyBase}-empty`} className="chatbot-widget__line-spacer" aria-hidden="true">.</span>
      );
    }
    return segments.map((segment, index) => {
      if (segment.type === 'link') {
        return (
          <a key={`${keyBase}-${index}`} href={segment.value} target="_blank" rel="noopener noreferrer" className="chatbot-widget__link">{segment.label}</a>
        );
      }
      return <span key={`${keyBase}-${index}`}>{segment.value}</span>;
    });
  };

  useEffect(() => { if (isOpen && inputRef.current) inputRef.current.focus(); }, [isOpen]);
  useEffect(() => { if (isOpen && scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages, isOpen]);
  useEffect(() => {
    const handler = (e) => {
      const desired = e?.detail?.mode || 'ai';
      setIsOpen(true);
      if (desired === 'support') {
        if (isAuthenticated) {
          setMode('support_list');
          refreshTickets();
        } else {
          setMode('ai');
        }
      } else {
        setMode('ai');
      }
    };
    window.addEventListener('gradus:help-open', handler);
    return () => window.removeEventListener('gradus:help-open', handler);
  }, [isAuthenticated]);

  const sendMessage = async (rawText) => {
    const trimmed = typeof rawText === 'string' ? rawText.trim() : '';
    if (!trimmed || isLoading) return;
    const userMessage = { id: createMessageId(), role: 'user', content: trimmed };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    const historyPayload = [...messages, userMessage].slice(-6).map((i) => ({ role: i.role, content: i.content }));
    try {
      const pageContext = collectPageContext();
      const payload = { message: trimmed, history: historyPayload };
      if (pageContext) payload.page = pageContext;
      const data = await apiClient.post('/chatbot', payload);
      const reply = (data?.reply || '').trim() || 'I am having trouble finding that information right now. Please try again in a moment.';
      const assistantMessage = { id: createMessageId(), role: 'assistant', content: reply };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const assistantMessage = { id: createMessageId(), role: 'assistant', content: error?.message || 'Something went wrong. Please try again shortly.' };
      setMessages((prev) => [...prev, assistantMessage]);
    } finally { setIsLoading(false); }
  };

  const handleSubmit = async (e) => { e.preventDefault(); await sendMessage(inputValue); };
  const handleKeyDown = async (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); await sendMessage(inputValue); } };

  const toggleWidget = () => {
    setIsOpen((prev) => !prev);
    if (!isOpen) {
      if (isAuthenticated) {
        setMode('chooser'); // default to chooser when signed in
      } else {
        setMode('ai');
      }
    }
  };

  const formatDateTime = (value) => {
    try { return new Date(value).toLocaleString(); } catch { return value; }
  };

  // Load my tickets
  const refreshTickets = async () => {
    if (!token) return;
    setSupportLoading(true);
    setSupportError(null);
    try {
      const res = await listMyTickets({ token });
      setTickets(res?.items || []);
    } catch (err) {
      setSupportError(err?.message || 'Failed to load tickets');
      setTickets([]);
    } finally {
      setSupportLoading(false);
    }
  };

  // Open a ticket in chat mode
  const openTicket = async (id) => {
    if (!token) return;
    setSupportLoading(true);
    setSupportError(null);
    try {
      const res = await getTicketDetails({ token, id });
      setSelectedTicket({ item: res.item, messages: res.messages || [] });
      setMode('support_chat');
      setTimeout(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, 50);
    } catch (err) {
      setSupportError(err?.message || 'Failed to open ticket');
    } finally {
      setSupportLoading(false);
    }
  };

  const sendSupportMessage = async () => {
    const trimmed = (supportInput || '').trim();
    if (!trimmed || !selectedTicket || sendingSupport) return;
    setSendingSupport(true);
    try {
      const res = await addTicketMessage({ token, id: selectedTicket.item.id, body: trimmed });
      setSelectedTicket((prev) => ({
        item: { ...prev.item, status: prev.item.status === 'pending_confirmation' ? prev.item.status : 'in_progress', lastMessageAt: new Date().toISOString(), messageCount: (prev.item.messageCount || 0) + 1 },
        messages: [...prev.messages, res.item],
      }));
      setSupportInput('');
      setTimeout(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, 30);
    } catch (err) {
      setSupportError(err?.message || 'Failed to send message');
    } finally {
      setSendingSupport(false);
    }
  };

  const createSupportTicket = async (e) => {
    e?.preventDefault?.();
    if (!newTicket.subject.trim() || !newTicket.description.trim() || creatingTicket) return;
    setCreatingTicket(true);
    setSupportError(null);
    try {
      const res = await createTicket({ token, ...newTicket });
      await refreshTickets();
      await openTicket(res?.item?.id);
      setNewTicket({ subject: '', category: 'general', priority: 'medium', description: '' });
    } catch (err) {
      setSupportError(err?.message || 'Failed to create ticket');
    } finally {
      setCreatingTicket(false);
    }
  };

  return (
    <div className={`chatbot-widget ${isOpen ? 'chatbot-widget--open' : ''}`}>
      {isOpen && (
        <div className="chatbot-widget__panel">
          <div className="chatbot-widget__header">
            <div>
              <p className="chatbot-widget__title">GradusAI</p>
              <p className="chatbot-widget__subtitle">AI help and customer support</p>
            </div>
            <button type="button" className="chatbot-widget__close" onClick={toggleWidget} aria-label="Close">
              <i className="ph-bold ph-x" />
            </button>
          </div>
          {mode === 'chooser' ? (
            <div className='p-16'>
              <div className='vstack gap-12'>
                <p className='mb-8'>What would you like to open?</p>
                <button type='button' className='help-btn help-btn--primary w-100' onClick={async () => { setMode('support_list'); await refreshTickets(); }}>Customer Support</button>
                <button type='button' className='help-btn help-btn--ghost w-100' onClick={() => setMode('ai')}>Ask GradusAI Chatbot</button>
              </div>
            </div>
          ) : mode === 'support_list' ? (
            <div className='p-16'>
              <div className='d-flex justify-content-between align-items-center mb-12'>
                <h6 className='help-page-title mb-0'>Customer Support</h6>
                <div className='help-toolbar d-flex gap-8'>
                  <button
                    type='button'
                    className='help-btn help-btn--ghost help-btn--sm'
                    onClick={() => setMode('chooser')}
                    aria-label='Back to choose between AI and Support'
                  >
                    <i className='ph ph-arrow-left' /> <span className='btn-label'>Back</span>
                  </button>
                  <button
                    type='button'
                    className='help-btn help-btn--ghost help-btn--sm'
                    onClick={refreshTickets}
                    disabled={supportLoading}
                    aria-label='Refresh tickets'
                  >
                    <i className='ph ph-arrows-clockwise' /> <span className='btn-label'>{supportLoading ? 'Refreshing…' : 'Refresh'}</span>
                  </button>
                </div>
              </div>
              {supportError ? <div className='alert alert-danger mb-12'>{supportError}</div> : null}
              <div className='mb-12 help-card p-12'>
                <h6 className='help-section-title mb-8 d-flex align-items-center gap-8'>
                  <i className='ph ph-plus-circle'></i>
                  Create New Ticket
                </h6>
                <form className='vstack gap-8' onSubmit={createSupportTicket}>
                  <input className='form-control form-control-sm help-input' placeholder='Subject (short summary)' value={newTicket.subject} onChange={(e) => setNewTicket((p) => ({ ...p, subject: e.target.value }))} required />
                  <div className='help-form-row'>
                    <select className='form-select form-select-sm help-input' value={newTicket.category} onChange={(e) => setNewTicket((p) => ({ ...p, category: e.target.value }))}>
                      <option value='general'>General</option>
                      <option value='billing'>Billing</option>
                      <option value='technical'>Technical</option>
                      <option value='course'>Course</option>
                      <option value='account'>Account</option>
                      <option value='other'>Other</option>
                    </select>
                    <select className='form-select form-select-sm help-input' value={newTicket.priority} onChange={(e) => setNewTicket((p) => ({ ...p, priority: e.target.value }))}>
                      <option value='low'>Low</option>
                      <option value='medium'>Medium</option>
                      <option value='high'>High</option>
                      <option value='urgent'>Urgent</option>
                    </select>
                  </div>
                  <textarea className='form-control form-control-sm help-input' rows='3' placeholder='Describe your issue with details or steps to reproduce' value={newTicket.description} onChange={(e) => setNewTicket((p) => ({ ...p, description: e.target.value }))} required />
                  <div>
                    <button type='submit' className='help-btn help-btn--primary help-btn--block' disabled={creatingTicket}>{creatingTicket ? 'Submitting…' : 'Submit Ticket'}</button>
                  </div>
                </form>
              </div>
              <div>
                <h6 className='mb-8'>My Tickets</h6>
                <div className='chatbot-widget__messages' style={{ maxHeight: '220px', overflow: 'auto' }}>
                  <ul className='list-unstyled mb-0'>
                    {supportLoading && tickets.length === 0 ? (
                      <>
                        {[...Array(3)].map((_, i) => (
                          <li key={`skeleton-${i}`} className='mb-8'>
                            <div className='support-item support-item--skeleton'>
                              <div className='support-item__title skeleton-bar' />
                              <div className='d-flex gap-6 mt-6'>
                                <span className='skeleton-pill' />
                                <span className='skeleton-pill' />
                              </div>
                            </div>
                          </li>
                        ))}
                      </>
                    ) : tickets.length === 0 ? (
                      <li className='text-center text-neutral-600'>No tickets yet.</li>
                    ) : (
                      tickets.map((t) => (
                        <li key={t.id} className='mb-8'>
                          <button type='button' className='support-item w-100 text-start' onClick={() => openTicket(t.id)}>
                            <div className='support-item__row'>
                              <div className='support-item__icon'><i className='ph ph-ticket' /></div>
                              <div className='support-item__body'>
                                <div className='support-item__title'>{t.subject}</div>
                                <div className='support-item__meta'>
                                  <span className={`chip ${statusClass(t.status)}`}>{statusLabel(t.status)}</span>
                                  <span className='chip chip--muted text-capitalize'>{t.category}</span>
                                  <span className='chip chip--muted text-capitalize'>{t.priority}</span>
                                  <span className='support-item__time'>Updated {formatDateTime(t.lastMessageAt || t.updatedAt)}</span>
                                </div>
                              </div>
                              <div className='support-item__chevron'><i className='ph ph-caret-right' /></div>
                            </div>
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              </div>
            </div>
          ) : mode === 'support_chat' ? (
            <>
              <div className='p-16 pb-0'>
                <div className='d-flex align-items-start gap-8'>
                  <button
                    type='button'
                    className='help-icon-btn'
                    onClick={() => { setMode('support_list'); setSelectedTicket(null); }}
                    aria-label='Back to ticket list'
                  >
                    <i className='ph ph-arrow-left' />
                  </button>
                  <div className='flex-grow-1'>
                    <h6 className='mb-4'>{selectedTicket?.item?.subject}</h6>
                    <div className='d-flex flex-wrap gap-6'>
                      <span className={`chip ${statusClass(selectedTicket?.item?.status)}`}>{statusLabel(selectedTicket?.item?.status)}</span>
                      <span className='chip chip--muted text-capitalize'>{selectedTicket?.item?.category}</span>
                      <span className='chip chip--muted text-capitalize'>{selectedTicket?.item?.priority}</span>
                    </div>
                  </div>
                </div>
                {selectedTicket?.item?.status === 'pending_confirmation' && (
                  <div className='alert alert-warning mt-12'>Support requested an OTP confirmation sent to your registered email. Share the OTP with the executive to close the ticket.</div>
                )}
                {selectedTicket?.item?.status === 'closed' && (
                  <div className='alert alert-info mt-12'>This ticket is closed. Outcome: {selectedTicket?.item?.resolutionOutcome || 'unknown'}</div>
                )}
              </div>
              <div className='chatbot-widget__messages' ref={scrollRef}>
                {(selectedTicket?.messages || []).map((m) => (
                  <div key={m.id} className={`chatbot-widget__message chatbot-widget__message--${m.authorType === 'user' ? 'user' : 'assistant'}`}>
                    <div className='chatbot-widget__bubble'>
                      <div className='chat-meta'>{m.authorType === 'user' ? 'You' : 'Support'} • {formatDateTime(m.createdAt)}</div>
                      <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{m.body}</p>
                    </div>
                  </div>
                ))}
              </div>
              {selectedTicket?.item?.status === 'closed' ? null : (
                <form className='chatbot-widget__form' onSubmit={(e) => { e.preventDefault(); sendSupportMessage(); }}>
                  <textarea
                    value={supportInput}
                    onChange={(e) => setSupportInput(e.target.value)}
                    placeholder='Write a message to support…'
                    rows='2'
                    className='chatbot-widget__input'
                    disabled={sendingSupport || selectedTicket?.item?.status === 'pending_confirmation'}
                  />
                  <div className='chatbot-widget__actions'>
                    <button type='submit' className='chatbot-widget__send' disabled={sendingSupport || !supportInput.trim() || selectedTicket?.item?.status === 'pending_confirmation'}>
                      <span>Send</span>
                      <i className='ph-bold ph-paper-plane-tilt' />
                    </button>
                  </div>
                </form>
              )}
            </>
          ) : (
            <>
              <div className="chatbot-widget__messages" ref={scrollRef}>
                {messages.map((message) => (
                  <div key={message.id} className={`chatbot-widget__message chatbot-widget__message--${message.role}`}>
                    <div className="chatbot-widget__bubble">
                      {message.content.split(/\n+/).map((line, index) => (
                        <p key={`${message.id}-${index}`}>{renderLine(line, `${message.id}-${index}`)}</p>
                      ))}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="chatbot-widget__message chatbot-widget__message--assistant">
                    <div className="chatbot-widget__bubble chatbot-widget__bubble--typing">
                      <span className="chatbot-widget__typing-dot" />
                      <span className="chatbot-widget__typing-dot" />
                      <span className="chatbot-widget__typing-dot" />
                    </div>
                  </div>
                )}
              </div>
              <form className="chatbot-widget__form" onSubmit={handleSubmit}>
                <textarea
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder='Ask about admissions, internships, mentors, or anything else'
                  rows={2}
                  className='chatbot-widget__input'
                  disabled={isLoading}
                />
                <div className='chatbot-widget__actions'>
                  <button type='submit' className='chatbot-widget__send' disabled={isLoading || !inputValue.trim()}>
                    <span>Send</span>
                    <i className='ph-bold ph-paper-plane-tilt' />
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      )}
      <button type='button' className='chatbot-widget__toggle chatbot-widget__toggle--left' onClick={toggleWidget} aria-pressed={isOpen} aria-label='Open help'>
        <i className='ph-bold ph-chat-circle-dots' />
      </button>
    </div>
  );
};

export default HelpLauncher;
