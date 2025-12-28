-- Create email_templates table
CREATE TABLE IF NOT EXISTS public.email_templates (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    mongo_id text,
    key text UNIQUE NOT NULL,
    name text,
    description text,
    subject text NOT NULL,
    html text NOT NULL,
    text text NOT NULL,
    variables jsonb DEFAULT '[]'::jsonb,
    updated_by uuid REFERENCES public.admin_users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Index on key
CREATE INDEX IF NOT EXISTS idx_email_templates_key ON public.email_templates(key);
