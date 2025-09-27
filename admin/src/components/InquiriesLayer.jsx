import { useEffect, useMemo, useState } from "react";
import useAuth from "../hook/useAuth";
import { fetchContactInquiries } from "../services/adminInquiries";

const formatDateTime = (value) => {
  if (!value) {
    return "—";
  }

  try {
    return new Date(value).toLocaleString();
  } catch (error) {
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

  useEffect(() => {
    let isCancelled = false;

    if (!token) {
      setInquiries([]);
      setLoading(false);
      return undefined;
    }

    const loadInquiries = async () => {
      setLoading(true);
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
