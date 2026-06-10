-- Multi-tenant Business Table
CREATE TABLE public.businesses (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    segment TEXT,
    primary_color TEXT DEFAULT '#ffffff',
    secondary_color TEXT DEFAULT '#000000',
    owner_id UUID REFERENCES auth.users(id),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Onboarding Requests Table (to track potential customers)
CREATE TABLE public.onboarding_requests (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    business_name TEXT,
    segment TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add business_id to existing tables for multi-tenancy
ALTER TABLE public.services ADD COLUMN business_id UUID REFERENCES public.businesses(id);
ALTER TABLE public.professionals ADD COLUMN business_id UUID REFERENCES public.businesses(id);
ALTER TABLE public.bookings ADD COLUMN business_id UUID REFERENCES public.businesses(id);
ALTER TABLE public.profiles ADD COLUMN business_id UUID REFERENCES public.businesses(id);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.businesses TO authenticated;
GRANT ALL ON public.businesses TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.onboarding_requests TO authenticated;
GRANT INSERT ON public.onboarding_requests TO anon;
GRANT ALL ON public.onboarding_requests TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT ALL ON public.services TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.professionals TO authenticated;
GRANT ALL ON public.professionals TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;

-- Enable RLS
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_requests ENABLE ROW LEVEL SECURITY;

-- Policies for businesses
CREATE POLICY "Users can view their own business" ON public.businesses
    FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can update their own business" ON public.businesses
    FOR UPDATE USING (auth.uid() = owner_id);

-- Policies for onboarding_requests
CREATE POLICY "Anyone can insert onboarding requests" ON public.onboarding_requests
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view their own requests" ON public.onboarding_requests
    FOR SELECT USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON public.businesses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_onboarding_requests_updated_at BEFORE UPDATE ON public.onboarding_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();