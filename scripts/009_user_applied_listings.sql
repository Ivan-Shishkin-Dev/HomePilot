-- Applied listings (user clicked through to Zillow/Apartments and confirmed they applied)
CREATE TABLE IF NOT EXISTS public.user_applied_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, listing_id)
);

ALTER TABLE public.user_applied_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "applied_select_own" ON public.user_applied_listings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "applied_insert_own" ON public.user_applied_listings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "applied_delete_own" ON public.user_applied_listings FOR DELETE USING (auth.uid() = user_id);
