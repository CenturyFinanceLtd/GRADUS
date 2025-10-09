diff --git a/README.md b/README.md
index 69a98fd5cd84ec50d09bacbaa678a106352bc5e7..3bd65145acacdc5ddb919d979e0acb7d7670d8d2 100644
--- a/README.md
+++ b/README.md
@@ -1,223 +1,303 @@
-# GRADUS Deployment Guide
+# GRADUS Platform Operations Manual
 
-This document captures the end-to-end steps required to deploy the **GRADUS**
-application suite (frontend website, admin dashboard, and REST API backend) on
-production domains such as `gradusindia.in`. The repository contains three
-separate projects:
+This repository contains the complete codebase for the **GRADUS** education platform, which is deployed as three coordinated web applications:
 
-| Project     | Location  | Description |
-| ----------- | --------- | ----------- |
-| Frontend    | `frontend/` | Public marketing and course website built with Vite/React. |
-| Admin Panel | `admin/`    | Internal dashboard for managing courses, blogs, and users (Vite/React). |
-| Backend API | `backend/`  | Node.js/Express service that powers authentication, courses, blogs, and contact forms. |
+| Domain | Directory | Purpose |
+| --- | --- | --- |
+| `gradusindia.in` | [`frontend/`](frontend/) | Public marketing site and course catalogue built with Vite + React. |
+| `admin.gradusindia.in` | [`admin/`](admin/) | React-based operations dashboard for managing courses, blogs, analytics, and enrolments. |
+| `api.gradusindia.in` | [`backend/`](backend/) | Node.js/Express API that handles authentication, content management, analytics, chatbot, and contact submissions. |
 
-All three services are deployed together; the frontend and admin builds are
-served as static sites while the backend runs as a long-lived Node.js process.
+All environments—local, staging, and production—follow the same structure. The sections below walk through every step required to develop, configure, deploy, and maintain the platform.
 
-## 1. Prerequisites
+---
 
-Install the following on the production server before configuring the project:
+## Table of contents
 
-* **Node.js 18 LTS** (or newer) and `npm` for building and running all
-  JavaScript projects.
-* **MongoDB** (Atlas cluster or self-hosted instance) for persistent data.
-* **Nginx** to serve the static builds and proxy traffic to the backend API.
-* **pm2** or another process manager for the Node.js backend service.
-* **Certbot** (optional) to provision HTTPS certificates.
+1. [Technology stack](#technology-stack)
+2. [Repository layout](#repository-layout)
+3. [Prerequisites](#prerequisites)
+4. [Environment variables](#environment-variables)
+5. [Local development workflow](#local-development-workflow)
+6. [Backend services](#backend-services)
+7. [Frontend site](#frontend-site)
+8. [Admin dashboard](#admin-dashboard)
+9. [Deployment to production domains](#deployment-to-production-domains)
+10. [Nginx reverse proxy setup](#nginx-reverse-proxy-setup)
+11. [Post-deployment checklist](#post-deployment-checklist)
+12. [Maintenance & troubleshooting](#maintenance--troubleshooting)
 
-## 2. Directory layout
+---
 
-Clone the repository into `/var/www/GRADUS` (already done in your VPS). The
-deployment steps below assume the following directories:
+## Technology stack
+
+* **API** – Node.js 18+, Express 5, MongoDB (Mongoose ODM), Express Session, JWT, Nodemailer for transactional email, and Multer for media uploads. 【F:backend/package.json†L1-L34】【F:backend/src/app.js†L1-L66】
+* **Frontend** – React 18 rendered through Vite with a collection of marketing-focused libraries (AOS, Bootstrap, slick carousel, modal video, etc.). 【F:frontend/package.json†L1-L34】
+* **Admin dashboard** – React 18 + Vite with rich UI widgets (charts, calendars, drag-and-drop, TinyMCE, React Quill). 【F:admin/package.json†L1-L68】
+
+---
+
+## Repository layout
 
 ```
-/var/www/GRADUS/frontend
-/var/www/GRADUS/admin
-/var/www/GRADUS/backend
+GRADUS/
+├── admin/        # Vite React admin portal
+├── backend/      # Express API and MongoDB data models
+├── frontend/     # Vite React marketing site
+├── scripts/      # Infrastructure and automation helpers (if any)
+└── shared/       # Shared assets and utilities
 ```
 
-## 3. Configure backend environment variables
+See each project folder for its own `package.json` and source tree.
 
-Create `/var/www/GRADUS/backend/.env` with production values. The backend reads
-its configuration from environment variables (see `backend/src/config/env.js`).
-Key settings include the public API URL, the allowed frontend origins, MongoDB,
-authentication secrets, and SMTP credentials for transactional email. 【F:backend/src/config/env.js†L1-L63】
+---
 
-Example `.env` template targeting the `gradusindia.in` domains:
+## Prerequisites
 
-```ini
-NODE_ENV=production
-PORT=5000
-SERVER_PUBLIC_URL=https://api.gradusindia.in
+Install the following tools on any machine that will run or deploy GRADUS:
 
-# Frontend origins allowed by CORS and session cookies
-CLIENT_URLS=https://gradusindia.in,https://www.gradusindia.in,https://admin.gradusindia.in
+1. **Node.js 18 LTS** (or newer) with `npm`. All three projects use Node for builds and tooling. 【F:backend/package.json†L1-L34】【F:frontend/package.json†L1-L34】
+2. **MongoDB 6+** (self-hosted or Atlas cluster). The backend terminates startup if the `MONGODB_URI` is missing. 【F:backend/src/config/db.js†L1-L20】
+3. **Git** for source control and deployments.
+4. **pm2** (recommended) to keep the API process alive in production. 【F:README.md†L198-L214】
+5. **Nginx** to serve static builds and proxy API traffic. 【F:README.md†L170-L197】
+6. **Certbot** (optional) to provision HTTPS certificates.
 
-# MongoDB and auth secrets
-MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>/<database>?retryWrites=true&w=majority
-JWT_SECRET=<random-long-string>
-JWT_EXPIRES_IN=7d
-SESSION_SECRET=<different-random-long-string>
+---
 
-# SMTP (required when EMAIL_DELIVERY_MODE=live)
-SMTP_HOST=smtp.yourprovider.com
-SMTP_PORT=587
-SMTP_USER=no-reply@gradusindia.in
-SMTP_PASS=<smtp-password>
-SMTP_FROM="Gradus <no-reply@gradusindia.in>"
-EMAIL_DELIVERY_MODE=live
+## Environment variables
 
-# Optional branding overrides
-ADMIN_APPROVER_EMAIL=admin@gradusindia.in
-ADMIN_PORTAL_NAME="Gradus Admin Portal"
-```
+Each application relies on environment variables supplied through `.env` files.
 
-> **Note:** Leave `EMAIL_DELIVERY_MODE=live` to send emails through SMTP. Set it
-> to `test` if you want to disable real email delivery.
+### Backend (`backend/.env`)
 
-## 4. Install backend dependencies and run with pm2
+The API reads configuration through [`backend/src/config/env.js`](backend/src/config/env.js). Key settings include:
 
-```bash
-cd /var/www/GRADUS/backend
-npm ci --only=production
-pm2 start src/server.js --name gradus-api
-pm2 save
-```
+* `NODE_ENV` and `PORT` – the runtime mode and HTTP port (defaults to `5000`). 【F:backend/src/config/env.js†L5-L38】
+* `SERVER_PUBLIC_URL` – the externally reachable base URL (`https://api.gradusindia.in`). 【F:backend/src/config/env.js†L8-L23】
+* `CLIENT_URLS` – comma-separated list of allowed browser origins for CORS/session cookies (`https://gradusindia.in,https://www.gradusindia.in,https://admin.gradusindia.in`). 【F:backend/src/config/env.js†L24-L36】【F:backend/src/app.js†L11-L34】
+* Mongo/auth secrets (`MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `SESSION_SECRET`). Missing values log warnings during boot. 【F:backend/src/config/env.js†L37-L63】
+* SMTP credentials for real email delivery when `EMAIL_DELIVERY_MODE=live`. 【F:backend/src/config/env.js†L37-L61】
+* Admin branding (`ADMIN_APPROVER_EMAIL`, `ADMIN_PORTAL_NAME`) and approval URL overrides. 【F:backend/src/config/env.js†L39-L55】
 
-The backend exposes a health endpoint at `https://api.gradusindia.in/api/health`
-that should return `{ status: 'ok' }` when the service is healthy. 【F:backend/src/app.js†L51-L66】
+> **Production note:** `SESSION_SECRET` is mandatory in production; the server warns if it is omitted. 【F:backend/src/config/env.js†L60-L63】
 
-## 5. Configure frontend and admin builds
+### Frontend (`frontend/.env.local` or `.env.production`)
 
-Both Vite projects read their API URLs from environment files. Create
-`/var/www/GRADUS/frontend/.env.production`:
+* `VITE_API_BASE_URL` – REST endpoint consumed by the marketing site. Default logic falls back to `http://localhost:5000/api` during local development and `https://api.gradusindia.in/api` otherwise. 【F:frontend/src/services/apiClient.js†L1-L53】
 
-```ini
-VITE_API_BASE_URL=https://api.gradusindia.in/api
-```
+### Admin (`admin/.env.local` or `.env.production`)
 
-Create `/var/www/GRADUS/admin/.env.production`:
+* `VITE_API_BASE_URL` – base URL for admin API calls (`https://api.gradusindia.in/api`). 【F:admin/src/config/env.js†L1-L26】
+* `VITE_PUBLIC_SITE_URL` – optional link back to the public site (used in cross-navigation). 【F:admin/src/config/env.js†L20-L28】
 
-```ini
-VITE_API_BASE_URL=https://api.gradusindia.in/api
-VITE_PUBLIC_SITE_URL=https://gradusindia.in
-```
+Create environment files for each project before running any commands. Example production values are provided in the deployment section.
 
-Install dependencies and build optimized bundles:
+---
 
-```bash
-cd /var/www/GRADUS/frontend
-npm ci
-npm run build
+## Local development workflow
 
-cd /var/www/GRADUS/admin
-npm ci
-npm run build
-```
+1. **Clone the repository** and install dependencies once per project:
+   ```bash
+   git clone <repo-url>
+   cd GRADUS
+   npm install --prefix backend
+   npm install --prefix frontend
+   npm install --prefix admin
+   ```
+
+2. **Prepare environment files** using the templates above. For quick local testing you may point all apps at `http://localhost:5000` and a local MongoDB instance.
+
+3. **Start the backend API**:
+   ```bash
+   cd backend
+   npm run dev
+   ```
+   This runs `nodemon src/server.js`, which connects to MongoDB, ensures default course content exists, and exposes endpoints on `http://localhost:5000/api`. 【F:backend/package.json†L4-L18】【F:backend/src/server.js†L1-L26】
+
+4. **Start the frontend site**:
+   ```bash
+   cd frontend
+   npm run dev -- --host
+   ```
+   Vite serves the site on `http://localhost:5173` by default and proxies API calls using the configured `VITE_API_BASE_URL`. 【F:frontend/package.json†L5-L20】【F:frontend/src/services/apiClient.js†L15-L53】
+
+5. **Start the admin dashboard**:
+   ```bash
+   cd admin
+   npm run dev -- --host
+   ```
+   The admin app expects valid credentials provisioned through the backend's admin signup flow. 【F:admin/package.json†L5-L20】【F:backend/src/routes/adminAuthRoutes.js†L1-L120】
+
+6. **Optional tooling** – Both Vite projects expose `npm run build` for production builds and `npm run preview` to serve the compiled assets locally. 【F:frontend/package.json†L5-L20】【F:admin/package.json†L5-L20】
+
+---
+
+## Backend services
+
+* **Express application** – Registers API routers for authentication, admin management, blogs, courses, analytics, chatbot, and public contact forms under `/api/*` paths. 【F:backend/src/app.js†L1-L66】
+* **Mongo connection** – `connectDB()` validates `MONGODB_URI` and terminates on failure. 【F:backend/src/config/db.js†L1-L20】
+* **Session & CORS** – Requests include credentials and session cookies secured by `SESSION_SECRET`; allowed origins are enforced through `CLIENT_URLS`. 【F:backend/src/app.js†L11-L44】
+* **Default content seeding** – On startup the server ensures at least one course and course page exist by inserting data from `backend/src/data/defaultCourseContent.js`. 【F:backend/src/server.js†L1-L26】【F:backend/src/utils/ensureCourseContent.js†L1-L77】
+* **Health check** – `GET /api/health` returns `{ status: 'ok' }` with a timestamp; use this endpoint for uptime monitoring. 【F:backend/src/app.js†L46-L54】
+* **Static assets** – Blog images uploaded through the admin panel are served from `/blog-images`. 【F:backend/src/app.js†L40-L45】
+
+When deploying with pm2, start the process with `pm2 start src/server.js --name gradus-api` and run `pm2 save` to persist restarts. 【F:README.md†L129-L145】
 
-The build commands produce static assets inside the `dist/` directory of each
-project (`frontend/dist` and `admin/dist`). Both package.json files expose the
-`build` script via `npm run build`. 【F:frontend/package.json†L1-L41】【F:admin/package.json†L1-L79】
+---
 
-## 6. Configure Nginx
+## Frontend site
 
-Define three server blocks—one for the public site, one for the admin portal,
-and one for the API proxy. Adjust TLS directives based on the certificates you
-issue with Certbot.
+* Vite React application tailored to marketing content, carousels, counters, and animations. Dependencies include `animate.css`, `react-fast-marquee`, `react-slick`, and others. 【F:frontend/package.json†L13-L33】
+* API requests are centralized in `src/services/apiClient.js`, which automatically attaches credentials and parses JSON responses. 【F:frontend/src/services/apiClient.js†L19-L92】
+* Configure deployments by supplying `VITE_API_BASE_URL=https://api.gradusindia.in/api` in `.env.production` before running `npm run build`. 【F:frontend/src/services/apiClient.js†L1-L53】
 
-`/etc/nginx/sites-available/gradusindia.in`:
+The build command outputs static files to `frontend/dist/` for Nginx or any static host. 【F:frontend/package.json†L5-L20】
+
+---
+
+## Admin dashboard
+
+* Rich Vite React SPA providing course authoring, blog management, analytics views, chatbot training, and user administration.
+* Environment configuration is validated at runtime; missing `VITE_API_BASE_URL` throws an explicit error. 【F:admin/src/config/env.js†L1-L28】
+* The admin portal reuses the API base URL to construct asset links (for blog images and uploads). 【F:admin/src/config/env.js†L20-L28】
+
+Build with `npm run build` to produce `admin/dist/` for static hosting behind Nginx. 【F:admin/package.json†L5-L20】
+
+---
+
+## Deployment to production domains
+
+Follow these steps on your production server (e.g., `/var/www/GRADUS`):
+
+1. **Fetch code**:
+   ```bash
+   cd /var/www
+   git clone <repo-url> GRADUS
+   ```
+
+2. **Backend environment (`backend/.env`)**:
+   ```ini
+   NODE_ENV=production
+   PORT=5000
+   SERVER_PUBLIC_URL=https://api.gradusindia.in
+   CLIENT_URLS=https://gradusindia.in,https://www.gradusindia.in,https://admin.gradusindia.in
+   MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>/<database>?retryWrites=true&w=majority
+   JWT_SECRET=<random-long-string>
+   JWT_EXPIRES_IN=7d
+   SESSION_SECRET=<another-random-string>
+   SMTP_HOST=smtp.yourprovider.com
+   SMTP_PORT=587
+   SMTP_USER=no-reply@gradusindia.in
+   SMTP_PASS=<smtp-password>
+   SMTP_FROM="Gradus <no-reply@gradusindia.in>"
+   EMAIL_DELIVERY_MODE=live
+   ADMIN_APPROVER_EMAIL=admin@gradusindia.in
+   ADMIN_PORTAL_NAME="Gradus Admin Portal"
+   ```
+
+3. **Frontend `.env.production`**:
+   ```ini
+   VITE_API_BASE_URL=https://api.gradusindia.in/api
+   ```
+
+4. **Admin `.env.production`**:
+   ```ini
+   VITE_API_BASE_URL=https://api.gradusindia.in/api
+   VITE_PUBLIC_SITE_URL=https://gradusindia.in
+   ```
+
+5. **Install and build**:
+   ```bash
+   cd /var/www/GRADUS/backend && npm ci --only=production
+   cd /var/www/GRADUS/frontend && npm ci && npm run build
+   cd /var/www/GRADUS/admin && npm ci && npm run build
+   ```
+
+6. **Run the API with pm2**:
+   ```bash
+   cd /var/www/GRADUS/backend
+   pm2 start src/server.js --name gradus-api
+   pm2 save
+   ```
+
+7. **Serve static builds** – Point Nginx to `frontend/dist/` for `gradusindia.in` and `admin/dist/` for `admin.gradusindia.in`. The API listens on `127.0.0.1:5000` for proxying.
+
+---
+
+## Nginx reverse proxy setup
+
+Create `/etc/nginx/sites-available/gradusindia.in`:
 
 ```nginx
 server {
     listen 80;
     server_name gradusindia.in www.gradusindia.in;
 
     root /var/www/GRADUS/frontend/dist;
     index index.html;
 
     location / {
         try_files $uri $uri/ /index.html;
     }
 }
 
 server {
     listen 80;
     server_name admin.gradusindia.in;
 
     root /var/www/GRADUS/admin/dist;
     index index.html;
 
     location / {
         try_files $uri $uri/ /index.html;
     }
 }
 
 server {
     listen 80;
     server_name api.gradusindia.in;
 
     location / {
         proxy_pass http://127.0.0.1:5000;
         proxy_http_version 1.1;
         proxy_set_header Upgrade $http_upgrade;
         proxy_set_header Connection upgrade;
         proxy_set_header Host $host;
         proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
         proxy_set_header X-Forwarded-Proto $scheme;
     }
 }
 ```
 
-Enable the configuration and reload Nginx:
+Enable the site and reload:
 
 ```bash
-sudo ln -s /etc/nginx/sites-available/gradusindia.in /etc/nginx/sites-enabled/gradusindia.in
+sudo ln -s /etc/nginx/sites-available/gradusindia.in /etc/nginx/sites-enabled/
 sudo nginx -t
 sudo systemctl reload nginx
 ```
 
-Run Certbot to provision TLS and update the `listen` directives to `443 ssl`
-along with the generated certificate paths.
-
-## 7. Verify the deployment
-
-1. Browse to `https://gradusindia.in` and confirm the public site loads.
-2. Browse to `https://admin.gradusindia.in` and sign in with an admin account.
-3. Issue a `curl https://api.gradusindia.in/api/health` call to ensure the
-   backend responds.
-4. Test the contact form, course management, and blog workflows from the admin
-   panel.
-
-## 8. Keep services running after reboots
-
-* Ensure `pm2 save` has been executed and set up the pm2 startup script:
+After generating TLS certificates with Certbot, update `listen 80` to `listen 443 ssl http2` and add certificate paths.
 
-  ```bash
-  pm2 startup systemd
-  # Follow the printed instructions, then run
-  sudo systemctl enable pm2-$(whoami)
-  ```
+---
 
-* For static builds, rebuild the frontend or admin after pushing new commits:
+## Post-deployment checklist
 
-  ```bash
-  cd /var/www/GRADUS/frontend && git pull && npm ci && npm run build
-  cd /var/www/GRADUS/admin && git pull && npm ci && npm run build
-  cd /var/www/GRADUS/backend && git pull && npm ci --only=production && pm2 restart gradus-api
-  ```
+1. Visit `https://gradusindia.in` and `https://admin.gradusindia.in` to confirm static assets load correctly.
+2. Call `curl https://api.gradusindia.in/api/health` to verify the API responds with status `ok`. 【F:backend/src/app.js†L46-L54】
+3. Complete an admin login and ensure course/blog management features render without console errors.
+4. Submit the public contact form and confirm an email notification is received (requires SMTP).
+5. Run `pm2 status` to ensure the `gradus-api` process is online and attached to startup via `pm2 startup`. 【F:README.md†L198-L214】
 
-## 9. Troubleshooting tips
+---
 
-* **CORS errors** – Make sure every deployed origin is listed in
-  `CLIENT_URLS`. The backend only accepts requests from those origins. 【F:backend/src/app.js†L20-L46】
-* **Session issues** – Set a strong `SESSION_SECRET` in production; otherwise
-  the server warns you at startup. 【F:backend/src/config/env.js†L41-L60】
-* **API not reachable** – Confirm the pm2 process is running (`pm2 status`) and
-  that Nginx proxies to the correct port `5000`, matching the backend start
-  script. 【F:backend/package.json†L1-L31】
+## Maintenance & troubleshooting
 
-Following the steps above will give you a deployment parallel to your existing
-`century_finance` project, with the frontend served from `gradusindia.in`, the
-admin panel from `admin.gradusindia.in`, and the backend API from
-`api.gradusindia.in`.
+* **Origin/CORS issues** – Add every deployed domain to `CLIENT_URLS`; otherwise browsers will block cookies and API calls. 【F:backend/src/config/env.js†L24-L36】【F:backend/src/app.js†L11-L34】
+* **Session problems** – Set a strong `SESSION_SECRET`; the server logs a warning if it falls back to the default `gradus_secret`. 【F:backend/src/config/env.js†L37-L63】
+* **Database connectivity** – Review `MONGODB_URI`; the server exits immediately on connection errors. 【F:backend/src/config/db.js†L1-L20】
+* **Missing seed data** – Startup automatically populates courses when the collections are empty. Re-run the API with an empty database to rebuild defaults. 【F:backend/src/utils/ensureCourseContent.js†L1-L77】
+* **Static uploads** – Blog images are saved under `backend/uploads/blog-images/` and exposed publicly via `/blog-images`. Ensure the folder has read permissions for Nginx. 【F:backend/src/app.js†L40-L45】
 
+By following this playbook you can reproduce the GRADUS platform locally, deploy it on the designated domains (`gradusindia.in`, `admin.gradusindia.in`, and `api.gradusindia.in`), and keep all services healthy over time.
served as static sites while the backend runs as a long-lived Node.js process.

## 1. Prerequisites

Install the following on the production server before configuring the project:

* **Node.js 18 LTS** (or newer) and `npm` for building and running all
  JavaScript projects.
* **MongoDB** (Atlas cluster or self-hosted instance) for persistent data.
* **Nginx** to serve the static builds and proxy traffic to the backend API.
* **pm2** or another process manager for the Node.js backend service.
* **Certbot** (optional) to provision HTTPS certificates.

## 2. Directory layout

Clone the repository into `/var/www/GRADUS` (already done in your VPS). The
deployment steps below assume the following directories:

```
/var/www/GRADUS/frontend
/var/www/GRADUS/admin
/var/www/GRADUS/backend
```

## 3. Configure backend environment variables

Create `/var/www/GRADUS/backend/.env` with production values. The backend reads
its configuration from environment variables (see `backend/src/config/env.js`).
Key settings include the public API URL, the allowed frontend origins, MongoDB,
authentication secrets, and SMTP credentials for transactional email. 【F:backend/src/config/env.js†L1-L63】

Example `.env` template targeting the `gradusindia.in` domains:

```ini
NODE_ENV=production
PORT=5000
SERVER_PUBLIC_URL=https://api.gradusindia.in

# Frontend origins allowed by CORS and session cookies
CLIENT_URLS=https://gradusindia.in,https://www.gradusindia.in,https://admin.gradusindia.in

# MongoDB and auth secrets
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>/<database>?retryWrites=true&w=majority
JWT_SECRET=<random-long-string>
JWT_EXPIRES_IN=7d
SESSION_SECRET=<different-random-long-string>

# SMTP (required when EMAIL_DELIVERY_MODE=live)
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_USER=no-reply@gradusindia.in
SMTP_PASS=<smtp-password>
SMTP_FROM="Gradus <no-reply@gradusindia.in>"
EMAIL_DELIVERY_MODE=live

# Optional branding overrides
ADMIN_APPROVER_EMAIL=admin@gradusindia.in
ADMIN_PORTAL_NAME="Gradus Admin Portal"
```

> **Note:** Leave `EMAIL_DELIVERY_MODE=live` to send emails through SMTP. Set it
> to `test` if you want to disable real email delivery.

## 4. Install backend dependencies and run with pm2

```bash
cd /var/www/GRADUS/backend
npm ci --only=production
pm2 start src/server.js --name gradus-api
pm2 save
```

The backend exposes a health endpoint at `https://api.gradusindia.in/api/health`
that should return `{ status: 'ok' }` when the service is healthy. 【F:backend/src/app.js†L51-L66】

## 5. Configure frontend and admin builds

Both Vite projects read their API URLs from environment files. Create
`/var/www/GRADUS/frontend/.env.production`:

```ini
VITE_API_BASE_URL=https://api.gradusindia.in/api
```

Create `/var/www/GRADUS/admin/.env.production`:

```ini
VITE_API_BASE_URL=https://api.gradusindia.in/api
VITE_PUBLIC_SITE_URL=https://gradusindia.in
```

Install dependencies and build optimized bundles:

```bash
cd /var/www/GRADUS/frontend
npm ci
npm run build

cd /var/www/GRADUS/admin
npm ci
npm run build
```

The build commands produce static assets inside the `dist/` directory of each
project (`frontend/dist` and `admin/dist`). Both package.json files expose the
`build` script via `npm run build`. 【F:frontend/package.json†L1-L41】【F:admin/package.json†L1-L79】

## 6. Configure Nginx

Define three server blocks—one for the public site, one for the admin portal,
and one for the API proxy. Adjust TLS directives based on the certificates you
issue with Certbot.

`/etc/nginx/sites-available/gradusindia.in`:

```nginx
server {
    listen 80;
    server_name gradusindia.in www.gradusindia.in;

    root /var/www/GRADUS/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}

server {
    listen 80;
    server_name admin.gradusindia.in;

    root /var/www/GRADUS/admin/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}

server {
    listen 80;
    server_name api.gradusindia.in;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the configuration and reload Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/gradusindia.in /etc/nginx/sites-enabled/gradusindia.in
sudo nginx -t
sudo systemctl reload nginx
```

Run Certbot to provision TLS and update the `listen` directives to `443 ssl`
along with the generated certificate paths.

## 7. Verify the deployment

1. Browse to `https://gradusindia.in` and confirm the public site loads.
2. Browse to `https://admin.gradusindia.in` and sign in with an admin account.
3. Issue a `curl https://api.gradusindia.in/api/health` call to ensure the
   backend responds.
4. Test the contact form, course management, and blog workflows from the admin
   panel.

## 8. Keep services running after reboots

* Ensure `pm2 save` has been executed and set up the pm2 startup script:

  ```bash
  pm2 startup systemd
  # Follow the printed instructions, then run
  sudo systemctl enable pm2-$(whoami)
  ```

* For static builds, rebuild the frontend or admin after pushing new commits:

  ```bash
  cd /var/www/GRADUS/frontend && git pull && npm ci && npm run build
  cd /var/www/GRADUS/admin && git pull && npm ci && npm run build
  cd /var/www/GRADUS/backend && git pull && npm ci --only=production && pm2 restart gradus-api
  ```

## 9. Troubleshooting tips

* **CORS errors** – Make sure every deployed origin is listed in
  `CLIENT_URLS`. The backend only accepts requests from those origins. 【F:backend/src/app.js†L20-L46】
* **Session issues** – Set a strong `SESSION_SECRET` in production; otherwise
  the server warns you at startup. 【F:backend/src/config/env.js†L41-L60】
* **API not reachable** – Confirm the pm2 process is running (`pm2 status`) and
  that Nginx proxies to the correct port `5000`, matching the backend start
  script. 【F:backend/package.json†L1-L31】

Following the steps above will give you a deployment parallel to your existing
`century_finance` project, with the frontend served from `gradusindia.in`, the
admin panel from `admin.gradusindia.in`, and the backend API from
`api.gradusindia.in`.

