# Supabase Deployment Guide

## Prerequisites

1. **Install Supabase CLI**
   ```bash
   npm install -g supabase
   ```

2. **Verify Installation**
   ```bash
   supabase --version
   ```

## Initial Setup

### 1. Login to Supabase

```bash
supabase login
```

This will open your browser to authenticate. After successful login, you'll be able to deploy functions.

### 2. Link Your Project

Navigate to your Supabase directory:

```bash
cd GRADUS/supabase
```

Link your project (get your project reference from Supabase dashboard):

```bash
supabase link --project-ref YOUR_PROJECT_REF
```

Your project reference can be found in:
- Supabase Dashboard → Settings → General → Reference ID
- Or from your Supabase URL: `https://YOUR_PROJECT_REF.supabase.co`

## Deploy All Functions

### Option 1: Deploy Individual Functions

```bash
# From GRADUS/supabase directory
supabase functions deploy admin-uploads-api
supabase functions deploy admin-auth-api
supabase functions deploy admin-landing-pages-api
supabase functions deploy admin-blogs-api
supabase functions deploy admin-courses-api
# ... deploy other functions as needed
```

### Option 2: Deploy All Functions (Bash Script)

Create a deployment script:

```bash
#!/bin/bash
# deploy-all-functions.sh

cd "$(dirname "$0")"

FUNCTIONS=(
  "admin-uploads-api"
  "admin-auth-api"
  "admin-landing-pages-api"
  "admin-blogs-api"
  "admin-banners-api"
  "admin-courses-api"
  "admin-events-api"
  "admin-testimonials-api"
  "admin-partners-api"
  "admin-users-api"
  "admin-website-users-api"
  "admin-permissions-api"
  "admin-emails-api"
  "admin-analytics-api"
  "admin-tickets-api"
  "admin-assignments-api"
  "admin-assessments-api"
  "admin-email-templates-api"
  "admin-course-details-api"
  "admin-gallery-api"
  "admin-sitemaps-api"
  "admin-page-meta-api"
  "admin-expert-videos-api"
  "admin-why-gradus-api"
  "admin-jobs-api"
  "admin-live-sessions-api"
  "auth-api"
  "users-api"
  "courses-api"
  "blogs-api"
  "content-api"
  "event-registrations-api"
  "inquiries-api"
  "live-class-api"
  "sitemap-renderer"
  "send-email"
  "payment-processing"
  "landing-page-registration"
)

echo "🚀 Starting deployment of ${#FUNCTIONS[@]} functions..."

for func in "${FUNCTIONS[@]}"; do
  echo ""
  echo "📦 Deploying $func..."
  supabase functions deploy "$func" || {
    echo "❌ Failed to deploy $func"
    continue
  }
  echo "✅ Successfully deployed $func"
done

echo ""
echo "🎉 Deployment complete!"
```

Make it executable and run:

```bash
chmod +x deploy-all-functions.sh
./deploy-all-functions.sh
```

### Option 3: Deploy Specific Function (Windows PowerShell)

```powershell
# deploy-function.ps1
param(
    [Parameter(Mandatory=$true)]
    [string]$FunctionName
)

Set-Location $PSScriptRoot

Write-Host "🚀 Deploying $FunctionName..." -ForegroundColor Cyan
supabase functions deploy $FunctionName

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Successfully deployed $FunctionName" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to deploy $FunctionName" -ForegroundColor Red
    exit 1
}
```

Usage:
```powershell
.\deploy-function.ps1 -FunctionName "admin-uploads-api"
```

## Environment Variables (Secrets)

Set environment variables for your functions in Supabase Dashboard:

1. Go to **Supabase Dashboard** → **Edge Functions** → **Secrets**
2. Add the following secrets:

### Required Secrets for Most Functions

```bash
# Core Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# JWT
JWT_SECRET=your-jwt-secret

# Cloudinary (for image uploads)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

### Function-Specific Secrets

**For `live-class-api`:**
```bash
HMS_ACCESS_KEY=your-100ms-access-key
HMS_SECRET=your-100ms-secret
HMS_TEMPLATE_ID=your-template-id
HMS_SYSTEM_SUBDOMAIN=your-subdomain
```

**For `payment-processing`:**
```bash
RAZORPAY_KEY_ID=your-razorpay-key
RAZORPAY_KEY_SECRET=your-razorpay-secret
```

### Set Secrets via CLI

```bash
# Set a single secret
supabase secrets set SECRET_NAME=secret_value

# Set multiple secrets
supabase secrets set \
  SUPABASE_URL=https://your-project.supabase.co \
  SUPABASE_ANON_KEY=your-key \
  JWT_SECRET=your-secret
```

## Deploy Database Migrations

```bash
# From GRADUS/supabase directory
supabase db push
```

Or deploy specific migration:

```bash
supabase migration up
```

## Verify Deployment

### Check Function Status

```bash
supabase functions list
```

### Test Function

```bash
# Test with curl
curl https://YOUR_PROJECT_REF.supabase.co/functions/v1/admin-uploads-api/landing-page-image \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test-image.jpg"
```

### View Function Logs

```bash
# View logs for a specific function
supabase functions logs admin-uploads-api

# Follow logs in real-time
supabase functions logs admin-uploads-api --follow
```

## Quick Deploy Script (All-in-One)

Create `deploy.sh` in `GRADUS/supabase/`:

```bash
#!/bin/bash
set -e

echo "🔐 Logging in to Supabase..."
supabase login

echo "🔗 Linking project..."
read -p "Enter your Supabase project reference: " PROJECT_REF
supabase link --project-ref "$PROJECT_REF"

echo "📦 Deploying functions..."
./deploy-all-functions.sh

echo "🗄️  Pushing database migrations..."
supabase db push

echo "✅ Deployment complete!"
```

## Troubleshooting

### Function Not Found

If you get "function not found" error:
1. Check function name matches exactly (case-sensitive)
2. Verify function exists in `GRADUS/supabase/functions/`
3. Check `config.toml` has the function configured

### Authentication Errors

If you get authentication errors:
1. Run `supabase login` again
2. Verify project is linked: `supabase projects list`
3. Check project reference is correct

### Environment Variables Not Working

1. Set secrets in Supabase Dashboard → Edge Functions → Secrets
2. Or use CLI: `supabase secrets set KEY=value`
3. Redeploy function after setting secrets

### Deployment Timeout

For large functions:
1. Check function size (should be < 50MB)
2. Remove unnecessary dependencies
3. Use `deno.json` to optimize imports

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy Supabase Functions

on:
  push:
    branches: [main]
    paths:
      - 'GRADUS/supabase/functions/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Supabase CLI
        run: npm install -g supabase
      
      - name: Login to Supabase
        run: supabase login --token ${{ secrets.SUPABASE_ACCESS_TOKEN }}
      
      - name: Link Project
        run: supabase link --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
      
      - name: Deploy Functions
        run: |
          cd GRADUS/supabase
          supabase functions deploy admin-uploads-api
          supabase functions deploy admin-landing-pages-api
          # Add other functions as needed
```

## Useful Commands

```bash
# List all projects
supabase projects list

# List all functions
supabase functions list

# View function details
supabase functions describe FUNCTION_NAME

# Delete a function
supabase functions delete FUNCTION_NAME

# View function logs
supabase functions logs FUNCTION_NAME

# Invoke function locally (for testing)
supabase functions serve FUNCTION_NAME
```

## Notes

- Always test functions locally before deploying
- Use `supabase functions serve` for local development
- Keep secrets secure - never commit them to git
- Monitor function logs for errors after deployment
- Functions are deployed globally via Supabase CDN

