import { useEffect, useMemo, useState } from "react";
import useAuth from "../hook/useAuth";
import apiClient from "../services/apiClient";

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

const LandingPageRegistrationsTable = () => {
    const { token } = useAuth();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState("");
    const [pageFilter, setPageFilter] = useState("all");

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
                const response = await apiClient("/admin/landing-pages/registrations", { token });

                if (isActive) {
                    const nextItems = response?.items || [];
                    setItems(nextItems);
                }
            } catch (err) {
                if (isActive) {
                    setError(err?.message || "Failed to load registrations");
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

    const pageOptions = useMemo(() => {
        const names = new Set();
        items.forEach((item) => {
            if (item.landing_pages?.title) {
                names.add(item.landing_pages.title);
            } else if (item.program_name) {
                names.add(item.program_name);
            }
        });
        return Array.from(names).sort((a, b) => a.localeCompare(b));
    }, [items]);

    const filteredItems = useMemo(() => {
        const term = search.trim().toLowerCase();

        const byEvent =
            pageFilter === "all"
                ? items
                : items.filter((item) => {
                    const title = item.landing_pages?.title || item.program_name;
                    return typeof title === "string" && title.toLowerCase() === pageFilter.toLowerCase();
                });

        const bySearch = term
            ? byEvent.filter((item) => {
                const fields = [
                    item.name,
                    item.email,
                    item.phone,
                    item.state,
                    item.qualification,
                    item.program_name,
                    item.landing_pages?.title
                ];

                return fields.some((field) => (typeof field === "string" ? field.toLowerCase().includes(term) : false));
            })
            : byEvent;

        return bySearch;
    }, [items, search, pageFilter]);

    const totalRegistrations = items.length;

    return (
        <div className='card h-100 p-0 radius-12 overflow-hidden'>
            <div className='card-header border-bottom bg-base py-16 px-24'>
                <div className='d-flex flex-wrap gap-12 justify-content-between align-items-center'>
                    <div>
                        <h6 className='text-lg fw-semibold mb-1'>Landing Page Registrations</h6>
                        <p className='text-sm text-secondary-light mb-0'>
                            Total: {totalRegistrations}
                        </p>
                    </div>
                    <div className='d-flex flex-wrap gap-12 ms-auto align-items-center'>
                        <input
                            type='search'
                            className='form-control form-control-sm'
                            placeholder='Search...'
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            style={{ maxWidth: 200 }}
                        />
                        <select
                            className='form-select form-select-sm'
                            value={pageFilter}
                            onChange={(event) => setPageFilter(event.target.value)}
                            style={{ maxWidth: 200 }}
                            title='Filter by Landing Page'
                        >
                            <option value='all'>All Pages</option>
                            {pageOptions.map((name) => (
                                <option key={name} value={name}>
                                    {name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>
            <div className='card-body p-24'>
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
                        No registration data found.
                    </div>
                ) : (
                    <div className='table-responsive'>
                        <table className='table table-borderless align-middle mb-0'>
                            <thead>
                                <tr>
                                    <th scope="col">Name</th>
                                    <th scope="col">Email</th>
                                    <th scope="col">Phone</th>
                                    <th scope="col">State</th>
                                    <th scope="col">Source Page</th>
                                    <th scope="col">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredItems.map((item) => (
                                    <tr key={item.id}>
                                        <td>
                                            <div className="d-flex align-items-center gap-10">
                                                <span className="h6 mb-0 fw-medium text-15">{item.name || "—"}</span>
                                            </div>
                                        </td>
                                        <td>{item.email || "—"}</td>
                                        <td>{item.phone || "—"}</td>
                                        <td>{item.state || "—"}</td>
                                        <td>
                                            {item.landing_pages?.title ? (
                                                <span className="badge bg-primary-subtle text-primary fw-medium px-4">{item.landing_pages.title}</span>
                                            ) : (
                                                <span className="text-muted">{item.program_name || "Unknown"}</span>
                                            )}
                                        </td>
                                        <td>{formatDateTime(item.created_at)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LandingPageRegistrationsTable;
