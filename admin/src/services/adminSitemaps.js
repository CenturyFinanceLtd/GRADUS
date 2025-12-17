import apiClient from './apiClient';

export const fetchSitemaps = ({ token }) =>
    apiClient('/admin/sitemaps', {
        method: 'GET',
        token,
    });

export const fetchSitemapContent = ({ filename, token }) =>
    apiClient('/admin/sitemaps/' + filename, {
        method: 'GET',
        token,
    });

export const updateSitemapContent = ({ filename, content, token }) =>
    apiClient('/admin/sitemaps/' + filename, {
        method: 'PUT',
        data: { content },
        token,
    });

export default {
    fetchSitemaps,
    fetchSitemapContent,
    updateSitemapContent,
};
