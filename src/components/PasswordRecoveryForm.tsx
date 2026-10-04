'use client';
import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { createBrowserClient } from '@/utils/supabase/client';
import { useI18n } from '@/components/I18nProvider';
import { ROUTES } from '@/constants';

export default function PasswordRecoveryForm({
  mode = 'recover',
}: {
  mode?: 'recover' | 'update';
}) {
  const { t } = useI18n();
  const update = mode === 'update';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError(null);
    setSuccess(false);
    if (update) {
      if (password !== confirm) {
        setError(t('inviteSignup.passwordMismatch'));
        return;
      }
      if (
        password.length < 8 ||
        !/[a-z]/.test(password) ||
        !/[A-Z]/.test(password) ||
        !/[0-9]/.test(password)
      ) {
        setError(t('inviteSignup.passwordRequirements'));
        return;
      }
    } else if (!email.trim()) {
      setError(t('emailSignIn.invalidInput'));
      return;
    }
    setPending(true);
    try {
      const supabase = createBrowserClient();
      const { error } = update
        ? await supabase.auth.updateUser({ password })
        : await supabase.auth.resetPasswordForEmail(
            email.trim().toLowerCase(),
            {
              redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(ROUTES.authUpdatePassword)}`,
            }
          );
      if (error) {
        setError(t(update ? 'emailAuth.updateError' : 'emailAuth.sendError'));
        return;
      }
      setSuccess(true);
      setPassword('');
      setConfirm('');
    } catch {
      setError(t(update ? 'emailAuth.updateError' : 'emailAuth.sendError'));
    } finally {
      setPending(false);
    }
  }
  const inputClass =
    'w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700';
  return (
    <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-xl dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
      <h1 className="text-2xl font-bold">
        {t(update ? 'emailAuth.updateTitle' : 'emailAuth.recoveryTitle')}
      </h1>
      {!update && (
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          {t('emailAuth.recoveryBody')}
        </p>
      )}
      {success ? (
        <div className="mt-6 space-y-4">
          <p role="status">
            {t(
              update ? 'emailAuth.updateSuccess' : 'emailAuth.recoverySuccess'
            )}
          </p>
          <Link
            href={update ? ROUTES.app : ROUTES.authSignIn}
            className="text-blue-600"
          >
            {t(update ? 'emailAuth.continue' : 'emailAuth.signIn')}
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-4">
          {update ? (
            <>
              <label className="block" htmlFor="new-password">
                {t('inviteSignup.passwordLabel')}
              </label>
              <input
                className={inputClass}
                id="new-password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <p className="text-sm text-slate-500">
                {t('inviteSignup.passwordRequirements')}
              </p>
              <label className="block" htmlFor="confirm-new-password">
                {t('inviteSignup.confirmPasswordLabel')}
              </label>
              <input
                className={inputClass}
                id="confirm-new-password"
                type="password"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </>
          ) : (
            <>
              <label className="block" htmlFor="recovery-email">
                {t('emailSignIn.emailLabel')}
              </label>
              <input
                className={inputClass}
                id="recovery-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </>
          )}
          {error && (
            <p role="alert" className="text-rose-600">
              {error}
            </p>
          )}
          <button
            disabled={pending}
            aria-busy={pending}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white disabled:opacity-60"
          >
            {t(
              pending
                ? update
                  ? 'emailAuth.saving'
                  : 'emailAuth.sending'
                : update
                  ? 'emailAuth.savePassword'
                  : 'emailAuth.sendReset'
            )}
          </button>
        </form>
      )}
    </section>
  );
}
