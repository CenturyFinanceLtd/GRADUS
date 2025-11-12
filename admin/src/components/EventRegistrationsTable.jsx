import { useEffect, useMemo, useState } from "react";
import useAuth from "../hook/useAuth";
import { fetchContactInquiries } from "../services/adminInquiries";

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

const EventRegistrationsTable = () => {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");

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
        const response = await fetchContactInquiries({
          token,
          region: "events",
        });

        if (isActive) {
          setItems(response?.items || []);
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
  }, [token]);

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
        item.institution,
        item.course,
        item.message,
      ];

      return fields.some((field) =>
        typeof field === "string" ? field.toLowerCase().includes(term) : false
      );
    });
  }, [items, search]);

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
          <div className='ms-auto'>
            <input
              type='search'
              className='form-control'
              placeholder='Search by name, email, or course'
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              style={{ minWidth: 240 }}
            />
          </div>
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
        ) : filteredItems.length === 0 ? (
          <div className='alert alert-info mb-0'>
            No event registrations found yet.
          </div>
        ) : (
          <div className='table-responsive'>
            <table className='table align-middle'>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>State</th>
                  <th>Institute</th>
                  <th>Event</th>
                  <th>Message</th>
                  <th>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const derivedState = item.state || extractStateFromMessage(item.message);
                  const cleanedMessage = stripStateFromMessage(item.message);

                  return (
                    <tr key={item.id}>
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
                      <td>{derivedState || "—"}</td>
                      <td>{item.institution || "—"}</td>
                      <td>{item.course}</td>
                      <td style={{ maxWidth: 260 }}>
                        <div className='text-break'>{cleanedMessage}</div>
                      </td>
                      <td>{formatDateTime(item.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventRegistrationsTable;
