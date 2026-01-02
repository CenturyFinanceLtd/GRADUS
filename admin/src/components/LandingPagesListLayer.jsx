import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { toast } from 'react-toastify';
import apiClient from '../services/apiClient';
import { useAuthContext } from '../context/AuthContext';

const LandingPagesListLayer = () => {
    const [pages, setPages] = useState([]);
    const [loading, setLoading] = useState(true);
    const { token } = useAuthContext();

    const fetchPages = async () => {
        try {
            const data = await apiClient('/admin/landing-pages', { token });
            if (!data) {
                setPages([]);
            } else {
                setPages(data);
            }
            setLoading(false);
        } catch (error) {
            // If it's a 404 or empty, just show empty state without error toast
            if (error.status === 404) {
                setPages([]);
            } else {
                console.error('Error fetching landing pages:', error);
                toast.error('Failed to fetch landing pages');
            }
            setLoading(false);
        }
    };

    const deletePage = async (id) => {
        if (!window.confirm('Are you sure you want to delete this page?')) return;
        try {
            await apiClient(`/admin/landing-pages/${id}`, { method: 'DELETE', token });
            toast.success('Landing page deleted successfully');
            setPages(pages.filter(page => page._id !== id));
        } catch (error) {
            console.error('Error deleting landing page:', error);
            toast.error('Failed to delete landing page');
        }
    };

    useEffect(() => {
        fetchPages();
    }, []);

    if (loading) return <div className="p-24">Loading...</div>;

    return (
        <section className="landing-pages-list-layer">
            <div className="card h-100 p-0 radius-12 overflow-hidden">
                <div className="card-header border-bottom bg-base py-16 px-24 d-flex align-items-center justify-content-between">
                    <h6 className="text-lg fw-semibold mb-0">Landing Pages List</h6>
                    <Link to="/add-landing-page" className="btn btn-primary-600 radius-8 px-20 py-11 d-flex align-items-center gap-2">
                        <Icon icon="ph:plus" className="text-xl" />
                        Create New
                    </Link>
                </div>
                <div className="card-body p-24">
                    <div className="table-responsive">
                        <table className="table table-borderless">
                            <thead>
                                <tr>
                                    <th>Working URL</th>
                                    <th>Created At</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pages.length === 0 ? (
                                    <tr>
                                        <td colSpan="3" className="text-center">No landing pages found.</td>
                                    </tr>
                                ) : (
                                    pages.map(page => {
                                        const publicUrl = `http://localhost:5173/events/masterclass/${page._id}`;
                                        return (
                                            <tr key={page._id}>
                                                <td>
                                                    <a href={publicUrl} target="_blank" rel="noreferrer" className="h6 mb-0 fw-medium text-info-600">
                                                        {publicUrl}
                                                    </a>
                                                </td>
                                                <td>
                                                    <span className="h6 mb-0 fw-medium text-gray-300">{new Date(page.createdAt).toLocaleDateString()}</span>
                                                </td>
                                                <td>
                                                    <div className="d-flex align-items-center gap-10">
                                                        <Link to={`/edit-landing-page/${page.slug}`} className="remove-item-btn bg-info-50 text-info-600 bg-hover-info-600 text-hover-white w-40 h-40 flex-center text-xl rounded-circle">
                                                            <Icon icon="ph:pencil-simple" />
                                                        </Link>
                                                        <button onClick={() => deletePage(page._id)} className="remove-item-btn bg-danger-50 text-danger-600 bg-hover-danger-600 text-hover-white w-40 h-40 flex-center text-xl rounded-circle">
                                                            <Icon icon="ph:trash" />
                                                        </button>
                                                        <a href={publicUrl} target="_blank" rel="noreferrer" className="remove-item-btn bg-success-50 text-success-600 bg-hover-success-600 text-hover-white w-40 h-40 flex-center text-xl rounded-circle">
                                                            <Icon icon="ph:eye" />
                                                        </a>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default LandingPagesListLayer;
