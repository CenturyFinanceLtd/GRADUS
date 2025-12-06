import { useEffect, useState } from "react";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import useAuth from "../hook/useAuth";
import { fetchCallbackRequests } from "../services/adminCallbackRequests";

const CallbackRequestPage = () => {
    const { token } = useAuth();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadRequests = async () => {
            setLoading(true);
            try {
                const data = await fetchCallbackRequests({ token });
                setRequests(data || []);
            } catch (err) {
                setError(err.message || "Failed to load callback requests");
            } finally {
                setLoading(false);
            }
        };

        if (token) {
            loadRequests();
        }
    }, [token]);

    return (
        <MasterLayout>
            <Breadcrumb title="Callback Requests" />
            <div className="card p-24">
                <h5 className="mb-24">Callback Requests</h5>

                {error && <div className="alert alert-danger">{error}</div>}

                {loading ? (
                    <div className='d-flex justify-content-center py-64'>
                        <div className='spinner-border text-primary' role='status'>
                            <span className='visually-hidden'>Loading...</span>
                        </div>
                    </div>
                ) : requests.length === 0 ? (
                    <div className="alert alert-info">No callback requests found.</div>
                ) : (
                    <div className="table-responsive">
                        <table className="table align-middle">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Phone</th>
                                    <th>Date</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {requests.map((req) => (
                                    <tr key={req._id}>
                                        <td>{req.name}</td>
                                        <td>{req.email}</td>
                                        <td>{req.phone}</td>
                                        <td>{new Date(req.createdAt).toLocaleString()}</td>
                                        <td>
                                            <span className={`badge bg-${req.status === 'Pending' ? 'warning' : 'success'}-subtle text-${req.status === 'Pending' ? 'warning' : 'success'}`}>
                                                {req.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </MasterLayout>
    );
};

export default CallbackRequestPage;
