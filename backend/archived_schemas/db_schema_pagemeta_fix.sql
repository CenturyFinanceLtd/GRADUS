
-- Fix page_metas columns if they are missing (table might have existed with different schema)
ALTER TABLE public.page_metas ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE public.page_metas ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE;
ALTER TABLE public.page_metas ADD COLUMN IF NOT EXISTS path TEXT;
ALTER TABLE public.page_metas ADD COLUMN IF NOT EXISTS title TEXT;
-- Renaming if standard mongoose 'active' was used
DO $$
BEGIN
  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='page_metas' AND column_name='active') THEN
    ALTER TABLE public.page_metas RENAME COLUMN active TO is_active;
  END IF;
  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='page_metas' AND column_name='isDefault') THEN
    ALTER TABLE public.page_metas RENAME COLUMN "isDefault" TO is_default;
  END IF;
END $$;
