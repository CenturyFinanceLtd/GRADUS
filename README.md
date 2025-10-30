# GRADUS Platform

Overview
- Monorepo containing three coordinated web apps for the Gradus platform:
  - `frontend/` — Public site (React + Vite)
  - `admin/` — Admin dashboard (React + Vite)
  - `backend/` — API server (Node.js + Express + MongoDB)

Repository Layout
- `admin/` — Admin portal sources and build output.
- `backend/` — Express API sources and configuration.
- `frontend/` — Public site sources and build output.
- `scripts/` — Optional infra/automation helpers.
- `shared/` — Shared assets/data.

Quick Start (local)
- Backend
  - `cd backend && npm install`
  - Add `backend/.env` with at least `MONGODB_URI` and `JWT_SECRET`.
  - `npm run dev` (server on `http://localhost:5000`).
- Frontend
  - `cd frontend && npm install`
  - Add `.env.local` with `VITE_API_BASE_URL=http://localhost:5000/api`.
  - `npm run dev` (site on `http://localhost:5173`).
- Admin
  - `cd admin && npm install`
  - Add `.env.local` with `VITE_API_BASE_URL=http://localhost:5000/api`.
  - `npm run dev` (dashboard on `http://localhost:5174`).

Documentation
- Backend: `backend/README.md`
- Frontend: `frontend/README.md`
- Admin: `admin/README.md`

Production Notes
- Serve `frontend/dist` and `admin/dist` behind Nginx (SPA settings).
- Proxy API traffic to the backend (default port `5000`).
- Prefer setting CORS at the reverse proxy; the API enables CORS only in non-production.

