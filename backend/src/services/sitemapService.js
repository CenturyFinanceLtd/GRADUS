const fs = require('fs').promises;
const path = require('path');
const config = require('../config/env');

const SITEMAP_DIR = path.join(__dirname, '../../data/sitemaps');
const SITEMAP_FILE = 'sitemap.blogs.xml'; // Dedicated sitemap for blogs

// Helper to ensure directory exists
const ensureDir = async () => {
    try {
        await fs.access(SITEMAP_DIR);
    } catch {
        await fs.mkdir(SITEMAP_DIR, { recursive: true });
    }
};

const getSitemapPath = () => path.join(SITEMAP_DIR, SITEMAP_FILE);

const getDefaultSitemap = () => `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://gradusindia.in/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;

const getSitemapContent = async () => {
    await ensureDir();
    const filePath = getSitemapPath();
    try {
        return await fs.readFile(filePath, 'utf-8');
    } catch (error) {
        if (error.code === 'ENOENT') {
            const defaultContent = getDefaultSitemap();
            await fs.writeFile(filePath, defaultContent);
            return defaultContent;
        }
        throw error;
    }
};

const saveSitemapContent = async (content) => {
    await ensureDir();
    const filePath = getSitemapPath();
    await fs.writeFile(filePath, content, 'utf-8');
};

// Base URL handling
// Ideally fetches from config, but defaults to production URL for SEO
const getBaseUrl = () => {
    if (config.nodeEnv === 'production') {
        return 'https://gradusindia.in';
    }
    return config.ClientUrl || 'https://gradusindia.in';
};

const formatUrlEntry = (slug) => {
    const baseUrl = getBaseUrl();
    // Ensure no double slashes if base url has trailing slash
    const url = `${baseUrl.replace(/\/$/, '')}/blog/${slug}`;
    const date = new Date().toISOString().split('T')[0];

    return `  <url>
    <loc>${url}</loc>
    <lastmod>${date}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
};

const addBlogToSitemap = async (slug) => {
    if (!slug) return;

    try {
        let content = await getSitemapContent();
        const baseUrl = getBaseUrl();
        const urlPattern = new RegExp(`<loc>${baseUrl.replace(/\/$/, '')}/blog/${slug}</loc>`);

        // If already exists, we might want to update lastmod, but simplest is skip or replace
        if (urlPattern.test(content)) {
            // Update existing entry (optional, but good for SEO)
            // For simplicity, we remove and re-add to update timestamp
            await removeBlogFromSitemap(slug);
            content = await getSitemapContent(); // Refresh content
        }

        // Insert before </urlset>
        const closingTag = '</urlset>';
        const entry = formatUrlEntry(slug);

        if (content.includes(closingTag)) {
            content = content.replace(closingTag, `${entry}\n${closingTag}`);
            await saveSitemapContent(content);
            console.log(`[sitemap] Added blog/${slug}`);
        }
    } catch (error) {
        console.warn('[sitemap] Failed to add blog to sitemap:', error);
    }
};

const removeBlogFromSitemap = async (slug) => {
    if (!slug) return;

    try {
        let content = await getSitemapContent();
        const baseUrl = getBaseUrl();
        // Regex to match the full <url> block containing the specific loc
        // <url>\s*<loc>...slug</loc>... </url>
        // We need to be careful with regex traversing lines. 
        // [\s\S]*? is non-greedy match for any char.

        const urlToMatch = `${baseUrl.replace(/\/$/, '')}/blog/${slug}`;
        const regex = new RegExp(`\\s*<url>[\\s\\S]*?<loc>${urlToMatch}<\\/loc>[\\s\\S]*?<\\/url>`, 'g');

        if (regex.test(content)) {
            content = content.replace(regex, '');
            // Clean up extra newlines if any left behind could be nice but not strictly required for XML validity
            await saveSitemapContent(content);
            console.log(`[sitemap] Removed blog/${slug}`);
        }
    } catch (error) {
        console.warn('[sitemap] Failed to remove blog from sitemap:', error);
    }
};

const updateBlogInSitemap = async (oldSlug, newSlug) => {
    if (oldSlug !== newSlug) {
        await removeBlogFromSitemap(oldSlug);
    }
    await addBlogToSitemap(newSlug);
};

module.exports = {
    addBlogToSitemap,
    removeBlogFromSitemap,
    updateBlogInSitemap
};
