-- Create profile_suggestions table
CREATE TABLE IF NOT EXISTS public.profile_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  impact INTEGER NOT NULL DEFAULT 5,
  category TEXT NOT NULL,
  auto_applied BOOLEAN DEFAULT FALSE,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profile_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "suggestions_select_own" ON public.profile_suggestions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "suggestions_insert_own" ON public.profile_suggestions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "suggestions_update_own" ON public.profile_suggestions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "suggestions_delete_own" ON public.profile_suggestions FOR DELETE USING (auth.uid() = user_id);

-- Function to create default suggestions for new users
CREATE OR REPLACE FUNCTION public.create_default_suggestions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profile_suggestions (user_id, action, impact, category, auto_applied) VALUES
    (NEW.id, 'Upload last 3 months bank statements', 15, 'Financial', FALSE),
    (NEW.id, 'Add employer reference letter', 12, 'Employment', TRUE),
    (NEW.id, 'Complete credit authorization', 18, 'Credit', FALSE),
    (NEW.id, 'Add guarantor information', 22, 'Financial', FALSE),
    (NEW.id, 'Verify student enrollment status', 8, 'Identity', TRUE),
    (NEW.id, 'Link LinkedIn profile', 5, 'Identity', FALSE);
  RETURN NEW;
END;
$$;

-- Trigger to create default suggestions after profile is created
DROP TRIGGER IF EXISTS on_profile_created_suggestions ON public.profiles;
CREATE TRIGGER on_profile_created_suggestions
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_suggestions();
