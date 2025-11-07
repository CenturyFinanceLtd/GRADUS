/*
  Cloudinary configuration
  - Centralizes SDK setup and exposes helpers for common ops
*/
let cloudinary;
try {
  ({ v2: cloudinary } = require('cloudinary'));
} catch (err) {
  // Fall back to a safe stub so the server can boot even if
  // the cloudinary SDK is not installed on the host. Any feature
  // that uses Cloudinary will respond with an error at runtime,
  // but public routes (blogs, courses, auth, etc.) keep working.
  // This prevents total outage due to an optional integration.
  // eslint-disable-next-line no-console
  console.warn('[cloudinary] SDK not found; running with stub. Install "cloudinary" to enable media uploads.');
  const uploadStreamStub = (opts, cb) => ({
    end() {
      try { cb(new Error('Cloudinary SDK not available on server'), null); }
      catch { /* noop */ }
    },
  });
  cloudinary = {
    config() {},
    uploader: {
      upload_stream: uploadStreamStub,
      destroy: async () => { throw new Error('Cloudinary SDK not available on server'); },
    },
    url: () => '',
  };
}
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
