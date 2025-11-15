import { useEffect, useState } from "react";
import useAuth from "../hook/useAuth";
import {
  fetchEmailTemplate,
  saveEmailTemplate,
  resetEmailTemplate,
} from "../services/emailTemplateService";

const TEMPLATE_KEY = "event_registration";

const EventEmailTemplateManager = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [template, setTemplate] = useState(null);
  const [form, setForm] = useState({ subject: "", html: "", text: "" });
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const loadTemplate = async () => {
      if (!token) {
        setTemplate(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetchEmailTemplate({ token, key: TEMPLATE_KEY });
        if (cancelled) {
          return;
        }

        setTemplate(response?.item || null);
        setForm({
          subject: response?.item?.subject || "",
          html: response?.item?.html || "",
          text: response?.item?.text || "",
        });
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || "Unable to load the template.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadTemplate();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleFieldChange = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!token) {
      return;
    }

    if (!form.subject.trim() || !form.html.trim() || !form.text.trim()) {
      setMessage({ type: "danger", text: "Subject, HTML, and Text fields are required." });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const response = await saveEmailTemplate({
        token,
        key: TEMPLATE_KEY,
        data: {
          subject: form.subject,
          html: form.html,
          text: form.text,
        },
      });

      setTemplate(response?.item || null);
      setMessage({ type: "success", text: "Template updated successfully." });
    } catch (err) {
      setMessage({ type: "danger", text: err?.message || "Failed to update template." });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!token) {
      return;
    }
    const confirmed = window.confirm("Reset this template to the default messaging?");
    if (!confirmed) {
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      await resetEmailTemplate({ token, key: TEMPLATE_KEY });
      const response = await fetchEmailTemplate({ token, key: TEMPLATE_KEY });
      setTemplate(response?.item || null);
      setForm({
        subject: response?.item?.subject || "",
        html: response?.item?.html || "",
        text: response?.item?.text || "",
      });
      setMessage({ type: "success", text: "Template reset to defaults." });
    } catch (err) {
      setMessage({ type: "danger", text: err?.message || "Failed to reset template." });
    } finally {
      setSaving(false);
    }
  };

  if (!token) {
    return null;
  }

  return (
    <div className='card mt-24'>
      <div className='card-header border-0 pb-0'>
        <div className='d-flex flex-wrap justify-content-between gap-12'>
          <div>
            <h5 className='mb-1'>Event Email Template</h5>
            <p className='text-muted mb-0'>
              Customize the confirmation message sent to participants after registration.
            </p>
          </div>
          <button type='button' className='btn btn-outline-secondary' onClick={handleReset} disabled={saving}>
            Reset to Default
          </button>
        </div>
      </div>
      <div className='card-body'>
        {error ? (
          <div className='alert alert-danger mb-0'>{error}</div>
        ) : loading ? (
          <div className='d-flex justify-content-center py-48'>
            <div className='spinner-border text-primary' role='status'>
              <span className='visually-hidden'>Loading...</span>
            </div>
          </div>
        ) : (
          <>
            {message ? (
              <div className={`alert alert-${message.type === "danger" ? "danger" : "success"}`}>{message.text}</div>
            ) : null}
            {template?.variables?.length ? (
              <div className='alert alert-info'>
                <strong>Available placeholders:</strong>
                <ul className='mb-0 mt-2'>
                  {template.variables.map((variable) => (
                    <li key={variable.token}>
                      <code>{`{{${variable.token}}}`}</code> &mdash; {variable.label}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <form onSubmit={handleSave} className='row g-3'>
              <div className='col-12'>
                <label className='form-label'>Subject *</label>
                <input
                  className='form-control'
                  value={form.subject}
                  onChange={(event) => handleFieldChange("subject", event.target.value)}
                  required
                />
              </div>
              <div className='col-12'>
                <label className='form-label'>HTML Body *</label>
                <textarea
                  className='form-control font-monospace'
                  rows={8}
                  value={form.html}
                  onChange={(event) => handleFieldChange("html", event.target.value)}
                  required
                />
              </div>
              <div className='col-12'>
                <label className='form-label'>Plain Text Body *</label>
                <textarea
                  className='form-control font-monospace'
                  rows={6}
                  value={form.text}
                  onChange={(event) => handleFieldChange("text", event.target.value)}
                  required
                />
              </div>
              <div className='col-12 d-flex gap-12'>
                <button type='submit' className='btn btn-primary' disabled={saving}>
                  {saving ? "Saving..." : "Save Template"}
                </button>
                <button
                  type='button'
                  className='btn btn-outline-secondary'
                  onClick={() =>
                    setForm({
                      subject: template?.subject || "",
                      html: template?.html || "",
                      text: template?.text || "",
                    })
                  }
                  disabled={saving}
                >
                  Discard Changes
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default EventEmailTemplateManager;
