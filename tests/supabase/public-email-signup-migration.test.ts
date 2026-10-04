import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const name = readdirSync('supabase/migrations').find((name) =>
  name.endsWith('_public_email_signup.sql')
)!;
const sql = readFileSync(`supabase/migrations/${name}`, 'utf8');
describe('public email migration contract', () => {
  it('removes invitation enforcement and consumption without dropping data', () => {
    expect(sql).toContain(
      'DROP TRIGGER IF EXISTS enforce_invite_only_email_signup'
    );
    expect(sql).toContain(
      'DROP TRIGGER IF EXISTS consume_email_invite_on_signup'
    );
    expect(sql).not.toMatch(/DROP TABLE|DELETE FROM/i);
  });
  it('activates on Auth email confirmation changes and keeps metadata trusted', () => {
    expect(sql).toContain('AFTER UPDATE OF email_confirmed_at');
    expect(sql).toContain(
      "provider = 'email' AND NEW.email_confirmed_at IS NOT NULL"
    );
    expect(sql).not.toContain('raw_user_meta_data');
  });
  it('locks down client authorization fields while retaining language edits', () => {
    expect(sql).toContain('GRANT UPDATE (target_language)');
    expect(sql).toContain('REVOKE INSERT, UPDATE, DELETE');
    expect(sql).toContain('WITH CHECK ((SELECT auth.uid()) = id)');
  });
});
