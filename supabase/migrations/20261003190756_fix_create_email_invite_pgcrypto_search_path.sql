-- Fix create_email_invite() token generation when pgcrypto lives in extensions schema.
ALTER FUNCTION public.create_email_invite(TEXT, TIMESTAMP WITH TIME ZONE, TEXT)
  SET search_path TO public, extensions;
