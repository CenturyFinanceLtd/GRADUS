/*
  Gallery Controller
  - Manage gallery items (create, list, delete)
*/
const asyncHandler = require('express-async-handler');
const GalleryItem = require('../models/GalleryItem');

// @desc    Get all gallery items (public)
// @route   GET /api/gallery
// @access  Public
exports.getGalleryItems = asyncHandler(async (req, res) => {
    const { category, limit } = req.query;

    const filter = { isActive: true };
    if (category) {
        filter.category = category;
    }

    let query = GalleryItem.find(filter).sort('-createdAt');

    if (limit) {
        query = query.limit(parseInt(limit, 10));
    }

    const items = await query;

    res.status(200).json({
        success: true,
        count: items.length,
        items,
    });
});

// @desc    Create a gallery item
// @route   POST /api/admin/gallery
// @access  Private (Admin)
exports.createGalleryItem = asyncHandler(async (req, res) => {
    const { title, category, imageUrl, publicId } = req.body;

    const newItem = await GalleryItem.create({
        title,
        category,
        imageUrl,
        publicId,
    });

    res.status(201).json({
        success: true,
        item: newItem,
    });
});

// @desc    Delete a gallery item
// @route   DELETE /api/admin/gallery/:id
// @access  Private (Admin)
exports.deleteGalleryItem = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const item = await GalleryItem.findByIdAndDelete(id);

    if (!item) {
        res.status(404);
        throw new Error('No gallery item found with that ID');
    }

    // TODO: If using cloudinary, might want to trigger deletion there too in a real production app.
    // For now, we just remove the reference.

    res.status(200).json({
        success: true,
        message: 'Gallery item deleted',
    });
});
