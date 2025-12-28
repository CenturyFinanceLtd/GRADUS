-- Create contact_inquiries table
CREATE TABLE IF NOT EXISTS public.contact_inquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    state TEXT,
    region TEXT NOT NULL,
    institution TEXT,
    qualification TEXT,
    course TEXT,
    message TEXT,
    contact_status TEXT DEFAULT 'pending' CHECK (contact_status IN ('pending', 'contacted', 'unable_to_contact')),
    lead_generated BOOLEAN,
    inquiry_solved BOOLEAN,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_contact_inquiries_email ON public.contact_inquiries(email);
CREATE INDEX IF NOT EXISTS idx_contact_inquiries_phone ON public.contact_inquiries(phone);
CREATE INDEX IF NOT EXISTS idx_contact_inquiries_region ON public.contact_inquiries(region);
CREATE INDEX IF NOT EXISTS idx_contact_inquiries_contact_status ON public.contact_inquiries(contact_status);
CREATE INDEX IF NOT EXISTS idx_contact_inquiries_created_at ON public.contact_inquiries(created_at DESC);
