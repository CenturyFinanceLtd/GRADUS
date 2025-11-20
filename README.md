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

Live Classrooms (WebRTC MVP)
- Backend exposes a new `/api/live` namespace (see `backend/src/live/*`) with REST helpers plus an in-process WebSocket signaling gateway. Configure `LIVE_SIGNALING_PATH` and `LIVE_WEBRTC_ICE_SERVERS` inside `backend/.env` before running in production.
- Admin portal ships with a dedicated instructor console under `/live/classes` (files in `admin/src/live`). Instructors can schedule sessions, join a stage, and share the attendee link.
- The public site now provides a student experience at `/live/:sessionId` (see `frontend/src/live`). Students must be signed in to join a class; their browser negotiates WebRTC streams directly with the instructor via the new signaling server.
- All media routing is peer-to-peer (no third-party SFU/SaaS). Ensure your deployment provides reachable ICE/STUN/TURN servers if students/instructors are on different networks. By default the ICE server list is empty to honor the “no third-party integration” requirement.

Production Notes
- Serve `frontend/dist` and `admin/dist` behind Nginx (SPA settings).
- Proxy API traffic to the backend (default port `5000`).
- Prefer setting CORS at the reverse proxy; the API enables CORS only in non-production.
