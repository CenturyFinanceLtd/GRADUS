# GRADUS Deployment Guide

This document captures the end-to-end steps required to deploy the **GRADUS**
application suite (frontend website, admin dashboard, and REST API backend) on
production domains such as `gradusindia.in`. The repository contains three
separate projects:

| Project     | Location  | Description |
| ----------- | --------- | ----------- |
| Frontend    | `frontend/` | Public marketing and course website built with Vite/React. |
| Admin Panel | `admin/`    | Internal dashboard for managing courses, blogs, and users (Vite/React). |
| Backend API | `backend/`  | Node.js/Express service that powers authentication, courses, blogs, and contact forms. |

All three services are deployed together; the frontend and admin builds are
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

