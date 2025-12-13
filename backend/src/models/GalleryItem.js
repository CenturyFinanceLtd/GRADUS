const mongoose = require('mongoose');

const galleryItemSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            trim: true,
            maxlength: [100, 'Title cannot exceed 100 characters'],
        },
        category: {
            type: String,
            required: [true, 'Category is required'],
            enum: ['Team', 'University', 'Tutors', 'Events', 'Other'],
            default: 'Team',
            trim: true,
        },
        imageUrl: {
            type: String,
            required: [true, 'Image URL is required'],
        },
        publicId: {
            type: String, // For Cloudinary or similar service
            trim: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

// Index for faster queries by category
galleryItemSchema.index({ category: 1, isActive: 1 });

module.exports = mongoose.model('GalleryItem', galleryItemSchema);
