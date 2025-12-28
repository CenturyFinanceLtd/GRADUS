-- Create callback_requests table
CREATE TABLE IF NOT EXISTS public.callback_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'resolved', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on user_id
CREATE INDEX IF NOT EXISTS idx_callback_requests_user_id ON public.callback_requests(user_id);

-- Create index on status
CREATE INDEX IF NOT EXISTS idx_callback_requests_status ON public.callback_requests(status);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_callback_requests_created_at ON public.callback_requests(created_at DESC);
