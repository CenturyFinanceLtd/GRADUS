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
// @desc    Get all available sitemaps
// @route   GET /api/admin/sitemaps
// @access  Private/Admin
const listSitemaps = asyncHandler(async (req, res) => {
    console.log('List Sitemaps Request Received');
    await ensureDir();
    console.log('Sitemap Dir ensured');
    let files = await fs.readdir(SITEMAP_DIR);
    console.log('Files in dir:', files);
    let xmlFiles = files.filter(file => file.endsWith('.xml'));

    // Check for missing sitemaps and sync from frontend
    try {
        const frontendPublicDir = path.join(__dirname, '../../../frontend/public');
        const sourceFiles = await fs.readdir(frontendPublicDir);
        const sourceXmlFiles = sourceFiles.filter(file => file.startsWith('sitemap') && file.endsWith('.xml'));

        for (const file of sourceXmlFiles) {
            const targetPath = path.join(SITEMAP_DIR, file);
            try {
                // Check if file exists in target
                await fs.access(targetPath);
            } catch {
                // File doesn't exist, copy it
                console.log(`Syncing missing sitemap: ${file}`);
                await fs.copyFile(
                    path.join(frontendPublicDir, file),
                    targetPath
                );
            }
        }

        // Refresh file list after sync
        files = await fs.readdir(SITEMAP_DIR);
        xmlFiles = files.filter(file => file.endsWith('.xml'));
    } catch (error) {
        console.error('Failed to sync sitemaps:', error);
    }

    // Fallback: Create a default sitemap.xml if still empty
    if (xmlFiles.length === 0) {
        try {
            const defaultContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://gradusindia.in/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;
            await fs.writeFile(path.join(SITEMAP_DIR, 'sitemap.xml'), defaultContent);
            xmlFiles = ['sitemap.xml'];
        } catch (writeError) {
            console.error('Failed to create default sitemap:', writeError);
        }
    }

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
        // Prevent caching to ensure updates are seen immediately
        res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.header('Pragma', 'no-cache');
        res.header('Expires', '0');
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
