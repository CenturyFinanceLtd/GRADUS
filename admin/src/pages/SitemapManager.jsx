import React, { useEffect, useState } from 'react';
import useAuth from '../hook/useAuth';
import { fetchSitemaps, fetchSitemapContent, updateSitemapContent } from '../services/adminSitemaps';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const SitemapManager = () => {
    const { token } = useAuth();
    const [sitemaps, setSitemaps] = useState([]);
    const [selectedSitemap, setSelectedSitemap] = useState('');
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (token) {
            loadSitemaps();
        }
    }, [token]);

    useEffect(() => {
        if (selectedSitemap && token) {
            loadSitemapContent(selectedSitemap);
        } else {
            setContent('');
        }
    }, [selectedSitemap, token]);

    const loadSitemaps = async () => {
        try {
            const data = await fetchSitemaps({ token });
            setSitemaps(data);
            if (data.length > 0) {
                setSelectedSitemap(data[0]);
            }
        } catch (error) {
            console.error('Failed to fetch sitemaps:', error);
            toast.error('Failed to load sitemap list');
        }
    };

    const loadSitemapContent = async (filename) => {
        setLoading(true);
        try {
            const data = await fetchSitemapContent({ filename, token });
            setContent(data.content);
        } catch (error) {
            console.error('Failed to fetch sitemap content:', error);
            toast.error('Failed to load sitemap content');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!selectedSitemap) return;

        setSaving(true);
        try {
            await updateSitemapContent({ filename: selectedSitemap, content, token });
            toast.success('Sitemap updated successfully');
        } catch (error) {
            console.error('Failed to update sitemap:', error);
            toast.error('Failed to save sitemap');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="dashboard-main-body">
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
                <h6 className="fw-semibold mb-0">Sitemap Manager</h6>
                <ul className="d-flex align-items-center gap-2">
                    <li className="fw-medium">
                        <a href="/" className="d-flex align-items-center gap-1 hover-text-primary">
                            <i className="ph ph-house" />
                            Dashboard /
                        </a>
                    </li>
                    <li className="fw-medium">Sitemaps</li>
                </ul>
            </div>

            <div className="card h-100 p-0 radius-12">
                <div className="card-body p-24">
                    <div className="row gy-4">
                        <div className="col-md-4">
                            <label className="form-label fw-semibold text-primary-light text-sm mb-8">Select Sitemap</label>
                            <select
                                className="form-control radius-8"
                                value={selectedSitemap}
                                onChange={(e) => setSelectedSitemap(e.target.value)}
                            >
                                {sitemaps.map(file => (
                                    <option key={file} value={file}>{file}</option>
                                ))}
                            </select>
                        </div>

                        <div className="col-12">
                            <label className="form-label fw-semibold text-primary-light text-sm mb-8">XML Content</label>
                            <textarea
                                className="form-control radius-8"
                                style={{ fontFamily: 'monospace', minHeight: '500px', whiteSpace: 'pre' }}
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                disabled={loading}
                            />
                        </div>

                        <div className="col-12 text-end">
                            <button
                                className="btn btn-primary-600 radius-8 px-20 py-11 d-inline-flex align-items-center gap-2"
                                onClick={handleSave}
                                disabled={loading || saving || !selectedSitemap}
                            >
                                {saving ? 'Saving...' : 'Save Changes'}
                                <i className="ph ph-floppy-disk" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <ToastContainer />
        </div>
    );
};

export default SitemapManager;
