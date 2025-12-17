const fs = require('fs').promises;
const path = require('path');
const asyncHandler = require('express-async-handler');

const SITEMAP_DIR = path.join(__dirname, '../../data/sitemaps');

// Helper to ensure directory exists
const ensureDir = async () => {
    try {
        await fs.access(SITEMAP_DIR);
    } catch {
        await fs.mkdir(SITEMAP_DIR, { recursive: true });
    }
};

// @desc    Get all available sitemaps
// @route   GET /api/admin/sitemaps
// @access  Private/Admin
const listSitemaps = asyncHandler(async (req, res) => {
    await ensureDir();
    const files = await fs.readdir(SITEMAP_DIR);
    const xmlFiles = files.filter(file => file.endsWith('.xml'));
    res.json(xmlFiles);
});

// @desc    Get sitemap content
// @route   GET /api/admin/sitemaps/:filename
// @access  Private/Admin
const getSitemapContent = asyncHandler(async (req, res) => {
    const { filename } = req.params;

    // Basic security check to prevent directory traversal
    if (filename.includes('..') || !filename.endsWith('.xml')) {
        res.status(400);
        throw new Error('Invalid filename');
    }

    const filePath = path.join(SITEMAP_DIR, filename);

    try {
        const content = await fs.readFile(filePath, 'utf-8');
        res.json({ filename, content });
    } catch (error) {
        if (error.code === 'ENOENT') {
            res.status(404);
            throw new Error('Sitemap not found');
        }
        throw error;
    }
});

// @desc    Update sitemap content
// @route   PUT /api/admin/sitemaps/:filename
// @access  Private/Admin
const updateSitemapContent = asyncHandler(async (req, res) => {
    const { filename } = req.params;
    const { content } = req.body;

    if (filename.includes('..') || !filename.endsWith('.xml')) {
        res.status(400);
        throw new Error('Invalid filename');
    }

    if (!content) {
        res.status(400);
        throw new Error('Content is required');
    }

    const filePath = path.join(SITEMAP_DIR, filename);
    await ensureDir();
    await fs.writeFile(filePath, content, 'utf-8');

    res.json({ message: 'Sitemap updated successfully', filename });
});

// @desc    Serve sitemap (Public)
// @route   GET /:filename
// @access  Public
const serveSitemap = asyncHandler(async (req, res) => {
    const { filename } = req.params;

    // Allow serving only specific sitemap patterns
    if (filename.includes('..') || !filename.startsWith('sitemap') || !filename.endsWith('.xml')) {
        return res.status(404).send('Not found');
    }

    const filePath = path.join(SITEMAP_DIR, filename);

    try {
        const content = await fs.readFile(filePath, 'utf-8');
        res.header('Content-Type', 'application/xml');
        res.send(content);
    } catch (error) {
        return res.status(404).send('Not found');
    }
});

module.exports = {
    listSitemaps,
    getSitemapContent,
    updateSitemapContent,
    serveSitemap
};
