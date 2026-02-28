-- Create alerts table for AI notifications
CREATE TABLE IF NOT EXISTS public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  urgency TEXT NOT NULL DEFAULT 'medium' CHECK (urgency IN ('low', 'medium', 'high', 'urgent')),
  type TEXT NOT NULL DEFAULT 'match' CHECK (type IN ('match', 'price_drop', 'new_listing', 'competition', 'document', 'system')),
  ai_reasons TEXT[],
  is_read BOOLEAN DEFAULT FALSE,
  is_dismissed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "alerts_select_own" ON public.alerts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "alerts_insert_own" ON public.alerts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "alerts_update_own" ON public.alerts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "alerts_delete_own" ON public.alerts FOR DELETE USING (auth.uid() = user_id);
