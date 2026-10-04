-- Public email registration, activated only by trusted Auth confirmation.
-- Historical invitations and manual activations are retained.
BEGIN;

DROP TRIGGER IF EXISTS enforce_invite_only_email_signup ON auth.users;
DROP TRIGGER IF EXISTS consume_email_invite_on_signup ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_collection_id uuid;
  provider text := COALESCE(NEW.raw_app_meta_data ->> 'provider', '');
BEGIN
  INSERT INTO public.user_profiles (id, email, is_active)
  VALUES (NEW.id, NEW.email,
    provider = 'google' OR (provider = 'email' AND NEW.email_confirmed_at IS NOT NULL))
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.collections (user_id, name, is_default)
  VALUES (NEW.id, 'My Collection', true)
  RETURNING id INTO new_collection_id;

  INSERT INTO public.folders (user_id, collection_id, name, is_default)
  VALUES (NEW.id, new_collection_id, 'My Notes', true);
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.ensure_user_profile()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  INSERT INTO public.user_profiles (id, email, is_active)
  SELECT u.id, u.email,
    COALESCE(u.raw_app_meta_data ->> 'provider', '') = 'google'
    OR (COALESCE(u.raw_app_meta_data ->> 'provider', '') = 'email'
        AND u.email_confirmed_at IS NOT NULL)
  FROM auth.users u WHERE u.id = auth.uid()
  ON CONFLICT (id) DO UPDATE
    SET is_active = public.user_profiles.is_active OR EXCLUDED.is_active;
END;
$$;
REVOKE ALL ON FUNCTION public.ensure_user_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_user_profile() TO authenticated;

CREATE OR REPLACE FUNCTION public.activate_confirmed_email_profile()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF COALESCE(NEW.raw_app_meta_data ->> 'provider', '') = 'email'
     AND NEW.email_confirmed_at IS NOT NULL THEN
    INSERT INTO public.user_profiles (id, email, is_active)
    VALUES (NEW.id, NEW.email, true)
    ON CONFLICT (id) DO UPDATE SET is_active = true;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.activate_confirmed_email_profile() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS activate_confirmed_email_profile ON auth.users;
CREATE TRIGGER activate_confirmed_email_profile
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  WHEN (OLD.email_confirmed_at IS DISTINCT FROM NEW.email_confirmed_at)
  EXECUTE FUNCTION public.activate_confirmed_email_profile();

-- Only confirmed email accounts are backfilled; preserve all other activations.
INSERT INTO public.user_profiles (id, email, is_active)
SELECT u.id, u.email, true FROM auth.users u
WHERE COALESCE(u.raw_app_meta_data ->> 'provider', '') = 'email'
  AND u.email_confirmed_at IS NOT NULL
ON CONFLICT (id) DO UPDATE SET is_active = true;

-- Authorization fields must not be user-editable. The app only updates language.
-- Remove column grants as well as table grants inherited from old/default setup.
REVOKE INSERT, UPDATE, DELETE ON public.user_profiles FROM PUBLIC, anon, authenticated;
REVOKE UPDATE (id, email, is_active, storage_used, plan_type, target_language, created_at)
  ON public.user_profiles FROM PUBLIC, anon, authenticated;
GRANT UPDATE (target_language) ON public.user_profiles TO authenticated;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

COMMIT;
