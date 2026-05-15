-- Create ar_views table to track AR postcard views
CREATE TABLE IF NOT EXISTS public.ar_views (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  postcard_id uuid NOT NULL REFERENCES public.postcards(id) ON DELETE CASCADE,
  viewed_at timestamptz DEFAULT now() NOT NULL,
  user_agent text,
  ip_address text
);

-- Index for fast lookups by postcard_id
CREATE INDEX idx_ar_views_postcard_id ON public.ar_views(postcard_id);

-- Index for time-based queries
CREATE INDEX idx_ar_views_viewed_at ON public.ar_views(viewed_at);

-- Enable RLS
ALTER TABLE public.ar_views ENABLE ROW LEVEL SECURITY;

-- Allow inserts from anon/authenticated (tracking endpoint uses service role, but just in case)
CREATE POLICY "Allow insert ar_views" ON public.ar_views
  FOR INSERT WITH CHECK (true);

-- Allow select for service role (admin queries)
CREATE POLICY "Allow select ar_views" ON public.ar_views
  FOR SELECT USING (true);
