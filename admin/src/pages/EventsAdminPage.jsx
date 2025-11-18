import { useEffect, useMemo, useState } from "react";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import { useAuthContext } from "../context/AuthContext";
import {
  listAdminEvents,
  createAdminEvent,
  updateAdminEvent,
  deleteAdminEvent,
} from "../services/adminEvents";
import { uploadImage } from "../services/uploads";

const EVENT_TYPE_OPTIONS = ["Webinar", "Workshop", "Bootcamp", "Info Session", "Live Q&A"];

const defaultForm = {
  title: "",
  summary: "",
  category: "General",
  badge: "",
  eventType: EVENT_TYPE_OPTIONS[0],
  hostName: "",
  hostTitle: "",
  hostBio: "",
  hostAvatarUrl: "",
  heroImageUrl: "",
  heroImageAlt: "",
  startDate: "",
  endDate: "",
  timezone: "Asia/Kolkata",
  location: "",
  mode: "online",
  priceLabel: "Free",
  priceAmount: "",
  priceCurrency: "INR",
  isFree: true,
  ctaLabel: "Join us live",
  ctaUrl: "",
  status: "draft",
  isFeatured: false,
  tags: "",
  highlights: "",
  agenda: "",
};

const toDatetimeLocal = (iso) => {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (input) => String(input).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
};

const fromDatetimeLocal = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const formatShortDate = (iso) => {
  if (!iso) return "TBA";
  try {
    return new Intl.DateTimeFormat("en-IN", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return "TBA";
  }
};

const EventsAdminPage = () => {
  const { token } = useAuthContext();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [editing, setEditing] = useState(null);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [uploadingHostAvatar, setUploadingHostAvatar] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listAdminEvents({ token });
      setItems(data);
    } catch (err) {
      setError(err?.message || "Failed to load events");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mappedForm = (event) => ({
    title: event?.title || "",
    summary: event?.summary || "",
    category: event?.category || "General",
    badge: event?.badge || "",
    eventType: event?.eventType || EVENT_TYPE_OPTIONS[0],
    hostName: event?.host?.name || "",
    hostTitle: event?.host?.title || "",
    hostBio: event?.host?.bio || "",
    hostAvatarUrl: event?.host?.avatarUrl || "",
    heroImageUrl: event?.heroImage?.url || "",
    heroImageAlt: event?.heroImage?.alt || "",
    startDate: toDatetimeLocal(event?.schedule?.start),
    endDate: toDatetimeLocal(event?.schedule?.end),
    timezone: event?.schedule?.timezone || "Asia/Kolkata",
    location: event?.location || "",
    mode: event?.mode || "online",
    priceLabel: event?.price?.label || "",
    priceAmount: event?.price?.amount ?? "",
    priceCurrency: event?.price?.currency || "INR",
    isFree: Boolean(event?.price?.isFree),
    ctaLabel: event?.cta?.label || "",
    ctaUrl: event?.cta?.url || "",
    status: event?.status || "draft",
    isFeatured: Boolean(event?.isFeatured),
    tags: (event?.tags || []).join(", "),
    highlights: (event?.meta?.highlights || []).join("\n"),
    agenda: (event?.meta?.agenda || []).join("\n"),
  });

  const handleInputChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const resetForm = () => {
    setEditing(null);
    setForm(defaultForm);
  };

  const buildPayload = () => {
    if (!form.title.trim()) {
      throw new Error("Title is required");
    }
    if (!form.startDate) {
      throw new Error("Start date & time is required");
    }

    const payload = {
      title: form.title.trim(),
      summary: form.summary.trim(),
      category: form.category.trim() || "General",
      badge: form.badge.trim(),
      eventType: form.eventType || EVENT_TYPE_OPTIONS[0],
    hostName: form.hostName.trim(),
    hostTitle: form.hostTitle.trim(),
    hostBio: form.hostBio.trim(),
    hostAvatarUrl: form.hostAvatarUrl.trim(),
    heroImageUrl: form.heroImageUrl.trim(),
    heroImageAlt: form.heroImageAlt.trim(),
      startDate: fromDatetimeLocal(form.startDate),
      endDate: fromDatetimeLocal(form.endDate),
      timezone: form.timezone.trim() || "Asia/Kolkata",
      location: form.location.trim(),
      mode: form.mode,
      priceLabel: form.priceLabel.trim(),
      priceCurrency: (form.priceCurrency || "INR").toUpperCase(),
      isFree: Boolean(form.isFree),
      ctaLabel: form.ctaLabel.trim(),
      ctaUrl: form.ctaUrl.trim(),
      status: form.status,
      isFeatured: Boolean(form.isFeatured),
      tags: form.tags,
      highlights: form.highlights,
      agenda: form.agenda,
    };

    if (form.priceAmount !== "" && form.priceAmount !== null) {
      payload.priceAmount = Number(form.priceAmount);
    }

    return payload;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      const payload = buildPayload();
      let saved;
      if (editing) {
        saved = await updateAdminEvent({
          token,
          id: editing.id,
          payload,
        });
        setItems((prev) => prev.map((item) => (item.id === saved.id ? saved : item)));
      } else {
        saved = await createAdminEvent({ token, payload });
        setItems((prev) => [saved, ...prev]);
      }
      resetForm();
    } catch (err) {
      setError(err?.message || "Unable to save event");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (event) => {
    setEditing(event);
    setForm(mappedForm(event));
  };

  const handleDelete = async (event) => {
    const confirmed = window.confirm(`Delete "${event.title}"? This cannot be undone.`);
    if (!confirmed) return;
    try {
      await deleteAdminEvent({ token, id: event.id });
      setItems((prev) => prev.filter((item) => item.id !== event.id));
      if (editing?.id === event.id) {
        resetForm();
      }
    } catch (err) {
      setError(err?.message || "Failed to delete event");
    }
  };

  const handleHeroImageUpload = async (file) => {
    if (!file) return;
    try {
      setUploadingHero(true);
      setError(null);
      const uploaded = await uploadImage({ file, token });
      setForm((prev) => ({
        ...prev,
        heroImageUrl: uploaded.url || prev.heroImageUrl,
      }));
    } catch (err) {
      setError(err?.message || "Image upload failed");
    } finally {
      setUploadingHero(false);
    }
  };

  const handleHostAvatarUpload = async (file) => {
    if (!file) return;
    try {
      setUploadingHostAvatar(true);
      setError(null);
      const uploaded = await uploadImage({ file, token });
      setForm((prev) => ({
        ...prev,
        hostAvatarUrl: uploaded.url || prev.hostAvatarUrl,
      }));
    } catch (err) {
      setError(err?.message || "Image upload failed");
    } finally {
      setUploadingHostAvatar(false);
    }
  };

  const statusBadgeClass = (status) => {
    switch (status) {
      case "published":
        return "badge bg-success-100 text-success-600";
      case "archived":
        return "badge bg-neutral-50 text-neutral-500";
      default:
        return "badge bg-warning-100 text-warning-700";
    }
  };

  const upcomingEvents = useMemo(
    () =>
      [...items].sort((a, b) => {
        const aTime = a?.schedule?.start ? new Date(a.schedule.start).getTime() : 0;
        const bTime = b?.schedule?.start ? new Date(b.schedule.start).getTime() : 0;
        return aTime - bTime;
      }),
    [items]
  );

  return (
    <MasterLayout>
      <Breadcrumb title='Events & Masterclasses' />
      {error ? <div className='alert alert-danger mt-3'>{error}</div> : null}
      <div className='row gy-4 mt-2'>
        <div className='col-xxl-4'>
          <div className='card h-100'>
            <div className='card-header d-flex justify-content-between align-items-center'>
              <h6 className='mb-0'>{editing ? "Edit Event" : "Create Event"}</h6>
              {editing ? (
                <button type='button' className='btn btn-sm btn-outline-danger rounded-pill' onClick={resetForm}>
                  Cancel edit
                </button>
              ) : (
                <button type='button' className='btn btn-sm btn-outline-secondary rounded-pill' onClick={resetForm}>
                  Reset
                </button>
              )}
            </div>
            <div className='card-body'>
              <form className='row g-3' onSubmit={handleSubmit}>
                <div className='col-12'>
                  <label className='form-label'>Title *</label>
                  <input className='form-control' name='title' value={form.title} onChange={handleInputChange} required />
                </div>
                <div className='col-12'>
                  <label className='form-label'>Summary</label>
                  <textarea className='form-control' rows={2} name='summary' value={form.summary} onChange={handleInputChange} />
                </div>
                <div className='col-6'>
                  <label className='form-label'>Category</label>
                  <input className='form-control' name='category' value={form.category} onChange={handleInputChange} />
                </div>
                <div className='col-6'>
                  <label className='form-label'>Event Type</label>
                  <select className='form-select' name='eventType' value={form.eventType} onChange={handleInputChange}>
                    {EVENT_TYPE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div className='col-6'>
                  <label className='form-label'>Badge</label>
                  <input className='form-control' name='badge' value={form.badge} onChange={handleInputChange} placeholder='e.g. Live' />
                </div>
                <div className='col-6'>
                  <label className='form-label'>Host Name</label>
                  <input className='form-control' name='hostName' value={form.hostName} onChange={handleInputChange} />
                </div>
                <div className='col-6'>
                  <label className='form-label'>Host Title</label>
                  <input className='form-control' name='hostTitle' value={form.hostTitle} onChange={handleInputChange} />
                </div>
                <div className='col-12'>
                  <label className='form-label'>Host Bio</label>
                  <textarea
                    className='form-control'
                    rows={3}
                    name='hostBio'
                    value={form.hostBio}
                    onChange={handleInputChange}
                    placeholder='Short instructor introduction'
                  />
                </div>
                <div className='col-12'>
                  <label className='form-label'>Host Photo URL</label>
                  <input
                    className='form-control'
                    name='hostAvatarUrl'
                    value={form.hostAvatarUrl}
                    onChange={handleInputChange}
                    placeholder='https://...'
                  />
                </div>
                <div className='col-12 d-flex align-items-center gap-3'>
                  <div className='flex-grow-1'>
                    <label className='form-label'>Upload Host Photo</label>
                    <input
                      type='file'
                      accept='image/*'
                      className='form-control'
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        handleHostAvatarUpload(file);
                        e.target.value = "";
                      }}
                      disabled={uploadingHostAvatar}
                    />
                    <small className='text-muted'>Recommended: square image (max 5MB)</small>
                  </div>
                  {form.hostAvatarUrl ? (
                    <div className='border rounded p-2 bg-light-subtle'>
                      <img
                        src={form.hostAvatarUrl}
                        alt={form.hostName || "Host photo preview"}
                        style={{ maxWidth: 96, maxHeight: 96, objectFit: "cover", display: "block", borderRadius: 12 }}
                      />
                    </div>
                  ) : null}
                </div>
                <div className='col-12'>
                  <label className='form-label'>Hero Image URL</label>
                  <input className='form-control' name='heroImageUrl' value={form.heroImageUrl} onChange={handleInputChange} placeholder='https://...' />
                </div>
                <div className='col-12 d-flex align-items-center gap-3'>
                  <div className='flex-grow-1'>
                    <label className='form-label'>Upload Banner</label>
                    <input
                      type='file'
                      accept='image/*'
                      className='form-control'
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        handleHeroImageUpload(file);
                        e.target.value = "";
                      }}
                      disabled={uploadingHero}
                    />
                    <small className='text-muted'>Recommended: landscape image (max 5MB)</small>
                  </div>
                  {form.heroImageUrl ? (
                    <div className='border rounded p-2 bg-light-subtle'>
                      <img
                        src={form.heroImageUrl}
                        alt={form.heroImageAlt || "Event banner preview"}
                        style={{ maxWidth: 140, maxHeight: 90, objectFit: "cover", display: "block" }}
                      />
                    </div>
                  ) : null}
                </div>
                <div className='col-12'>
                  <label className='form-label'>Hero Image Alt</label>
                  <input className='form-control' name='heroImageAlt' value={form.heroImageAlt} onChange={handleInputChange} />
                </div>
                <div className='col-12'>
                  <label className='form-label'>Start Date & Time *</label>
                  <input type='datetime-local' className='form-control' name='startDate' value={form.startDate} onChange={handleInputChange} required />
                </div>
                <div className='col-12'>
                  <label className='form-label'>End Date & Time</label>
                  <input type='datetime-local' className='form-control' name='endDate' value={form.endDate} onChange={handleInputChange} />
                </div>
                <div className='col-6'>
                  <label className='form-label'>Timezone</label>
                  <input className='form-control' name='timezone' value={form.timezone} onChange={handleInputChange} />
                </div>
                <div className='col-6'>
                  <label className='form-label'>Mode</label>
                  <select className='form-select' name='mode' value={form.mode} onChange={handleInputChange}>
                    <option value='online'>Online</option>
                    <option value='in-person'>In-person</option>
                    <option value='hybrid'>Hybrid</option>
                  </select>
                </div>
                <div className='col-12'>
                  <label className='form-label'>Location / Link</label>
                  <input className='form-control' name='location' value={form.location} onChange={handleInputChange} />
                </div>
                <div className='col-6'>
                  <label className='form-label'>Price Label</label>
                  <input className='form-control' name='priceLabel' value={form.priceLabel} onChange={handleInputChange} placeholder='Free / ₹999' />
                </div>
                <div className='col-6'>
                  <label className='form-label'>Price Amount</label>
                  <input className='form-control' name='priceAmount' type='number' value={form.priceAmount} onChange={handleInputChange} placeholder='Optional numeric' />
                </div>
                <div className='col-6'>
                  <label className='form-label'>Currency</label>
                  <input className='form-control' name='priceCurrency' value={form.priceCurrency} onChange={handleInputChange} />
                </div>
                <div className='col-6'>
                  <label className='form-label'>CTA Label</label>
                  <input className='form-control' name='ctaLabel' value={form.ctaLabel} onChange={handleInputChange} />
                </div>
                <div className='col-12'>
                  <label className='form-label'>CTA URL</label>
                  <input className='form-control' name='ctaUrl' value={form.ctaUrl} onChange={handleInputChange} placeholder='https:// or /events/slug' />
                </div>
                <div className='col-12 d-flex gap-3'>
                  <div className='form-check'>
                    <input type='checkbox' className='form-check-input' id='isFree' name='isFree' checked={form.isFree} onChange={handleInputChange} />
                    <label className='form-check-label' htmlFor='isFree'>
                      Free Event
                    </label>
                  </div>
                  <div className='form-check'>
                    <input type='checkbox' className='form-check-input' id='isFeatured' name='isFeatured' checked={form.isFeatured} onChange={handleInputChange} />
                    <label className='form-check-label' htmlFor='isFeatured'>
                      Featured
                    </label>
                  </div>
                </div>
                <div className='col-12'>
                  <label className='form-label'>Status</label>
                  <select className='form-select' name='status' value={form.status} onChange={handleInputChange}>
                    <option value='draft'>Draft</option>
                    <option value='published'>Published</option>
                    <option value='archived'>Archived</option>
                  </select>
                </div>
                <div className='col-12'>
                  <label className='form-label'>Tags (comma separated)</label>
                  <input className='form-control' name='tags' value={form.tags} onChange={handleInputChange} placeholder='Finance, Spirituality' />
                </div>
                <div className='col-12'>
                  <label className='form-label'>Highlights (one per line)</label>
                  <textarea className='form-control' rows={3} name='highlights' value={form.highlights} onChange={handleInputChange} placeholder='Key learning outcome' />
                </div>
                <div className='col-12'>
                  <label className='form-label'>Agenda (one line per item)</label>
                  <textarea className='form-control' rows={3} name='agenda' value={form.agenda} onChange={handleInputChange} placeholder='Module 1: ...' />
                </div>
                <div className='col-12'>
                  <button type='submit' className='btn btn-main w-100 rounded-pill' disabled={saving}>
                    {saving ? "Saving..." : editing ? "Update Event" : "Create Event"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
        <div className='col-xxl-8'>
          <div className='card h-100'>
            <div className='card-header d-flex justify-content-between align-items-center'>
              <h6 className='mb-0'>Upcoming Events</h6>
              <button type='button' className='btn btn-sm btn-outline-main rounded-pill' onClick={load} disabled={loading}>
                {loading ? "Refreshing..." : "Refresh"}
              </button>
            </div>
            <div className='card-body p-0'>
              {loading ? (
                <div className='p-4 text-center text-neutral-500'>Loading events…</div>
              ) : upcomingEvents.length === 0 ? (
                <div className='p-4 text-center text-neutral-500'>No events yet. Create your first masterclass.</div>
              ) : (
                <div className='table-responsive'>
                  <table className='table align-middle mb-0'>
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Schedule</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {upcomingEvents.map((event) => (
                        <tr key={event.id}>
                          <td>
                            <p className='fw-semibold mb-0'>{event.title}</p>
                            <span className='text-sm text-neutral-500'>{event.category}</span>
                          </td>
                          <td>
                            <p className='mb-0 text-sm'>{formatShortDate(event?.schedule?.start)}</p>
                            <span className='badge bg-neutral-50 text-neutral-700 mt-1 text-xs'>
                              {event?.schedule?.timezone || "Asia/Kolkata"}
                            </span>
                          </td>
                          <td>
                            <span className={statusBadgeClass(event.status)}>{event.status}</span>
                          </td>
                          <td>
                            <div className='d-flex gap-2'>
                              <button type='button' className='btn btn-sm btn-outline-secondary' onClick={() => handleEdit(event)}>
                                Edit
                              </button>
                              <button type='button' className='btn btn-sm btn-outline-danger' onClick={() => handleDelete(event)}>
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </MasterLayout>
  );
};

export default EventsAdminPage;
