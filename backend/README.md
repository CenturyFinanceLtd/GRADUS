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
- `SESSION_SECRET` – Express session secret (required in production).
- `CLIENT_URLS` – Comma-separated list of allowed origins for CORS/cookies.
- `SERVER_PUBLIC_URL` – Public base URL for the API.
- SMTP: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `EMAIL_DELIVERY_MODE`.
- SMTP login overrides (optional): `SMTP_LOGIN_USER` when your login mailbox (e.g., `admin@...`) differs from `SMTP_USER` (e.g., `no-reply@...` alias). Pair with `SMTP_WORKSPACE_IMPERSONATE_EMAIL` to control which Workspace user the service account impersonates for XOAUTH2.
- Per-template senders (optional): `SMTP_FROM_VERIFICATION` (OTP / auth mails) and `SMTP_FROM_REGISTRATION` (event registration confirmations, reminder/join emails). Defaults fall back to `SMTP_FROM`.
- Gmail via Workspace service account (optional): set `SMTP_USE_WORKSPACE_OAUTH=true` to send mail using the Google Workspace service account and add `SMTP_WORKSPACE_SEND_AS` (defaults to `SMTP_USER`). The service account must have domain-wide delegation for the Gmail scope `https://mail.google.com/` so the SMTP XOAUTH2 token is accepted.
- Admin: `ADMIN_APPROVER_EMAIL`, `ADMIN_PORTAL_NAME`, optional `ADMIN_API_PUBLIC_BASE_URL`.
- Admin Gmail access whitelist: `ADMIN_EMAIL_ACCESS_USERS` (comma-separated list of programmer-admin email addresses allowed to view Gmail inboxes in the admin panel).
- Cloudinary: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_TESTIMONIALS_FOLDER`, `CLOUDINARY_COURSE_IMAGES_FOLDER`, `CLOUDINARY_BLOG_IMAGES_FOLDER`, `CLOUDINARY_BANNER_IMAGES_FOLDER`.
- Google Docs/Sheets sync (optional): `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` (use `\n` literals), optional `GOOGLE_DOCS_PARENT_FOLDER_ID` to keep per-event spreadsheets in a specific Drive folder, optional `GOOGLE_SHEETS_SYNC_DELAY_MS` (default 2000ms) to throttle bulk sheet syncs.
- Google Sheets rate limiting (optional): `GOOGLE_SHEETS_MAX_WRITES_PER_MINUTE` (defaults to 45) to throttle append operations and stay under the Sheets API write quota.
- Google Workspace impersonation (optional, Workspace only): `GOOGLE_WORKSPACE_IMPERSONATE_EMAIL` (e.g., `no-reply@yourdomain.com`) when domain-wide delegation is enabled so Docs/Sheets are created under that user.
- Admin Gmail inboxes (optional, Workspace only): `ADMIN_GMAIL_INBOXES` as a comma-separated list of `email[:Display Name]` entries (e.g., `contact@gradusindia.in:Contact Inbox,admin@gradusindia.in:Admin Inbox`). Requires the service account above to be granted Gmail API scopes with domain-wide delegation.

Run Locally
1. `cd backend && npm install`
2. Set `backend/.env` with required variables (see above). At minimum: `MONGODB_URI`, `JWT_SECRET`.
3. `npm run dev` (or `node src/server.js`) — default port `5000`.
4. Health check: GET `http://localhost:5000/api/health`.

Notes
- In production, let your reverse proxy (e.g., Nginx/Cloudflare) set CORS headers. The app enables CORS only in non-production.
- Blog featured images upload to Cloudinary (see `CLOUDINARY_*` vars). The legacy `/blog-images` static path remains available to serve older, disk-based assets.
- When enabling Google Docs/Sheets sync, make sure the service account has the Docs, Sheets, and Drive APIs enabled and that the parent Drive folder is shared with that service account.
- Event registration sync creates a dedicated Google Sheet per event (file name = event title) so marketing teams can share registrant lists independently.
- Each spreadsheet also includes an `Event Details` tab that is auto-populated from MongoDB (title, schedule, CTA, host info, etc.) whenever the event is created or edited, whether via the admin UI or direct Compass edits.
- MongoDB change streams automatically ensure/rename the per-event spreadsheets when events are added or edited directly in the database; deployments without change-stream support can run `npm run ensure-event-sheets` to backfill manually whenever needed.
- Event registration change streams keep each sheet’s registration tab in sync; deleting registrations (even directly in MongoDB Compass) triggers a rebuild so stale rows disappear.
