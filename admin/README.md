# Admin (Operations Dashboard)

Overview
- React 18 app built with Vite providing the internal admin dashboard for managing courses, blogs, analytics, users, and more.

Directory Structure
- `src/main.jsx` — App entry; loads vendor styles and mounts React.
- `src/App.jsx` — Route configuration for all admin pages.
- `src/context/AuthContext.jsx` — Persists admin token/profile and loads permissions.
- `src/services/` — `apiClient` and feature APIs (auth, blogs, permissions, courses, etc.).
- `src/pages/` — Page components rendered by routes.
- `src/components/` — UI components used across pages.
- `src/config/env.js` — Reads `VITE_*` env vars and exports `API_BASE_URL`.

Permissions
- Admin pages are gated by permission keys. See `backend/src/data/adminPageDefinitions.js` and the permissions service.

Environment
- `.env.local` (dev) or `.env.production` should define:
  - `VITE_API_BASE_URL` (e.g., `http://localhost:5000/api` or production API URL)
  - `VITE_PUBLIC_SITE_URL` (used for linking to public site)

Run Locally
1. `cd admin && npm install`
2. `npm run dev` — starts Vite dev server (default `5174`).
3. Ensure the backend allows CORS from the admin origin.

Build
- `npm run build` produces static assets under `dist/` for deployment.
