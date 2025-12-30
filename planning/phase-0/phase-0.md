# Phase 0 - Scope and UX Baseline

Goal: lock v1 scope, baseline UX flows, and success metrics for the Gradus mobile app.
Status: complete with assumed decisions (see Decision log).

## Inputs used
- Product requirements: `Gradus app.pdf`
- Repo inventory:
  - Mobile app (Expo): `GRADUS-APP/gradus-app`
  - Web frontend: `frontend`
  - Admin web: `admin`
  - Live classes backend: `backend/src/live` + `backend/src/app.js`
  - Supabase edge functions + schema: `supabase/functions`, `supabase/migrations`

## v1 scope (proposed)
In scope:
- Phone number onboarding with OTP and mandatory TOS/Privacy check.
- Guest browsing of masterclasses and free content; auth gate on "Watch now".
- Paid live course enrollment via Razorpay and batch-specific access.
- Live session join window, attendance tracking, late join, and post-session recordings/materials.
- Push/notification scheduling for upcoming sessions.

Out of scope (later phases):
- Admin/instructor creation flows inside the mobile app (already in web admin).
- Full live class creation tooling in mobile (assume web admin).
- Cross-batch access and advanced analytics.

## UX baseline flows
Guest:
- Open app -> browse masterclass listings -> tap "Watch now" -> phone OTP auth -> watch free content.

Registered (free):
- Login via phone OTP -> complete profile (optional) -> dashboard -> browse content -> convert to paid.

Paid:
- Select live course instance (batch) -> Razorpay payment -> enrollment success -> join live session (timed access) -> view recordings/materials after session.

Admin/Instructor (assumed web-only):
- Create and manage masterclasses, sessions, and content via `admin` app.

## Success metrics (v1)
- OTP completion rate (start -> verified).
- Free-content watch rate (guest -> verified -> first watch).
- Free-to-paid conversion within 7/30 days.
- Live session attendance rate and median time attended.
- Recording access rate within 24h.

## Existing project details and reuse notes
- Web app uses Supabase edge functions for most APIs; backend now keeps only live routes
  (see `frontend/src/services/apiClient.js` and `backend/src/app.js`).
- Supabase already stores courses + enrollments in Postgres (`supabase/migrations/20251228140000_create_course_table.sql`,
  `supabase/migrations/20251228143000_adjust_schema.sql`).
- Supabase auth flow is email-based OTP + password today (`supabase/functions/auth-api/index.ts`), not phone OTP.
- Mobile app currently uses legacy API and email/password + Google auth (`GRADUS-APP/gradus-app/app/signin.tsx`,
  `GRADUS-APP/gradus-app/app/signup.tsx`, `GRADUS-APP/gradus-app/services/api.ts`).
- Live classes exist in backend `/api/live` with admin and student web flows
  (`backend/src/live/routes.js`, `admin/src/live`, `frontend/src/live`).
- Masterclass content exists in web + admin (see `frontend/src/pages/*Masterclass*`,
  `admin/src/pages/MasterclassAdminPage.jsx`).
- Razorpay is integrated for web and Supabase edge (`frontend/src/pages/CoursePaymentPage.jsx`,
  `supabase/functions/payment-processing/index.ts`).
- Expo push notification support exists server-side (`backend/src/utils/notifications.js`), but
  the mobile app does not yet collect/store push tokens.

## Requirement mapping (spec -> current state -> action)
- Phone OTP auth -> email OTP/password today -> implement phone OTP flow + SMS provider.
- 3-screen walkthrough -> not present -> add first-run onboarding screens.
- Guest masterclass browsing -> web has masterclasses -> expose in mobile via events/content API.
- Paid live batch enrollment -> web has Razorpay flow -> wire mobile to payment-processing edge function.
- Live session join window + attendance -> backend live routes exist -> integrate mobile join + attendance.
- Recordings/materials -> not exposed in mobile -> add materials access after session end.
- Notifications (24h/1h/10m) -> Expo push infra exists -> add token capture + scheduled sends.

## Gaps to resolve
- Phone OTP auth is required by the spec; current auth is email + password (web and mobile).
- Data model for "Subject -> Live Course Instances -> Live Sessions" is not in Supabase migrations yet.
- Mobile app does not consume Supabase edge functions; it calls legacy API.

## Decision log (assumed for implementation)
- Backend: Hybrid (Supabase edge functions for content/payments/auth, existing `/api/live` for live sessions).
  Rationale: backend is already live-only; web uses Supabase for most APIs.
- OTP: Supabase phone auth with an SMS provider (Twilio/MessageBird/MSG91), replacing email OTP for mobile.
  Rationale: aligns with spec and keeps auth unified in Supabase.
- Live sessions: reuse existing WebRTC live backend and admin tooling.
  Rationale: working endpoints + admin UI already exist.
- Masterclasses: reuse existing events/masterclass data via Supabase edge functions and admin tooling.
  Rationale: content already curated and editable in admin.
- Notifications: use Expo push + in-app notifications, scheduled by server jobs.
  Rationale: Expo push utility exists; add token capture in mobile.

## Phase 0 completion checklist
- Requirements reviewed against `Gradus app.pdf`.
- Repo inventory captured and mapped to requirements.
- v1 scope defined with in/out boundaries.
- UX baseline flows documented for guest/registered/paid/admin.
- Success metrics defined.
- Decisions recorded to unblock Phase 1.
