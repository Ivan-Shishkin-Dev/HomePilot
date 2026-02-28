-- Create documents table for user documents
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'missing' CHECK (status IN ('verified', 'pending', 'missing')),
  icon TEXT NOT NULL,
  file_url TEXT,
  uploaded_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "documents_select_own" ON public.documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "documents_insert_own" ON public.documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "documents_update_own" ON public.documents FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "documents_delete_own" ON public.documents FOR DELETE USING (auth.uid() = user_id);

-- Function to create default documents for new users
CREATE OR REPLACE FUNCTION public.create_default_documents()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.documents (user_id, name, status, icon) VALUES
    (NEW.id, 'Government ID', 'missing', 'id'),
    (NEW.id, 'Proof of Income', 'missing', 'income'),
    (NEW.id, 'Bank Statements', 'missing', 'bank'),
    (NEW.id, 'Employment Letter', 'missing', 'employment'),
    (NEW.id, 'Credit Report', 'missing', 'credit'),
    (NEW.id, 'References', 'missing', 'references');
  RETURN NEW;
END;
$$;

-- Trigger to create default documents after profile is created
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_documents();
