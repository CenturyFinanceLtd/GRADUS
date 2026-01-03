import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import apiClient from "../services/apiClient";

const EVENT_TYPE_OPTIONS = ["Masterclass", "Seminar", "Webinar", "Job fair", "Corporate Initiatives"];

const defaultForm = {
    title: "",
    summary: "",
    category: "Masterclass",
    badge: "Masterclass",
    eventType: "Masterclass",
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
    status: "published",
    isFeatured: false,
    tags: "",
    highlights: "",
    agenda: "",
    // Masterclass fields - ALWAYS TRUE
    isMasterclass: true,
    mcWhyTitle: "",
    mcWhyDesc: "",
    mcWhoIsFor: "",
    mcOutcomes: "",
    mcTools: "",
    mcBonuses: "",
    mcCommunity: "",
    mcCurriculumJson: "[]",
    mcFaqsJson: "[]",
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

const formatShortDate = (val) => {
    if (!val) return "TBA";
    // If it's already a formatted string or doesn't look like an ISO date, just return it
    if (typeof val === 'string' && !val.includes('T') && val.length < 20) {
        // Simple heuristic: if it's short and no T separator, maybe it's just "12th Oct"
        return val;
    }
    try {
        const date = new Date(val);
        if (Number.isNaN(date.getTime())) return val; // Fallback to original string if parse fails
        return new Intl.DateTimeFormat("en-IN", {
            month: "short",
            day: "numeric",
            year: "numeric",
        }).format(date);
    } catch {
        return val || "TBA";
    }
};

const MasterclassAdminPage = () => {
    const navigate = useNavigate();
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
            // Fetch landing pages instead/alongside events
            // The user wants "Landing Pages" to be the masterclasses
            const landingPages = await apiClient('/admin/landing-pages', { token });

            // Map landing pages to the event structure expected by the list
            const mappedItems = (landingPages || []).map(lp => ({
                id: lp._id,
                title: lp.title || lp.hero?.highlight || lp.slug,
                host: {
                    name: lp.mentor?.name || lp.hero?.mentorName || "Unknown Host"
                },
                schedule: {
                    start: lp.hero?.date ? `${lp.hero.date} ${lp.hero?.time || ''}` : lp.createdAt,
                    timezone: "IST" // Default
                },
                status: lp.isPublished ? "published" : "draft",
                // Preserve original object for editing if needed (though editing might need redirect)
                original: lp
            }));

            // If we still want to show legacy events, we could merge them. 
            // But user said "these landing pages ARE master classes", implying exclusion of old table?
            // Let's just show landing pages for now as requested.
            setItems(mappedItems);
        } catch (err) {
            console.error(err);
            setError(err?.message || "Failed to load masterclasses");
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
        category: event?.category || "Masterclass",
        badge: event?.badge || "Masterclass",
        eventType: event?.eventType || "Masterclass",
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
        // Masterclass props
        isMasterclass: true,
        mcWhyTitle: event?.masterclassDetails?.overview?.whyMatters?.title || "",
        mcWhyDesc: event?.masterclassDetails?.overview?.whyMatters?.description || "",
        mcWhoIsFor: (event?.masterclassDetails?.overview?.whoIsFor || []).join("\n"),
        mcOutcomes: (event?.masterclassDetails?.overview?.outcomes || []).join("\n"),
        mcTools: (event?.masterclassDetails?.overview?.tools || []).join("\n"),
        mcBonuses: (event?.masterclassDetails?.overview?.bonuses || []).join("\n"),
        mcCommunity: (event?.masterclassDetails?.overview?.community || []).join("\n"),
        mcCurriculumJson: JSON.stringify(event?.masterclassDetails?.curriculum || [], null, 2),
        mcFaqsJson: JSON.stringify(event?.masterclassDetails?.faqs || [], null, 2),
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
            category: form.category.trim() || "Masterclass",
            badge: form.badge.trim(),
            eventType: form.eventType || "Masterclass",
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
            isMasterclass: true,
        };

        let curriculum = [];
        let faqs = [];
        try {
            curriculum = JSON.parse(form.mcCurriculumJson || "[]");
            faqs = JSON.parse(form.mcFaqsJson || "[]");
        } catch (e) {
            throw new Error("Invalid JSON in Curriculum or FAQs");
        }

        payload.masterclassDetails = {
            overview: {
                whyMatters: { title: form.mcWhyTitle, description: form.mcWhyDesc },
                whoIsFor: form.mcWhoIsFor.split("\n").map(s => s.trim()).filter(Boolean),
                howItWorks: [],
                outcomes: form.mcOutcomes.split("\n").map(s => s.trim()).filter(Boolean),
                tools: form.mcTools.split("\n").map(s => s.trim()).filter(Boolean),
                bonuses: form.mcBonuses.split("\n").map(s => s.trim()).filter(Boolean),
                community: form.mcCommunity.split("\n").map(s => s.trim()).filter(Boolean),
            },
            curriculum,
            faqs
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
            setError(err?.message || "Unable to save masterclass");
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (event) => {
        // If it's a landing page (has original property), navigate to specific editor
        if (event.original && event.original.slug) {
            navigate(`/edit-landing-page/${event.original.slug}`);
            return;
        }
        // Fallback for legacy events
        setEditing(event);
        setForm(mappedForm(event));
    };

    const handleDelete = async (event) => {
        const confirmed = window.confirm(`Delete "${event.title}"? This cannot be undone.`);
        if (!confirmed) return;
        try {
            if (event.original && event.original._id) {
                // Delete Landing Page
                await apiClient(`/admin/landing-pages/${event.original._id}`, { method: 'DELETE', token });
            } else {
                // Delete Legacy Event
                await deleteAdminEvent({ token, id: event.id });
            }

            setItems((prev) => prev.filter((item) => item.id !== event.id));
            if (editing?.id === event.id) {
                resetForm();
            }
        } catch (err) {
            setError(err?.message || "Failed to delete masterclass");
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
            <Breadcrumb title='Masterclasses' />
            {error ? <div className='alert alert-danger mt-3'>{error}</div> : null}
            <div className='row gy-4 mt-2'>
                <div className='col-xxl-4'>
                    <div className='card h-100'>
                        <div className='card-header d-flex justify-content-between align-items-center'>
                            <h6 className='mb-0'>{editing ? "Edit Masterclass" : "Create Masterclass"}</h6>
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

                                {/* Simplified categorization for Masterclass */}
                                <input type='hidden' name='category' value='Masterclass' />
                                <input type='hidden' name='eventType' value='Masterclass' />

                                <div className='col-6'>
                                    <label className='form-label'>Badge</label>
                                    <input className='form-control' name='badge' value={form.badge} onChange={handleInputChange} placeholder='e.g. Masterclass' />
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
                                    </div>
                                    {form.hostAvatarUrl ? (
                                        <div className='border rounded p-2 bg-light-subtle'>
                                            <img
                                                src={form.hostAvatarUrl}
                                                alt={form.hostName || "Host photo"}
                                                style={{ maxWidth: 64, maxHeight: 64, objectFit: "cover", display: "block", borderRadius: 8 }}
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
                                    </div>
                                    {form.heroImageUrl ? (
                                        <div className='border rounded p-2 bg-light-subtle'>
                                            <img
                                                src={form.heroImageUrl}
                                                alt="Banner preview"
                                                style={{ maxWidth: 100, maxHeight: 60, objectFit: "cover", display: "block" }}
                                            />
                                        </div>
                                    ) : null}
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

                                {/* Masterclass Details Section - Always Visible */}
                                <div className='col-12 border p-3 rounded bg-white'>
                                    <h6 className='mb-3 text-primary'>Masterclass Specifics</h6>

                                    <div className='mb-3'>
                                        <label className='form-label'>Why It Matters (Title)</label>
                                        <input className='form-control' name='mcWhyTitle' value={form.mcWhyTitle} onChange={handleInputChange} placeholder='e.g. Why Financial Literacy Matters' />
                                    </div>
                                    <div className='mb-3'>
                                        <label className='form-label'>Why It Matters (Description)</label>
                                        <textarea className='form-control' rows={3} name='mcWhyDesc' value={form.mcWhyDesc} onChange={handleInputChange} />
                                    </div>

                                    <div className='row g-3'>
                                        <div className='col-md-6'>
                                            <label className='form-label'>Who Is For (One per line)</label>
                                            <textarea className='form-control' rows={4} name='mcWhoIsFor' value={form.mcWhoIsFor} onChange={handleInputChange} placeholder='College students...' />
                                        </div>
                                        <div className='col-md-6'>
                                            <label className='form-label'>Outcomes (One per line)</label>
                                            <textarea className='form-control' rows={4} name='mcOutcomes' value={form.mcOutcomes} onChange={handleInputChange} placeholder='Clear understanding...' />
                                        </div>
                                        <div className='col-md-6'>
                                            <label className='form-label'>Tools Included (One per line)</label>
                                            <textarea className='form-control' rows={4} name='mcTools' value={form.mcTools} onChange={handleInputChange} placeholder='Budget templates...' />
                                        </div>
                                        <div className='col-md-6'>
                                            <label className='form-label'>Bonuses (One per line)</label>
                                            <textarea className='form-control' rows={4} name='mcBonuses' value={form.mcBonuses} onChange={handleInputChange} placeholder='PDF Guide...' />
                                        </div>
                                    </div>

                                    <div className='mt-3'>
                                        <label className='form-label'>Curriculum (JSON Array)</label>
                                        <textarea className='form-control font-monospace text-xs' rows={5} name='mcCurriculumJson' value={form.mcCurriculumJson} onChange={handleInputChange} />
                                        <small className='text-muted'>Example: {`[{"title":"Module 1", "description":"Intro...", "icon":"fa-solid fa-book"}]`}</small>
                                    </div>
                                </div>

                                <div className='col-12'>
                                    <label className='form-label'>Location / Link</label>
                                    <input className='form-control' name='location' value={form.location} onChange={handleInputChange} />
                                </div>
                                <div className='col-6'>
                                    <label className='form-label'>Price Label</label>
                                    <input className='form-control' name='priceLabel' value={form.priceLabel} onChange={handleInputChange} />
                                </div>
                                <div className='col-6'>
                                    <label className='form-label'>Price Amount</label>
                                    <input className='form-control' name='priceAmount' type='number' value={form.priceAmount} onChange={handleInputChange} />
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
                                    <button type='submit' className='btn btn-main w-100 rounded-pill' disabled={saving}>
                                        {saving ? "Saving..." : editing ? "Update Masterclass" : "Create Masterclass"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
                <div className='col-xxl-8'>
                    <div className='card h-100'>
                        <div className='card-header d-flex justify-content-between align-items-center'>
                            <h6 className='mb-0'>Masterclasses List</h6>
                            <button type='button' className='btn btn-sm btn-outline-main rounded-pill' onClick={load} disabled={loading}>
                                {loading ? "Refreshing..." : "Refresh"}
                            </button>
                        </div>
                        <div className='card-body p-0'>
                            {loading ? (
                                <div className='p-4 text-center text-neutral-500'>Loading...</div>
                            ) : upcomingEvents.length === 0 ? (
                                <div className='p-4 text-center text-neutral-500'>No masterclasses found.</div>
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
                                                        <span className='text-sm text-neutral-500'>{event.host?.name}</span>
                                                    </td>
                                                    <td>
                                                        <p className='mb-0 text-sm'>{formatShortDate(event?.schedule?.start)}</p>
                                                        <span className='badge bg-neutral-50 text-neutral-700 mt-1 text-xs'>
                                                            {event?.schedule?.timezone}
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

export default MasterclassAdminPage;
