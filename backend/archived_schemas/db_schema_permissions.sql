-- Admin Permissions Table
CREATE TABLE IF NOT EXISTS public.admin_permissions (
  id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  role TEXT UNIQUE NOT NULL,
  allowed_pages TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role or admins can access (simplified for now as backend bypasses RLS?)
-- Actually, let's keep it open for service role, and read-only for authenticated admins if needed later.
-- For now, default deny implies we need policies if using client key, but we use service key in backend.
