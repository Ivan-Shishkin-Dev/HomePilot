-- Saved listings (works with static listing IDs or Supabase listing UUIDs)
CREATE TABLE IF NOT EXISTS public.user_saved_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, listing_id)
);

ALTER TABLE public.user_saved_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saved_select_own" ON public.user_saved_listings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "saved_insert_own" ON public.user_saved_listings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "saved_delete_own" ON public.user_saved_listings FOR DELETE USING (auth.uid() = user_id);
