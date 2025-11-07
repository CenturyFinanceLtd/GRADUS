/*
  Upload controller (Cloudinary)
  - Handles admin image uploads and returns hosted URLs
*/
const asyncHandler = require('express-async-handler');
const { cloudinary, courseImagesFolder } = require('../config/cloudinary');

const uploadImageBuffer = (buffer, { folder }) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: 'image', folder, overwrite: false },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(buffer);
  });

// POST /api/admin/uploads/image (multipart/form-data, field name: file)
const uploadCourseImage = asyncHandler(async (req, res) => {
  if (!req.file || !req.file.buffer) {
    res.status(400);
    throw new Error('Image file is required');
  }

  const folder = courseImagesFolder;
  const result = await uploadImageBuffer(req.file.buffer, { folder });

  res.status(201).json({
    ok: true,
    item: {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      folder: result.folder,
    },
  });
});

module.exports = {
  uploadCourseImage,
};

