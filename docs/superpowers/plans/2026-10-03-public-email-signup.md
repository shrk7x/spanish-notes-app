# Public email signup implementation plan

> **For agentic workers:** Use superpowers:subagent-driven-development to implement the cohesive auth task and independently review it.

**Goal:** Allow any mailbox to register, confirm and use notes without an invitation or activation code.

**Architecture:** Extend existing Supabase email/password UI and server callbacks. A new forward-only migration removes invitation triggers and activates trusted confirmed email accounts. Keep deployment configuration explicit.

**Tech Stack:** Next.js 16, React 19, Supabase SSR, PostgreSQL, Vitest.

## Global constraints

- Work in existing checkout on `codex/public-email-signup`, based on updated `origin/master`.
- Preserve untracked `pr_description-share-top-banner.md` and unrelated changes.
- Retain Google login, ownership RLS and historical user data; never authorize via user metadata.
- Require email verification; activation-code gating must not block confirmed email users.
- Maintain English and Chinese copy and safe local return paths.
- Do not modify production or deploy as part of local implementation.

### Task 1: Complete public email authentication

**Files:** Existing auth pages, signup/login forms, `AuthGate`, messages and constants; new password recovery/update pages and confirmation endpoint; new migration; auth tests; rollout documentation.

**Interfaces:** Use existing `createBrowserClient`, `createServerClient`, `getSupabaseConfig`, `resolveSafeNext`, `ROUTES`, and `useI18n`. Supabase calls: `signUp`, `signInWithPassword`, `resend`, `resetPasswordForEmail`, `updateUser`, `verifyOtp` and `exchangeCodeForSession`.

- [ ] Write behavioral tests covering public registration entry, confirmation resend and errors, recovery/update flows, safe redirects, token-hash confirmations and malformed/expired links. Run to observe failures before implementation.
- [ ] Reuse existing signup validation on `/auth/sign-up`; redirect old `/auth/invite` links preserving email; remove invite-only copy and provide signup/forgot-password links on login and public auth entry.
- [ ] Implement confirmation resend and password recovery/update using Supabase, pending/error/success states and localized copy. Guard update-password page with a verified session. Validate server confirmation types and safe return paths, set cookies on response.
- [ ] Discover Supabase CLI migration creation command and create forward migration. Remove invite gate and consumption triggers; update profile creation/fallback using trusted provider and confirmed-email state; activate profiles upon confirmation and backfill only confirmed email accounts. Preserve manual activation and other provider behavior.
- [ ] Add rollout guide with SMTP, sender DNS, confirmation and recovery templates using `TokenHash`, redirect allowlist, deployment order and live acceptance checks. Do not expose credentials.
- [ ] Run focused tests, full tests, lint, TypeScript and build. Review diff and commit only this task's files. Provide report with failures observed before fixes, final validation results and limitations.

### Task 2: Independent review and fixes

- [ ] Review committed diff against design and security requirements; inspect migration and recovery/confirmation flows for actual defects.
- [ ] Fix important findings, add regression coverage and rerun affected checks.
- [ ] Record final branch, commits, checks and remaining production configuration requirements.
