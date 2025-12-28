-- Google Sheets Sync Queue
-- Decouples Sheets sync from request/response cycle to prevent rate limit issues

CREATE TABLE IF NOT EXISTS public.sheets_sync_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL, -- 'event_registration', 'contact_inquiry', etc.
  entity_id UUID NOT NULL, -- ID of the entity to sync
  payload JSONB NOT NULL, -- Full data needed for sync (name, email, event details, etc.)
  status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  last_error TEXT,
  scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for worker queries (fetch pending jobs sorted by scheduled time)
CREATE INDEX IF NOT EXISTS idx_sheets_queue_status_schedule ON public.sheets_sync_queue(status, scheduled_at);

-- Index for entity lookups (check if already queued)
CREATE INDEX IF NOT EXISTS idx_sheets_queue_entity ON public.sheets_sync_queue(entity_type, entity_id);

-- Index for cleanup queries (old completed/failed jobs)
CREATE INDEX IF NOT EXISTS idx_sheets_queue_processed ON public.sheets_sync_queue(status, processed_at);
