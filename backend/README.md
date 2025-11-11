# Backend (API)

Overview
- Node.js + Express API that powers authentication, course/catalog content, blogs, analytics, chatbot, and contact inquiries.
- Uses MongoDB via Mongoose. Emails are sent via SMTP (mockable in non-live mode).

Directory Structure
- `src/server.js` — HTTP server entry. Connects DB, seeds default content, starts app.
- `src/app.js` — Express app configuration: middleware, CORS, static, and route mounts.
- `src/config/` — Environment (`env.js`) and Mongo connection (`db.js`).
- `src/routes/` — Route definitions grouped by feature (auth, admin, blogs, courses, analytics, chatbot, contact, users).
- `src/controllers/` — Request handlers implementing business logic.
- `src/models/` — Mongoose models (User, AdminUser, Course, Blog, etc.).
- `src/middleware/` — Cross-cutting middleware (auth, admin auth, validation, errors, uploads).
- `src/utils/` — Utilities (JWT, email, OTP, slugify, data bootstrapper).
- `src/data/` — Static data for seeding and configuration (roles, page definitions, chatbot knowledge, default course content).

Request Lifecycle
- Request enters `src/app.js`, passes through body parsing, cookies, and (dev) CORS.
- Routes under `/api/*` delegate to controllers in `src/controllers`.
- Authenticated routes use `authMiddleware` or `adminAuthMiddleware`.
- Errors bubble to `errorMiddleware` which returns consistent JSON.

Key Modules
- `src/config/env.js` — Normalizes all env vars, defines defaults, warns on missing keys.
- `src/middleware/errorMiddleware.js` — 404 handler and centralized error responses.
- `src/middleware/authMiddleware.js` — JWT-based user protection helpers.
- `src/middleware/adminAuthMiddleware.js` — JWT protection + role checks for admin.
- `src/utils/email.js` — Nodemailer wrapper, OTP + admin approval email templates.
- `src/utils/ensureCourseContent.js` — One-time seeding of Course and CoursePage.

Environment Variables
- `MONGODB_URI` — Mongo connection string.
- `JWT_SECRET`, `JWT_EXPIRES_IN` — JWT signing secret and lifetime.
- `SESSION_SECRET` — Express session secret (required in production).
- `CLIENT_URLS` — Comma-separated list of allowed origins for CORS/cookies.
- `SERVER_PUBLIC_URL` — Public base URL for the API.
- SMTP: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `EMAIL_DELIVERY_MODE`.
- Admin: `ADMIN_APPROVER_EMAIL`, `ADMIN_PORTAL_NAME`, optional `ADMIN_API_PUBLIC_BASE_URL`.
- Cloudinary: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_TESTIMONIALS_FOLDER`, `CLOUDINARY_COURSE_IMAGES_FOLDER`, `CLOUDINARY_BLOG_IMAGES_FOLDER`, `CLOUDINARY_BANNER_IMAGES_FOLDER`.

Run Locally
1. `cd backend && npm install`
2. Set `backend/.env` with required variables (see above). At minimum: `MONGODB_URI`, `JWT_SECRET`.
3. `npm run dev` (or `node src/server.js`) — default port `5000`.
4. Health check: GET `http://localhost:5000/api/health`.

Notes
- In production, let your reverse proxy (e.g., Nginx/Cloudflare) set CORS headers. The app enables CORS only in non-production.
- Blog featured images upload to Cloudinary (see `CLOUDINARY_*` vars). The legacy `/blog-images` static path remains available to serve older, disk-based assets.
