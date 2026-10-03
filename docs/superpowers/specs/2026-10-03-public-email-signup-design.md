# Public email signup

Approved in chat: accept any valid mailbox using email/password, retain Google login, require email confirmation, remove invitation and activation-code barriers. User authorizes syncing master, creating a new feature branch, and completing the work autonomously in the existing checkout.

Reuse Supabase Auth and current signup form. Publish `/auth/sign-up`, keep `/auth/invite` as a compatibility redirect. Add discoverable signup/login links, confirmation resend, forgot-password and authenticated password-update pages. Preserve safe local return paths. Support confirmation and recovery links opened in a different browser with server-side token-hash verification as well as current PKCE callbacks.

Add a forward-only migration disabling invitation triggers. Set active status from trusted auth provider and confirmed email; activate profiles when email confirmation changes and backfill existing confirmed email users. Keep ownership RLS, existing notes, Google users and historical invitation records. Never derive authorization from user-editable metadata.

Document rollout requirements: Supabase email signup enabled, confirmation enabled, production SMTP and sender domain configured, URL allowlist and email templates configured. Local code completion does not imply production settings changed or actual email delivery tested.

Acceptance: non-Google users can register without invitation, confirm and create notes; unconfirmed emails cannot obtain application access; users can resend confirmation and reset their password; old invite links and existing Google accounts continue working. Errors, expired links and repeated submissions are handled with English and Chinese copy. Relevant tests, full test suite, lint and build/type checks must be verified.
