-- Prevent duplicate document rows per user: one row per (user_id, icon).
-- Run this after 002_create_documents.sql (and after you have documents table with data).

-- Step 1: Delete duplicate rows, keeping one per (user_id, icon).
-- Prefer the row that has been uploaded (file_url or status != 'missing'); otherwise keep oldest.
DELETE FROM public.documents
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      row_number() OVER (
        PARTITION BY user_id, icon
        ORDER BY (CASE WHEN (file_url IS NOT NULL OR status != 'missing') THEN 0 ELSE 1 END) ASC,
                 created_at ASC
      ) AS rn
    FROM public.documents
  ) sub
  WHERE rn > 1
);

-- Step 2: Enforce one document per (user_id, icon).
ALTER TABLE public.documents
  ADD CONSTRAINT documents_user_id_icon_key UNIQUE (user_id, icon);

-- Step 3: Trigger should not insert when rows already exist (e.g. client seeded first).
CREATE OR REPLACE FUNCTION public.create_default_documents()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.documents (user_id, name, status, icon)
  VALUES
    (NEW.id, 'Government ID', 'missing', 'id'),
    (NEW.id, 'Proof of Income', 'missing', 'income'),
    (NEW.id, 'Bank Statements', 'missing', 'bank'),
    (NEW.id, 'Employment Letter', 'missing', 'employment'),
    (NEW.id, 'Credit Report', 'missing', 'credit'),
    (NEW.id, 'References', 'missing', 'references')
  ON CONFLICT (user_id, icon) DO NOTHING;
  RETURN NEW;
END;
$$;
