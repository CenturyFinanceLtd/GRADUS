# Google Sheets Sync Worker - Cron Setup

The `sheets-sync-worker` Edge Function processes queued Google Sheets sync jobs. It needs to be triggered regularly (recommended: every 1-2 minutes) to ensure timely synchronization.

## Option A: External Cron Service (Recommended)

### Using cron-job.org (Free)

1. Go to https://console.cron-job.org/
2. Sign up for a free account
3. Create a new cron job with these settings:

   - **Title**: `Gradus Sheets Sync Worker`
   - **URL**: `https://utxxhgoxsywhrdblwhbx.supabase.co/functions/v1/sheets-sync-worker`
   - **Schedule**: Every 2 minutes (`*/2 * * * *`)
   - **Request Method**: POST
   - **Request Timeout**: 30 seconds
   - **Advanced Settings** → Headers:
     - Add header: `Authorization: Bearer YOUR_SUPABASE_ANON_KEY`
     - Replace `YOUR_SUPABASE_ANON_KEY` with the value from your `.env` file (`VITE_SUPABASE_ANON_KEY`)

4. Save and enable the cron job
5. Monitor the execution logs to verify it's working

### Using EasyCron (Alternative)

1. Go to https://www.easycron.com/
2. Sign up for a free account (50 cron jobs, 1-minute intervals)
3. Create a new cron job:
   - **URL**: `https://utxxhgoxsywhrdblwhbx.supabase.co/functions/v1/sheets-sync-worker`
   - **Cron Expression**: `*/2 * * * *` (every 2 minutes)
   - **HTTP Method**: POST
   - **HTTP Headers**: `Authorization: Bearer YOUR_SUPABASE_ANON_KEY`

---

## Option B: Supabase pg_cron (Advanced)

If you're on Supabase Pro plan, you can use built-in `pg_cron`:

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the worker to run every 2 minutes
SELECT cron.schedule(
  'sheets-sync-worker',
  '*/2 * * * *',
  $$
  SELECT net.http_post(
    'https://utxxhgoxsywhrdblwhbx.supabase.co/functions/v1/sheets-sync-worker',
    '{}',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer YOUR_SUPABASE_ANON_KEY'
    )
  );
  $$
);
```

Replace `YOUR_SUPABASE_ANON_KEY` with the actual key from your environment.

---

## Monitoring & Troubleshooting

### Check Queue Status

```sql
SELECT status, COUNT(*)
FROM public.sheets_sync_queue
GROUP BY status;
```

### View Recent Errors

```sql
SELECT id, entity_type, last_error, retry_count, created_at
FROM public.sheets_sync_queue
WHERE status = 'failed' OR last_error IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;
```

### Manual Worker Invocation (Testing)

```bash
curl -X POST https://utxxhgoxsywhrdblwhbx.supabase.co/functions/v1/sheets-sync-worker \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY"
```

### View Worker Logs

Go to: https://supabase.com/dashboard/project/utxxhgoxsywhrdblwhbx/functions/sheets-sync-worker/logs

---

## Next Steps

1. Set up the cron trigger using Option A or B above
2. Test by creating a registration and verifying it appears in Google Sheets within 2-4 minutes
3. Monitor the `sheets_sync_queue` table to ensure jobs are being processed correctly
