import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import notificationService from "../services/notificationService";

const NotificationBell = () => {
  const { token, isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [list, count] = await Promise.all([
        notificationService.fetchNotifications({ token }),
        notificationService.fetchUnreadCount({ token }),
      ]);
      setItems(list || []);
      setUnread(count || 0);
    } catch (e) {
      console.warn("Failed to load notifications", e);
    } finally {
      setLoading(false);
    }
  };

  const markAll = async () => {
    if (!token) return;
    try {
      await notificationService.markAllRead({ token });
      setUnread(0);
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (e) {
      console.warn("Failed to mark all read", e);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    load();
    const onClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, token]);

  if (!isAuthenticated) return null;

  return (
    <div className='notification-bell' ref={dropdownRef}>
      <button
        className='btn btn-icon'
        aria-label='Notifications'
        onClick={() => {
          setOpen((v) => !v);
          if (!open) load();
        }}
      >
        <i className='ph-bold ph-bell' />
        {unread > 0 && <span className='notification-badge'>{unread}</span>}
      </button>
      {open && (
        <div className='notification-dropdown'>
          <div className='notification-header'>
            <span>Notifications</span>
            <button className='btn-link text-sm' onClick={markAll} disabled={loading || unread === 0}>
              Mark all read
            </button>
          </div>
          <div className='notification-list'>
            {items.length === 0 && <div className='notification-empty'>No notifications yet.</div>}
            {items.map((item) => (
              <div
                key={item._id || item.id}
                className={`notification-item ${item.read ? "" : "unread"}`}
                onClick={() => markSingle(item._id || item.id)}
              >
                <div className='title'>{item.title}</div>
                <div className='body'>{item.body}</div>
                <div className='meta'>{item.createdAt ? new Date(item.createdAt).toLocaleString() : ""}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
  const markSingle = async (id) => {
    if (!token) return;
    try {
      await notificationService.markRead({ id, token });
      setItems((prev) => prev.map((n) => (n._id === id || n.id === id ? { ...n, read: true } : n)));
      setUnread((prev) => Math.max(0, prev - 1));
    } catch (e) {
      console.warn("Failed to mark read", e);
    }
  };
