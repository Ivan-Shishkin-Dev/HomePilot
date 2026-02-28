-- Create listings table (public data, readable by all authenticated users)
CREATE TABLE IF NOT EXISTS public.listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  price INTEGER NOT NULL,
  beds INTEGER NOT NULL,
  baths INTEGER NOT NULL,
  sqft INTEGER NOT NULL,
  demand TEXT NOT NULL DEFAULT 'Medium' CHECK (demand IN ('Low', 'Medium', 'High', 'Very High')),
  image TEXT,
  crime_index INTEGER DEFAULT 0,
  rent_trend TEXT,
  neighborhood_risk TEXT DEFAULT 'Low' CHECK (neighborhood_risk IN ('Low', 'Medium', 'High')),
  scam_score INTEGER DEFAULT 0,
  time_left TEXT,
  ai_suggestion TEXT,
  competition_score INTEGER DEFAULT 50,
  features TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read listings
CREATE POLICY "listings_select_authenticated" ON public.listings FOR SELECT TO authenticated USING (true);

-- Create user_listing_matches table for personalized match scores
CREATE TABLE IF NOT EXISTS public.user_listing_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  match_percent INTEGER NOT NULL DEFAULT 50,
  is_saved BOOLEAN DEFAULT FALSE,
  has_applied BOOLEAN DEFAULT FALSE,
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, listing_id)
);

-- Enable RLS
ALTER TABLE public.user_listing_matches ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_listing_matches
CREATE POLICY "matches_select_own" ON public.user_listing_matches FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "matches_insert_own" ON public.user_listing_matches FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "matches_update_own" ON public.user_listing_matches FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "matches_delete_own" ON public.user_listing_matches FOR DELETE USING (auth.uid() = user_id);
