-- Auto-activate Google OAuth profiles while keeping invite-only email signup.
--
-- Email/password signup still goes through the hidden /auth/invite path and
-- remains protected by enforce_invite_only_email_signup from migration 008.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_collection_id uuid;
  provider text;
BEGIN
  provider := COALESCE(NEW.raw_app_meta_data ->> 'provider', '');

  -- Create user profile. Google OAuth users should not need an activation code.
  INSERT INTO public.user_profiles (id, email, is_active)
  VALUES (NEW.id, NEW.email, provider = 'google')
  ON CONFLICT (id) DO NOTHING;

  -- Create default collection
  INSERT INTO public.collections (user_id, name, is_default)
  VALUES (NEW.id, 'My Collection', true)
  RETURNING id INTO new_collection_id;

  -- Create default folder
  INSERT INTO public.folders (user_id, collection_id, name, is_default)
  VALUES (NEW.id, new_collection_id, 'My Notes', true);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.ensure_user_profile()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, is_active)
  SELECT
    auth.uid(),
    u.email,
    COALESCE(u.raw_app_meta_data ->> 'provider', '') = 'google'
  FROM auth.users u
  WHERE u.id = auth.uid()
  ON CONFLICT (id) DO NOTHING;
END;
$$;

-- Backfill existing Google OAuth profiles that were created before this change.
UPDATE public.user_profiles p
SET is_active = true
FROM auth.users u
WHERE p.id = u.id
  AND COALESCE(u.raw_app_meta_data ->> 'provider', '') = 'google'
  AND p.is_active = false;
