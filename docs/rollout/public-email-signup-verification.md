# Public email signup verification

Implementation branch: `codex/public-email-signup`, based on synchronized `master` at `560887e`.

Feature commit: `235705d`. Review fixes: `24e2288`.

## Verified locally

- Full suite: 47 test files, 196 tests passed after final fixes.
- Production Next.js build passed; changed authentication files passed ESLint.
- Disposable PostgreSQL: 15 acceptance checks passed. The old rules rejected uninvited email registration and allowed client activation edits. The new migration accepts ordinary email registration, backfills confirmed email profiles, leaves unconfirmed profiles inactive, activates on confirmation, permits confirmed note creation, rejects unconfirmed and foreign note inserts, rejects client activation/plan edits, preserves language edits, Google profiles, defaults, fallback and invitation records.
- Built-app browser checks passed for signup/login/recovery navigation, invalid-link guidance, legacy invite email/return preservation, and the unauthenticated password-update redirect. These checks did not submit emails.
- Independent whole-branch review passed both specification and code quality. Two minor findings were fixed and independently re-reviewed: success/resend now use the submitted mailbox snapshot, and authenticated visitors can see invalid-link guidance. Both regression tests were observed failing before their fixes.

## Existing repository checks

Whole-repository ESLint still reports 21 existing errors and 8 warnings; the archived baseline had the same errors and 9 warnings. Standalone `tsc --noEmit` reports the same 7 existing test-fixture diagnostics as the archived baseline. These are unrelated to the changed authentication files. No checks were disabled, no dependencies changed, and no unrelated runtime fixes were included.

## Production acceptance remains

The migration has not been applied to production. Production SMTP delivery, Supabase confirmation settings, redirect allowlists, email templates, and actual cross-browser confirmation/recovery require verification during rollout. Follow [the rollout guide](public-email-signup.md). A successful local build and PostgreSQL fixture do not establish production email delivery.

The user's untracked `pr_description-share-top-banner.md` was preserved.
