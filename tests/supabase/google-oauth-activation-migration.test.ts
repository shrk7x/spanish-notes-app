import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = join(
  process.cwd(),
  'supabase/migrations/20261003190758_auto_activate_google_oauth_profiles.sql',
);

describe('Google OAuth activation migration', () => {
  it('auto-activates Google OAuth profiles without disabling invite-only email signup', () => {
    const sql = readFileSync(migrationPath, 'utf8');

    expect(sql).toContain("NEW.raw_app_meta_data ->> 'provider'");
    expect(sql).toContain("= 'google'");
    expect(sql).toContain('INSERT INTO public.user_profiles (id, email, is_active)');
    expect(sql).toContain('public.ensure_user_profile');
    expect(sql).not.toContain('DROP TRIGGER IF EXISTS enforce_invite_only_email_signup');
    expect(sql).not.toContain('DROP TRIGGER IF EXISTS consume_email_invite_on_signup');
  });
});
