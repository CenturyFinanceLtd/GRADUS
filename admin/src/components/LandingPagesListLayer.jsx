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
            // Fetch the list first
            const listData = await apiClient('/admin/landing-pages', { token });

            if (!listData || listData.length === 0) {
                setPages([]);
                setLoading(false);
                return;
            }

            // Fetch details for each page to ensure we have hero/mentor data
            // (The List API might be returning partial data if stale)
            const detailsPromises = listData.map(page =>
                apiClient(`/admin/landing-pages/${page.slug}`, { token })
                    .catch(err => {
                        console.warn(`Failed to fetch details for ${page.slug}`, err);
                        return page; // Fallback to list item if detail fetch fails
                    })
            );

            const detailedPages = await Promise.all(detailsPromises);

            setPages(detailedPages.map(p => ({
                _id: p._id || p.id,
                slug: p.slug,
                title: p.title,
                hero: p.hero,
                mentor: p.mentor,
                createdAt: p.createdAt || p.created_at,
                updatedAt: p.updatedAt || p.updated_at,
                isPublished: p.isPublished || p.is_published
            })));

            setLoading(false);

        } catch (error) {
            console.error('Error fetching landing pages:', error);
            // If it's a 404, valid empty state
            if (error.status === 404) {
                setPages([]);
            } else {
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
                                    <th>Masterclass Details</th>
                                    <th>Class Date</th>
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
                                        // Title Fallback: title -> hero.highlight -> slug
                                        const displayTitle = page.title || page.hero?.highlight || page.slug;
                                        // Host Fallback: mentor.name -> hero.mentorName -> "Unknown"
                                        const displayHost = page.mentor?.name || page.hero?.mentorName || "Unknown Host";
                                        // Date Fallback: hero.date + time -> createdAt
                                        const displayDate = page.hero?.date ? `${page.hero.date} ${page.hero?.time || ''}` : new Date(page.createdAt).toLocaleDateString();

                                        const publicUrl = `https://gradusindia.in/events/masterclass/${page._id}`;

                                        return (
                                            <tr key={page._id}>
                                                <td>
                                                    <div className="d-flex flex-column">
                                                        <h6 className="text-md fw-semibold mb-1">{displayTitle}</h6>
                                                        <span className="text-sm text-gray-500">Host: {displayHost}</span>
                                                        <a href={publicUrl} target="_blank" rel="noreferrer" className="text-xs text-info-600 mt-1">
                                                            Visit Page <Icon icon="ph:arrow-square-out" className="ms-1" />
                                                        </a>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className="h6 mb-0 fw-medium text-gray-300">{displayDate}</span>
                                                </td>
                                                <td>
                                                    <div className="d-flex align-items-center gap-2">
                                                        <Link to={`/edit-landing-page/${page.slug}`}
                                                            className="w-32 h-32 d-flex align-items-center justify-content-center text-primary-600 bg-primary-50 rounded-circle bg-hover-primary-600 text-hover-white transition-2"
                                                            title="Edit">
                                                            <Icon icon="ph:pencil-simple" className="text-lg" />
                                                        </Link>
                                                        <button
                                                            onClick={() => deletePage(page.id || page._id)}
                                                            className="w-32 h-32 d-flex align-items-center justify-content-center text-danger-600 bg-danger-50 rounded-circle bg-hover-danger-600 text-hover-white transition-2"
                                                            title="Delete">
                                                            <Icon icon="ph:trash" className="text-lg" />
                                                        </button>
                                                        <a href={publicUrl} target="_blank" rel="noreferrer"
                                                            className="w-32 h-32 d-flex align-items-center justify-content-center text-success-600 bg-success-50 rounded-circle bg-hover-success-600 text-hover-white transition-2"
                                                            title="View Page">
                                                            <Icon icon="ph:eye" className="text-lg" />
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
