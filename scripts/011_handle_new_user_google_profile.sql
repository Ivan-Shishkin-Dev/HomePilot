-- Update profile creation trigger to set name and avatar from Google (and other OAuth) metadata.
-- Run in Supabase SQL Editor after 001_create_profiles.sql.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta jsonb;
  full_name text;
  first_part text;
  last_part text;
  avatar text;
BEGIN
  meta := NEW.raw_user_meta_data;
  full_name := COALESCE(meta ->> 'full_name', meta ->> 'name', '');
  first_part := COALESCE(nullif(trim(meta ->> 'first_name'), ''), split_part(trim(full_name), ' ', 1));
  last_part := COALESCE(nullif(trim(meta ->> 'last_name'), ''), nullif(trim(substring(trim(full_name) || ' ' from position(' ' in trim(full_name) || ' ') + 1)), ''));
  avatar := COALESCE(meta ->> 'avatar_url', meta ->> 'picture');

  INSERT INTO public.profiles (id, email, first_name, last_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    nullif(first_part, ''),
    nullif(last_part, ''),
    nullif(avatar, '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
