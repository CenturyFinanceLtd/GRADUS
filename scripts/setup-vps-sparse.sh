#!/bin/bash
# VPS Setup Script for GRADUS
# Run this ONCE on your VPS to configure sparse checkout (excludes mobile apps)

set -e

echo "=== GRADUS VPS Setup ==="
echo ""

# Navigate to project directory
cd /var/www/GRADUS

# Enable sparse checkout
git config core.sparseCheckout true

# Create sparse checkout file - only include server folders
cat > .git/info/sparse-checkout << 'EOF'
# Include only these folders
/admin
/backend
/frontend
/shared
/.github

# Explicitly exclude mobile apps
!gradus-app
!gradusadmin-app
EOF

echo "Sparse checkout configured. Running git pull..."
git pull origin main

echo ""
echo "=== Setup Complete ==="
echo "Only admin, backend, frontend, and shared folders will be pulled."
echo "Mobile apps (gradus-app, gradusadmin-app) are excluded."
