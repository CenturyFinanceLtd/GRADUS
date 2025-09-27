import { useEffect, useMemo, useState } from "react";
import useAuth from "../hook/useAuth";
import { fetchContactInquiries, updateContactInquiry } from "../services/adminInquiries";

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

const InquiriesLayer = () => {
  const { token } = useAuth();
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [statusDrafts, setStatusDrafts] = useState({});
  const [actionMessage, setActionMessage] = useState(null);
  const [savingStates, setSavingStates] = useState({});

  useEffect(() => {
    let isCancelled = false;

    if (!token) {
      setInquiries([]);
      setLoading(false);
      return undefined;
    }

    const loadInquiries = async () => {
      setLoading(true);
      setActionMessage(null);
      setError(null);

      try {
        const response = await fetchContactInquiries({ token });
        if (!isCancelled) {
          setInquiries(response?.items || []);
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err?.message || "Failed to load inquiries");
          setInquiries([]);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    loadInquiries();

    return () => {
      isCancelled = true;
    };
  }, [token, reloadKey]);

  useEffect(() => {
    const drafts = {};

    inquiries.forEach((inquiry) => {
      drafts[inquiry.id] = {
        contactStatus: inquiry.contactStatus || "pending",
        leadGenerated:
          inquiry.leadGenerated === true
            ? "true"
            : inquiry.leadGenerated === false
            ? "false"
            : "unknown",
        inquirySolved:
          inquiry.inquirySolved === true
            ? "true"
            : inquiry.inquirySolved === false
            ? "false"
            : "unknown",
      };
    });

    setStatusDrafts(drafts);
  }, [inquiries]);

  const filteredInquiries = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      return inquiries;
    }

    return inquiries.filter((inquiry) => {
      const fields = [
        inquiry.name,
        inquiry.email,
        inquiry.phone,
        inquiry.region,
        inquiry.institution,
        inquiry.course,
        inquiry.message,
      ];

      return fields.some((field) =>
        typeof field === "string" ? field.toLowerCase().includes(term) : false
      );
    });
  }, [inquiries, search]);

  const handleDraftChange = (id, field, value) => {
    setStatusDrafts((previous) => {
      const current = previous[id] || {};
      const nextDraft = {
        ...current,
        [field]: value,
      };

      if (field === "contactStatus") {
        nextDraft.leadGenerated = "unknown";
        nextDraft.inquirySolved = "unknown";
      }

      return {
        ...previous,
        [id]: nextDraft,
      };
    });
  };

  const setSavingForId = (id, value) => {
    setSavingStates((previous) => ({
      ...previous,
      [id]: value,
    }));
  };

  const handleSave = async (inquiry) => {
    if (!token) {
      return;
    }

    const draft = statusDrafts[inquiry.id] || {};
    const contactStatus = draft.contactStatus || "pending";

    if (contactStatus === "contacted") {
      if (draft.leadGenerated === "unknown" || draft.inquirySolved === "unknown") {
        setActionMessage({
          type: "error",
          text: "Please record whether a lead was generated and if the inquiry was solved.",
        });
        return;
      }
    }

    const payload = {
      contactStatus,
    };

    if (contactStatus === "contacted") {
      payload.leadGenerated = draft.leadGenerated === "true";
      payload.inquirySolved = draft.inquirySolved === "true";
    }

    setActionMessage(null);
    setSavingForId(inquiry.id, true);

    try {
      const response = await updateContactInquiry({
        token,
        inquiryId: inquiry.id,
        data: payload,
      });

      if (response?.item) {
        setInquiries((previous) =>
          previous.map((item) => (item.id === inquiry.id ? { ...item, ...response.item } : item))
        );

        setStatusDrafts((previous) => ({
          ...previous,
          [inquiry.id]: {
            contactStatus: response.item.contactStatus || "pending",
            leadGenerated:
              response.item.leadGenerated === true
                ? "true"
                : response.item.leadGenerated === false
                ? "false"
                : "unknown",
            inquirySolved:
              response.item.inquirySolved === true
                ? "true"
                : response.item.inquirySolved === false
                ? "false"
                : "unknown",
          },
        }));
      }

      setActionMessage({ type: "success", text: "Inquiry updated successfully." });
    } catch (err) {
      setActionMessage({ type: "error", text: err?.message || "Failed to update inquiry." });
    } finally {
      setSavingForId(inquiry.id, false);
    }
  };

  return (
    <div className='card p-24'>
      <div className='d-flex flex-wrap gap-16 justify-content-between align-items-center mb-24'>
        <div>
          <h5 className='mb-8'>Contact Inquiries</h5>
          <p className='text-neutral-500 mb-0'>Review the leads submitted through the public contact form.</p>
        </div>
        <div className='d-flex flex-wrap gap-12'>
          <input
            type='search'
            className='form-control border-neutral-30 radius-8'
            placeholder='Search by name, email, phone, or message'
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label='Search inquiries'
          />
          <button
            type='button'
            className='btn btn-outline-primary radius-8'
            onClick={() => setReloadKey((previous) => previous + 1)}
            disabled={loading}
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {error ? (
        <div className='alert alert-danger mb-24' role='alert'>
          {error}
        </div>
      ) : null}

      {actionMessage ? (
        <div
          className={`alert alert-${actionMessage.type === "success" ? "success" : "danger"} mb-24`}
          role='alert'
        >
          {actionMessage.text}
        </div>
      ) : null}

      {loading ? (
        <div className='d-flex justify-content-center py-64'>
          <div className='spinner-border text-primary' role='status'>
            <span className='visually-hidden'>Loading...</span>
          </div>
        </div>
      ) : filteredInquiries.length === 0 ? (
        <div className='alert alert-info mb-0' role='alert'>
          No inquiries found.
        </div>
      ) : (
        <div className='table-responsive'>
          <table className='table align-middle'>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Region</th>
                <th>Institution</th>
                <th>Course</th>
                <th style={{ minWidth: "220px" }}>Message</th>
                <th>Submitted</th>
                <th>Status</th>
                <th>Lead Generated</th>
                <th>Inquiry Solved</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInquiries.map((inquiry) => (
                <tr key={inquiry.id}>
                  <td>{inquiry.name}</td>
                  <td>
                    <a href={`mailto:${inquiry.email}`} className='text-decoration-none'>
                      {inquiry.email}
                    </a>
                  </td>
                  <td>
                    <a href={`tel:${inquiry.phone}`} className='text-decoration-none'>
                      {inquiry.phone}
                    </a>
                  </td>
                  <td>{inquiry.region}</td>
                  <td>{inquiry.institution}</td>
                  <td>{inquiry.course}</td>
                  <td>
                    <div className='text-break' style={{ whiteSpace: "normal" }}>
                      {inquiry.message}
                    </div>
                  </td>
                  <td>{formatDateTime(inquiry.createdAt)}</td>
                  <td>
                    <select
                      className='form-select form-select-sm'
                      value={statusDrafts[inquiry.id]?.contactStatus || "pending"}
                      onChange={(event) =>
                        handleDraftChange(inquiry.id, "contactStatus", event.target.value)
                      }
                    >
                      <option value='pending'>Pending</option>
                      <option value='contacted'>Contacted</option>
                      <option value='unable_to_contact'>Unable to contact</option>
                    </select>
                  </td>
                  <td>
                    <select
                      className='form-select form-select-sm'
                      value={statusDrafts[inquiry.id]?.leadGenerated || "unknown"}
                      onChange={(event) =>
                        handleDraftChange(inquiry.id, "leadGenerated", event.target.value)
                      }
                      disabled={statusDrafts[inquiry.id]?.contactStatus !== "contacted"}
                    >
                      <option value='unknown'>Select</option>
                      <option value='true'>Yes</option>
                      <option value='false'>No</option>
                    </select>
                  </td>
                  <td>
                    <select
                      className='form-select form-select-sm'
                      value={statusDrafts[inquiry.id]?.inquirySolved || "unknown"}
                      onChange={(event) =>
                        handleDraftChange(inquiry.id, "inquirySolved", event.target.value)
                      }
                      disabled={statusDrafts[inquiry.id]?.contactStatus !== "contacted"}
                    >
                      <option value='unknown'>Select</option>
                      <option value='true'>Yes</option>
                      <option value='false'>No</option>
                    </select>
                  </td>
                  <td>
                    <button
                      type='button'
                      className='btn btn-sm btn-primary'
                      onClick={() => handleSave(inquiry)}
                      disabled={!!savingStates[inquiry.id] || loading}
                    >
                      {savingStates[inquiry.id] ? "Saving..." : "Save"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default InquiriesLayer;
