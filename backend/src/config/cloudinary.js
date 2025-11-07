/*
  Cloudinary configuration
  - Centralizes SDK setup and exposes helpers for common ops
*/
const { v2: cloudinary } = require('cloudinary');
const config = require('./env');

const {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
  CLOUDINARY_TESTIMONIALS_FOLDER,
  CLOUDINARY_COURSE_IMAGES_FOLDER,
} = process.env;

// Configure from env; do not proceed if missing in production
cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
  secure: true,
});

const defaultTestimonialsFolder = CLOUDINARY_TESTIMONIALS_FOLDER || 'testimonials';
const defaultCourseImagesFolder = CLOUDINARY_COURSE_IMAGES_FOLDER || 'courses';

module.exports = {
  cloudinary,
  testimonialsFolder: defaultTestimonialsFolder,
  courseImagesFolder: defaultCourseImagesFolder,
};
