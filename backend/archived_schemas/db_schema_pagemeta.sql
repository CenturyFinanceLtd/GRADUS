
-- Page Metas Table
CREATE TABLE IF NOT EXISTS public.page_metas (
  id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  path TEXT,
  title TEXT,
  description TEXT,
  keywords TEXT,
  robots TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  is_default BOOLEAN DEFAULT FALSE,
  created_by UUID, -- Ref to admin auth.users? Or just string? Using generic UUID or Text for now.
  updated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS page_metas_path_idx ON public.page_metas (path) WHERE is_default = FALSE;
CREATE UNIQUE INDEX IF NOT EXISTS page_metas_default_idx ON public.page_metas (is_default) WHERE is_default = TRUE;

-- Policies
ALTER TABLE public.page_metas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read page_metas" ON public.page_metas FOR SELECT USING (true);
-- Write policies for admin later, service role bypasses.
