#!/bin/bash
# Stop on error
set -e

echo "[Deploy] Starting Backend Deployment..."
cd /var/www/gradus/server

echo "[Deploy] Installing Dependencies..."
npm install --production

echo "[Deploy] Restarting PM2..."
# Check if PM2 process exists
if pm2 list | grep -q "gradus-backend"; then
    echo "[Deploy] Process 'gradus-backend' found. Reloading..."
    pm2 reload gradus-backend --update-env
else
    echo "[Deploy] Process 'gradus-backend' not found. Starting..."
    pm2 start src/server.js --name "gradus-backend"
fi

echo "[Deploy] Backend Deployment Complete!"
