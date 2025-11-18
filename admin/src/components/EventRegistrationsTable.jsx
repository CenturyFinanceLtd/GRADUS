import { useEffect, useMemo, useState } from "react";
import useAuth from "../hook/useAuth";
import {
  fetchEventRegistrations,
  createEventRegistrationAdmin,
  updateEventRegistration,
  deleteEventRegistration,
  sendEventRegistrationJoinLinks,
} from "../services/adminInquiries";

const formatDateTime = (value) => {
  if (!value) {
    return "—";
  }

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
};

const extractStateFromMessage = (message) => {
  if (!message) return "";
  const match = message.match(/state:\s*([^|]+)/i);
  return match ? match[1].trim() : "";
};

const stripStateFromMessage = (message) => {
  if (!message) return "";
  return message.replace(/\|\s*state:\s*[^|]+/gi, "").trim();
};

const STATE_OPTIONS = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

const QUALIFICATION_OPTIONS = ["UG Pursuing", "UG Completed", "PG Pursuing", "PG Completed"];

const EMPTY_FORM = {
  id: null,
  name: "",
  email: "",
  phone: "",
  state: "",
  qualification: "",
  course: "",
  message: "",
};

const EventRegistrationsTable = () => {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [actionMessage, setActionMessage] = useState(null);
  const [pendingActionId, setPendingActionId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [joinLink, setJoinLink] = useState("");
  const [sendingLinks, setSendingLinks] = useState(false);
  const [editorState, setEditorState] = useState({
    open: false,
    mode: "create",
    submitting: false,
    form: { ...EMPTY_FORM },
    error: null,
  });

  useEffect(() => {
    let isActive = true;

    const load = async () => {
      if (!token) {
        setItems([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetchEventRegistrations({
          token,
        });

        if (isActive) {
          const nextItems = response?.items || [];
          setItems(nextItems);
          setSelectedIds((prev) => prev.filter((id) => nextItems.some((item) => item.id === id)));
        }
      } catch (err) {
        if (isActive) {
          setError(err?.message || "Failed to load event registrations");
          setItems([]);
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      isActive = false;
    };
  }, [token, reloadKey]);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return items;
    }

    return items.filter((item) => {
      const fields = [
        item.name,
        item.email,
        item.phone,
        item.state,
        item.qualification,
        item.course,
        item.message,
      ];

      return fields.some((field) =>
        typeof field === "string" ? field.toLowerCase().includes(term) : false
      );
    });
  }, [items, search]);

  const openCreateEditor = () => {
    setEditorState({
      open: true,
      mode: "create",
      submitting: false,
      form: { ...EMPTY_FORM },
      error: null,
    });
  };

  const openEditEditor = (item) => {
    setEditorState({
      open: true,
      mode: "edit",
      submitting: false,
      form: {
        id: item.id,
        name: item.name || "",
        email: item.email || "",
        phone: item.phone || "",
        state: item.state || "",
        qualification: item.qualification || "",
        course: item.course || "",
        message: stripStateFromMessage(item.message) || "",
      },
      error: null,
    });
  };

  const closeEditor = () => {
    setEditorState({
      open: false,
      mode: "create",
      submitting: false,
      form: { ...EMPTY_FORM },
      error: null,
    });
  };

  const handleEditorFieldChange = (field, value) => {
    setEditorState((previous) => ({
      ...previous,
      form: {
        ...previous.form,
        [field]: value,
      },
    }));
  };

  const handleEditorSubmit = async (event) => {
    event.preventDefault();
    if (!token) {
      return;
    }

    const { form, mode } = editorState;
    const trimmedName = form.name.trim();
    const trimmedEmail = form.email.trim();
    const trimmedPhone = form.phone.trim();
    const trimmedState = form.state.trim();
    const trimmedQualification = form.qualification.trim();
    const trimmedCourse = form.course.trim() || "Event";
    const trimmedMessage = form.message.trim() || `Interested in ${trimmedCourse} masterclass`;

    if (!trimmedName || !trimmedEmail || !trimmedPhone || !trimmedState || !trimmedQualification) {
      setEditorState((previous) => ({
        ...previous,
        error: "Name, email, phone, state, and qualification are required.",
      }));
      return;
    }

    const payload = {
      name: trimmedName,
      email: trimmedEmail,
      phone: trimmedPhone,
      state: trimmedState,
      qualification: trimmedQualification,
      course: trimmedCourse,
      message: trimmedMessage,
    };

    setEditorState((previous) => ({
      ...previous,
      submitting: true,
      error: null,
    }));
    setActionMessage(null);

    try {
      if (mode === "create") {
        await createEventRegistrationAdmin({ token, data: payload });
        setActionMessage({ type: "success", text: "Registration added successfully." });
      } else if (form.id) {
        await updateEventRegistration({ token, registrationId: form.id, data: payload });
        setActionMessage({ type: "success", text: "Registration updated successfully." });
      }
      closeEditor();
      setReloadKey((previous) => previous + 1);
    } catch (err) {
      setEditorState((previous) => ({
        ...previous,
        submitting: false,
        error: err?.message || "Unable to save registration.",
      }));
    }
  };

  const handleDelete = async (item) => {
    if (!token || !item?.id) {
      return;
    }
    const confirmed = window.confirm(`Delete registration for ${item.name}?`);
    if (!confirmed) {
      return;
    }
    setPendingActionId(item.id);
    setActionMessage(null);

    try {
      await deleteEventRegistration({ token, registrationId: item.id });
      setActionMessage({ type: "success", text: "Registration deleted successfully." });
      setReloadKey((previous) => previous + 1);
    } catch (err) {
      setActionMessage({ type: "danger", text: err?.message || "Failed to delete registration." });
    } finally {
      setPendingActionId(null);
    }
  };

  const toggleSelectAll = () => {
    const visibleIds = filteredItems.map((item) => item.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
    setSelectedIds(
      allSelected
        ? selectedIds.filter((id) => !visibleIds.includes(id))
        : Array.from(new Set([...selectedIds, ...visibleIds]))
    );
  };

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    );
  };

  const handleSendJoinLinks = async () => {
    const url = joinLink.trim();
    if (!token || !selectedIds.length || !url) {
      setActionMessage({ type: "danger", text: "Select registrations and enter a join link first." });
      return;
    }

    setSendingLinks(true);
    setActionMessage(null);

    try {
      const response = await sendEventRegistrationJoinLinks({
        token,
        registrationIds: selectedIds,
        joinUrl: url,
      });
      const sentCount = response?.sent ?? selectedIds.length;
      const total = response?.total ?? selectedIds.length;
      setActionMessage({
        type: "success",
        text: `Join link sent to ${sentCount} of ${total} registration(s).`,
      });
    } catch (err) {
      setActionMessage({
        type: "danger",
        text: err?.message || "Failed to send join links.",
      });
    } finally {
      setSendingLinks(false);
    }
  };

  return (
    <div className='card mt-24'>
      <div className='card-header border-0 pb-0'>
        <div className='d-flex flex-wrap gap-12 justify-content-between align-items-center'>
          <div>
            <h5 className='mb-1'>Event Registrations</h5>
            <p className='text-muted mb-0'>
              View the latest sign-ups coming from the public event CTA form.
            </p>
          </div>
          <div className='d-flex flex-wrap gap-12 ms-auto align-items-center'>
            <input
              type='search'
              className='form-control'
              placeholder='Search by name, email, or course'
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              style={{ minWidth: 240 }}
            />
            <input
              type='url'
              className='form-control'
              placeholder='Join link to email selected'
              value={joinLink}
              onChange={(event) => setJoinLink(event.target.value)}
              style={{ minWidth: 260 }}
            />
            <button
              type='button'
              className='btn btn-outline-primary'
              onClick={handleSendJoinLinks}
              disabled={sendingLinks || !selectedIds.length}
              title='Send join link to selected registrations'
            >
              {sendingLinks ? "Sending..." : `Send Link (${selectedIds.length || 0})`}
            </button>
            <button type='button' className='btn btn-primary' onClick={openCreateEditor}>
              Add Registration
            </button>
          </div>
        </div>
      </div>
      <div className='card-body'>
        {actionMessage ? (
          <div className={`alert alert-${actionMessage.type === "danger" ? "danger" : "success"} mb-3`}>
            {actionMessage.text}
          </div>
        ) : null}
        {error ? (
          <div className='alert alert-danger mb-0'>{error}</div>
        ) : loading ? (
          <div className='d-flex justify-content-center py-48'>
            <div className='spinner-border text-primary' role='status'>
              <span className='visually-hidden'>Loading...</span>
            </div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className='alert alert-info mb-0'>
            No event registrations found yet.
          </div>
        ) : (
          <div className='table-responsive'>
            <table className='table align-middle'>
              <thead>
                <tr>
                  <th style={{ width: 36 }}>
                    <input
                      type='checkbox'
                      className='form-check-input'
                      onChange={toggleSelectAll}
                      checked={
                        filteredItems.length > 0 &&
                        filteredItems.every((item) => selectedIds.includes(item.id))
                      }
                    />
                  </th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>State</th>
                  <th>Qualification</th>
                  <th>Event</th>
                  <th>Message</th>
                  <th>Submitted</th>
                  <th style={{ minWidth: 160 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const derivedState = item.state || extractStateFromMessage(item.message);
                  const cleanedMessage = stripStateFromMessage(item.message);

                  return (
                    <tr key={item.id}>
                      <td>
                        <input
                          type='checkbox'
                          className='form-check-input'
                          checked={selectedIds.includes(item.id)}
                          onChange={() => toggleSelectOne(item.id)}
                        />
                      </td>
                      <td>{item.name}</td>
                      <td>
                        <a href={`mailto:${item.email}`} className='text-decoration-none'>
                          {item.email}
                        </a>
                      </td>
                      <td>
                        <a href={`tel:${item.phone}`} className='text-decoration-none'>
                          {item.phone}
                        </a>
                      </td>
                      <td>{derivedState || '--'}</td>
                      <td>{item.qualification || '--'}</td>
                      <td>{item.course}</td>
                      <td style={{ maxWidth: 260 }}>
                        <div className='text-break'>{cleanedMessage}</div>
                      </td>
                      <td>{formatDateTime(item.createdAt)}</td>
                      <td>
                        <div className='d-flex gap-2 flex-wrap'>
                          <button
                            type='button'
                            className='btn btn-sm btn-outline-primary'
                            onClick={() => openEditEditor(item)}
                          >
                            Edit
                          </button>
                          <button
                            type='button'
                            className='btn btn-sm btn-outline-danger'
                            onClick={() => handleDelete(item)}
                            disabled={pendingActionId === item.id}
                          >
                            {pendingActionId === item.id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}
        {editorState.open ? (
          <div className='card mt-24'>
            <div className='card-header'>
              <h6 className='mb-0'>
                {editorState.mode === "create" ? "Add Event Registration" : "Edit Event Registration"}
              </h6>
            </div>
            <div className='card-body'>
              {editorState.error ? (
                <div className='alert alert-danger'>{editorState.error}</div>
              ) : null}
              <form onSubmit={handleEditorSubmit} className='row g-3'>
                <div className='col-md-6'>
                  <label className='form-label'>Name *</label>
                  <input
                    className='form-control'
                    value={editorState.form.name}
                    onChange={(e) => handleEditorFieldChange("name", e.target.value)}
                    required
                  />
                </div>
                <div className='col-md-6'>
                  <label className='form-label'>Email *</label>
                  <input
                    className='form-control'
                    type='email'
                    value={editorState.form.email}
                    onChange={(e) => handleEditorFieldChange("email", e.target.value)}
                    required
                  />
                </div>
                <div className='col-md-6'>
                  <label className='form-label'>Phone *</label>
                  <input
                    className='form-control'
                    value={editorState.form.phone}
                    onChange={(e) => handleEditorFieldChange("phone", e.target.value)}
                    required
                  />
                </div>
                <div className='col-md-6'>
                  <label className='form-label'>State *</label>
                  <select
                    className='form-select'
                    value={editorState.form.state}
                    onChange={(e) => handleEditorFieldChange("state", e.target.value)}
                    required
                  >
                    <option value=''>Select state</option>
                    {STATE_OPTIONS.map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                </div>
                <div className='col-md-6'>
                  <label className='form-label'>Qualification *</label>
                  <select
                    className='form-select'
                    value={editorState.form.qualification}
                    onChange={(e) => handleEditorFieldChange("qualification", e.target.value)}
                    required
                  >
                    <option value=''>Select qualification</option>
                    {QUALIFICATION_OPTIONS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
                <div className='col-md-6'>
                  <label className='form-label'>Event Name *</label>
                  <input
                    className='form-control'
                    value={editorState.form.course}
                    onChange={(e) => handleEditorFieldChange("course", e.target.value)}
                    required
                  />
                </div>
                <div className='col-12'>
                  <label className='form-label'>Message</label>
                  <textarea
                    className='form-control'
                    rows={3}
                    value={editorState.form.message}
                    onChange={(e) => handleEditorFieldChange("message", e.target.value)}
                  />
                </div>
                <div className='col-12 d-flex gap-12'>
                  <button
                    type='submit'
                    className='btn btn-primary'
                    disabled={editorState.submitting}
                  >
                    {editorState.submitting
                      ? "Saving..."
                      : editorState.mode === "create"
                      ? "Create"
                      : "Update"}
                  </button>
                  <button type='button' className='btn btn-outline-secondary' onClick={closeEditor}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default EventRegistrationsTable;
