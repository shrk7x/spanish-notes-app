# Public email signup rollout

The application now offers `/auth/sign-up`, confirmation resend, `/auth/forgot-password` and an authenticated `/auth/update-password` page. `/auth/invite` redirects to signup with its email and safe return path. Google and existing PKCE callback links remain supported.

## Production configuration and deployment order

1. Review and apply `supabase/migrations/20261003181601_public_email_signup.sql` through the normal production migration process before releasing the UI. It removes invitation enforcement/consumption triggers, activates email profiles when Auth confirms the mailbox, and backfills only confirmed email accounts. Existing Google accounts, manual activations, notes and historical invitations remain intact. Clients can update only `target_language` on profiles; activation and plan fields are trusted server fields.
2. In Supabase Authentication, enable email/password signup and **Confirm email**. Do not disable confirmation to work around delivery failures. Check the password policy matches the UI (at least eight characters, uppercase, lowercase and a number). Review rate limits and abuse controls for public signup.
3. Configure production custom SMTP and its sender address. Complete the provider's domain verification and required SPF/DKIM DNS records; configure DMARC according to the sender's policy. Test deliverability with both Gmail and a non-Gmail mailbox, including spam folders. Supabase's default mail service is unsuitable for arbitrary production recipients.
4. Set Site URL to the canonical HTTPS application origin. Add the exact deployed `/auth/callback`, `/auth/callback?next=/app` and `/auth/callback?next=/auth/update-password` redirect URLs as required by the project's redirect matching. Include intended safe return URLs (`/app`, `/settings`, `/favorites`, and their supported subpaths/query variants). Keep broad wildcards limited to explicitly approved preview environments. Add localhost entries only for development. The server allows application destinations only; email recovery always lands at password update.
5. Set the confirmation and recovery templates below. Replace `SiteURL` only via the dashboard Site URL configuration; never put secrets in templates. These templates use the one-time `TokenHash` so the link works in another browser without the original PKCE verifier. Deploy the code providing `/auth/confirm` **before** switching templates to that endpoint. For a staged rollout, deploy code after migration, then switch templates and run the checks below; existing `/auth/callback?code=...` links continue working.

Confirmation template link:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=email">Confirm your email</a>
```

Recovery template link:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=recovery">Reset your password</a>
```

The fixed Site URL templates land confirmation at `/app`. To retain a chosen application return path, use the supplied RedirectTo (which already has a next query) instead:

```html
<a href="{{ .RedirectTo }}&amp;token_hash={{ .TokenHash }}&amp;type=email">Confirm your email</a>
```

Recovery always uses `type=recovery`; do not reuse the confirmation template for reset emails. Supported token types are explicitly `signup`, `email` and `recovery`. Invitation, magic-link and email-change tokens are rejected by these endpoints. Malformed, expired and already-used links redirect to the localized email sign-in page with resend and password-reset entry points. Never log token hashes, authorization codes or full email links.

## Live acceptance checks

- Register a new non-Google mailbox that has never been invited. Before confirmation, password sign-in should reject it and its profile must stay inactive. Check there are no new invite-consumption writes.
- Open the confirmation link in a different browser. Verify session cookies persist across navigation, profile activation, default collection/folder creation exactly once, and successful note creation.
- Repeat signup for an existing email and resend confirmation. Confirm neutral messages, rate-limit errors and disabled controls during requests. Resend must request a signup email rather than send a password reset.
- Follow recovery in another browser, save a valid new password, then test old/new password sign-in. Test an unauthenticated visit to `/auth/update-password`, a mismatched password, a server-rejected password and expired/reused links.
- Verify historical invite URLs still prefill normalized email, safe application returns survive, and external/protocol-relative return URLs cannot redirect off site. Test malformed token types and missing tokens.
- Verify existing Google login, manual activation, language preferences, notes and shares. Under an authenticated user role, editing `is_active`, `plan_type` or another profile must fail; editing own `target_language` must succeed. Ownership RLS must continue rejecting foreign note operations.
- Check the same registration, resend, recovery, validation and error UI in English and Chinese. Confirm mobile layout, keyboard focus and pending controls.

## Local evidence and limits

The complete local test suite, lint, TypeScript and build checks are recorded in the implementation report. In addition, a disposable PostgreSQL fixture ran the migration as `supabase_admin`: 15 acceptance checks passed for public insertion, confirmation activation/backfill, unconfirmed note rejection, Google, profile privilege restrictions, ownership, defaults/fallback and retained invitations. The pre-migration fixture rejected uninvited signup and allowed a client activation edit, demonstrating both changed behaviors.

No production migration, settings, SMTP, deployment or real email delivery was performed by local implementation. Production acceptance remains required. Existing already-active manually provisioned accounts are intentionally retained; this change does not revoke them. The migration is forward-only. If the UI needs rollback, retain the database change and confirmation configuration rather than reintroducing an invite trigger that would reject public users.

References: [Supabase password auth](https://supabase.com/docs/guides/auth/passwords), [email templates](https://supabase.com/docs/guides/auth/auth-email-templates), [custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls), [SSR clients](https://supabase.com/docs/guides/auth/server-side/creating-a-client).
