# Frontend (Public Site)

Overview
- React 18 app built with Vite serving the Gradus public website: landing pages, courses, blogs, and user account flows.

Directory Structure
- `src/main.jsx` — App entry; mounts React and loads global/vendor styles.
- `src/App.jsx` — Central route configuration and global providers/widgets.
- `src/pages/` — Page-level components mapped to routes.
- `src/components/` — Reusable UI components and sections.
- `src/context/AuthContext.jsx` — Stores user + token and exposes auth helpers.
- `src/services/` — API client and feature-specific service wrappers.
- `src/seo/` — Page meta helpers.
- `src/styles/` — Local styles (global styles in `src/globals.css`).

API Client
- `src/services/apiClient.js` resolves the base URL from Vite env (`VITE_API_BASE_URL`).
- Falls back to `http://localhost:5000/api` on localhost, or `https://api.gradusindia.in/api` otherwise.

Environment
- Create `.env.local` (dev) or `.env.production` with: `VITE_API_BASE_URL`.

Run Locally
1. `cd frontend && npm install`
2. `npm run dev` — starts Vite dev server (default `5173`).
3. Configure `backend` to allow CORS from `http://localhost:5173`.

Build
- `npm run build` produces static assets under `dist/` for deployment.
