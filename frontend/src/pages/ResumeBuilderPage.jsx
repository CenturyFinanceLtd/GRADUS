import { useEffect, useMemo, useRef, useState } from "react";
import resumeService from "../services/resumeService";
import { useAuth } from "../context/AuthContext";

const ResumeBuilderPage = () => {
  const { token } = useAuth();
  const [resume, setResume] = useState({ template: "classic", data: {}, isPublished: false });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const previewRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const current = await resumeService.getMyResume({ token });
        if (current) setResume(current);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  const save = async () => {
    setSaving(true);
    setMessage("");
    try {
      const saved = await resumeService.saveMyResume({ token, resume });
      setResume(saved);
      setMessage("Saved!");
    } catch (e) {
      setMessage(e?.message || "Unable to save.");
    } finally {
      setSaving(false);
    }
  };

  const updateData = (field, value) => {
    setResume((prev) => ({ ...prev, data: { ...prev.data, [field]: value } }));
  };

  const updateList = (key, index, patch) => {
    setResume((prev) => {
      const list = Array.isArray(prev.data?.[key]) ? [...prev.data[key]] : [];
      list[index] = { ...(list[index] || {}), ...patch };
      return { ...prev, data: { ...prev.data, [key]: list } };
    });
  };

  const addListItem = (key) => {
    setResume((prev) => {
      const list = Array.isArray(prev.data?.[key]) ? [...prev.data[key]] : [];
      list.push({});
      return { ...prev, data: { ...prev.data, [key]: list } };
    });
  };

  const removeListItem = (key, index) => {
    setResume((prev) => {
      const list = Array.isArray(prev.data?.[key]) ? [...prev.data[key]] : [];
      list.splice(index, 1);
      return { ...prev, data: { ...prev.data, [key]: list } };
    });
  };

  const downloadPdf = () => {
    if (!previewRef.current) return;
    const html = previewRef.current.innerHTML;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`
      <html>
        <head>
          <title>Resume</title>
          <style>
            body { font-family: Inter, sans-serif; padding: 32px; color: #111827; }
            h1,h2,h3 { margin: 0; }
            .section { margin-top: 18px; }
            .section-title { font-size: 16px; font-weight: 700; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; margin-bottom: 10px; }
            .item { margin-bottom: 10px; }
            .meta { font-size: 13px; color: #6b7280; }
            ul { padding-left: 16px; margin: 6px 0; }
          </style>
        </head>
        <body>${html}</body>
      </html>
    `);
    w.document.close();
    w.focus();
    w.print();
  };

  const templateClass = useMemo(() => {
    return resume.template === "modern" ? "resume-preview resume-preview--modern" : "resume-preview resume-preview--classic";
  }, [resume.template]);

  if (loading) return <div className='page-loading'>Loading...</div>;

  return (
    <section className='py-120'>
      <div className='container'>
        <div className='flex-between mb-16 flex-wrap gap-12'>
          <div>
            <h2 className='mb-4'>Resume Builder</h2>
            <p className='text-neutral-600 mb-0'>Save your resume details for quick job applications.</p>
          </div>
          <button className='btn btn-main' onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
        {message && <div className='text-success-600 mb-16'>{message}</div>}

        <div className='row gy-4'>
          <div className='col-12 col-md-6'>
            <label className='form-label fw-semibold'>Template</label>
            <select
              className='common-input'
              value={resume.template}
              onChange={(e) => setResume((prev) => ({ ...prev, template: e.target.value }))}
            >
              <option value='classic'>Classic</option>
              <option value='modern'>Modern</option>
            </select>
          </div>
          <div className='col-12 col-md-6 d-flex align-items-end'>
            <div className='form-check'>
              <input
                className='form-check-input'
                type='checkbox'
                id='resume-publish'
                checked={resume.isPublished}
                onChange={(e) => setResume((prev) => ({ ...prev, isPublished: e.target.checked }))}
              />
              <label className='form-check-label' htmlFor='resume-publish'>
                Publish (allow one-click apply)
              </label>
            </div>
          </div>
        </div>

        <div className='mt-32'>
          <h5>Basic Info</h5>
          <div className='row gy-3'>
            <div className='col-12 col-md-6'>
              <label className='form-label'>Full Name</label>
              <input
                className='common-input'
                value={resume.data.fullName || ""}
                onChange={(e) => updateData("fullName", e.target.value)}
              />
            </div>
            <div className='col-12 col-md-6'>
              <label className='form-label'>Headline</label>
              <input
                className='common-input'
                value={resume.data.headline || ""}
                onChange={(e) => updateData("headline", e.target.value)}
              />
            </div>
            <div className='col-12'>
              <label className='form-label'>Summary</label>
              <textarea
                className='common-input'
                rows={4}
                value={resume.data.summary || ""}
                onChange={(e) => updateData("summary", e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className='mt-32'>
          <h5>Links</h5>
          <div className='row gy-3'>
            <div className='col-12 col-md-6'>
              <label className='form-label'>LinkedIn</label>
              <input
                className='common-input'
                value={resume.data.linkedin || ""}
                onChange={(e) => updateData("linkedin", e.target.value)}
              />
            </div>
            <div className='col-12 col-md-6'>
              <label className='form-label'>Portfolio</label>
              <input
                className='common-input'
                value={resume.data.portfolio || ""}
                onChange={(e) => updateData("portfolio", e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className='mt-32'>
          <h5>Education</h5>
          {(resume.data.education || []).map((edu, idx) => (
            <div className='border rounded-12 p-16 mb-12' key={`edu-${idx}`}>
              <div className='d-flex justify-content-between gap-8'>
                <div className='fw-semibold'>Entry {idx + 1}</div>
                <button className='btn btn-sm btn-outline-danger' onClick={() => removeListItem("education", idx)}>
                  Remove
                </button>
              </div>
              <input
                className='common-input mt-8'
                placeholder='Institution'
                value={edu.institution || ""}
                onChange={(e) => updateList("education", idx, { institution: e.target.value })}
              />
              <input
                className='common-input mt-8'
                placeholder='Degree / Program'
                value={edu.degree || ""}
                onChange={(e) => updateList("education", idx, { degree: e.target.value })}
              />
              <input
                className='common-input mt-8'
                placeholder='Years (e.g., 2021-2024)'
                value={edu.years || ""}
                onChange={(e) => updateList("education", idx, { years: e.target.value })}
              />
              <textarea
                className='common-input mt-8'
                rows={2}
                placeholder='Highlights'
                value={edu.summary || ""}
                onChange={(e) => updateList("education", idx, { summary: e.target.value })}
              />
            </div>
          ))}
          <button className='btn btn-outline-main mt-8' onClick={() => addListItem("education")}>
            Add Education
          </button>
        </div>

        <div className='mt-32'>
          <h5>Experience</h5>
          {(resume.data.experience || []).map((exp, idx) => (
            <div className='border rounded-12 p-16 mb-12' key={`exp-${idx}`}>
              <div className='d-flex justify-content-between gap-8'>
                <div className='fw-semibold'>Entry {idx + 1}</div>
                <button className='btn btn-sm btn-outline-danger' onClick={() => removeListItem("experience", idx)}>
                  Remove
                </button>
              </div>
              <input
                className='common-input mt-8'
                placeholder='Company'
                value={exp.company || ""}
                onChange={(e) => updateList("experience", idx, { company: e.target.value })}
              />
              <input
                className='common-input mt-8'
                placeholder='Role'
                value={exp.role || ""}
                onChange={(e) => updateList("experience", idx, { role: e.target.value })}
              />
              <input
                className='common-input mt-8'
                placeholder='Duration'
                value={exp.duration || ""}
                onChange={(e) => updateList("experience", idx, { duration: e.target.value })}
              />
              <textarea
                className='common-input mt-8'
                rows={2}
                placeholder='Key achievements'
                value={exp.summary || ""}
                onChange={(e) => updateList("experience", idx, { summary: e.target.value })}
              />
            </div>
          ))}
          <button className='btn btn-outline-main mt-8' onClick={() => addListItem("experience")}>
            Add Experience
          </button>
        </div>

        <div className='mt-32'>
          <h5>Projects</h5>
          {(resume.data.projects || []).map((proj, idx) => (
            <div className='border rounded-12 p-16 mb-12' key={`proj-${idx}`}>
              <div className='d-flex justify-content-between gap-8'>
                <div className='fw-semibold'>Project {idx + 1}</div>
                <button className='btn btn-sm btn-outline-danger' onClick={() => removeListItem("projects", idx)}>
                  Remove
                </button>
              </div>
              <input
                className='common-input mt-8'
                placeholder='Project name'
                value={proj.name || ""}
                onChange={(e) => updateList("projects", idx, { name: e.target.value })}
              />
              <input
                className='common-input mt-8'
                placeholder='Link'
                value={proj.link || ""}
                onChange={(e) => updateList("projects", idx, { link: e.target.value })}
              />
              <textarea
                className='common-input mt-8'
                rows={2}
                placeholder='What you built'
                value={proj.summary || ""}
                onChange={(e) => updateList("projects", idx, { summary: e.target.value })}
              />
            </div>
          ))}
          <button className='btn btn-outline-main mt-8' onClick={() => addListItem("projects")}>
            Add Project
          </button>
        </div>

        <div className='mt-32'>
          <h5>Skills</h5>
          <textarea
            className='common-input'
            rows={2}
            placeholder='Comma-separated skills'
            value={resume.data.skills || ""}
            onChange={(e) => updateData("skills", e.target.value)}
          />
        </div>

        <div className='mt-32'>
          <h5>Social Links</h5>
          <div className='row gy-3'>
            <div className='col-12 col-md-6'>
              <label className='form-label'>GitHub</label>
              <input
                className='common-input'
                value={resume.data.github || ""}
                onChange={(e) => updateData("github", e.target.value)}
              />
            </div>
            <div className='col-12 col-md-6'>
              <label className='form-label'>Twitter</label>
              <input
                className='common-input'
                value={resume.data.twitter || ""}
                onChange={(e) => updateData("twitter", e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className='mt-40'>
          <div className='d-flex justify-content-between align-items-center mb-12'>
            <h4 className='mb-0'>Preview</h4>
            <button className='btn btn-outline-main' onClick={downloadPdf}>
              Download PDF
            </button>
          </div>
          <div className={templateClass} ref={previewRef}>
            <h2>{resume.data.fullName || "Your Name"}</h2>
            <div className='text-neutral-600'>{resume.data.headline || "Role / Headline"}</div>
            <div className='text-neutral-600'>
              {resume.data.linkedin && <span className='me-8'>LinkedIn: {resume.data.linkedin}</span>}
              {resume.data.portfolio && <span className='me-8'>Portfolio: {resume.data.portfolio}</span>}
              {resume.data.github && <span className='me-8'>GitHub: {resume.data.github}</span>}
            </div>
            {resume.data.summary && (
              <div className='section'>
                <div className='section-title'>Summary</div>
                <div>{resume.data.summary}</div>
              </div>
            )}
            {Array.isArray(resume.data.education) && resume.data.education.length > 0 && (
              <div className='section'>
                <div className='section-title'>Education</div>
                {resume.data.education.map((edu, idx) => (
                  <div className='item' key={`edu-prev-${idx}`}>
                    <div className='fw-semibold'>{edu.institution}</div>
                    <div className='meta'>
                      {edu.degree} {edu.years ? `• ${edu.years}` : ""}
                    </div>
                    <div className='text-sm'>{edu.summary}</div>
                  </div>
                ))}
              </div>
            )}
            {Array.isArray(resume.data.experience) && resume.data.experience.length > 0 && (
              <div className='section'>
                <div className='section-title'>Experience</div>
                {resume.data.experience.map((exp, idx) => (
                  <div className='item' key={`exp-prev-${idx}`}>
                    <div className='fw-semibold'>{exp.role}</div>
                    <div className='meta'>
                      {exp.company} {exp.duration ? `• ${exp.duration}` : ""}
                    </div>
                    <div className='text-sm'>{exp.summary}</div>
                  </div>
                ))}
              </div>
            )}
            {Array.isArray(resume.data.projects) && resume.data.projects.length > 0 && (
              <div className='section'>
                <div className='section-title'>Projects</div>
                {resume.data.projects.map((proj, idx) => (
                  <div className='item' key={`proj-prev-${idx}`}>
                    <div className='fw-semibold'>
                      {proj.name} {proj.link && <span className='meta'>• {proj.link}</span>}
                    </div>
                    <div className='text-sm'>{proj.summary}</div>
                  </div>
                ))}
              </div>
            )}
            {resume.data.skills && (
              <div className='section'>
                <div className='section-title'>Skills</div>
                <div className='text-sm'>{resume.data.skills}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ResumeBuilderPage;
