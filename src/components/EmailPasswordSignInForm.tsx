'use client';

import Link from 'next/link';
import ConfirmationResendButton from '@/components/ConfirmationResendButton';
import { ROUTES } from '@/constants';
import { resolveSafeNext } from '@/utils/auth/resolveSafeNext';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/utils/supabase/client';
import { useI18n } from '@/components/I18nProvider';

interface EmailPasswordSignInFormProps {
  initialEmail?: string;
  nextPath?: string;
  linkError?: boolean;
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export default function EmailPasswordSignInForm({
  initialEmail = '',
  nextPath = ROUTES.app,
  linkError = false,
}: EmailPasswordSignInFormProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [email, setEmail] = useState(normalizeEmail(initialEmail));
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mapErrorMessage = (rawMessage: string) => {
    const normalized = rawMessage.toLowerCase();

    if (normalized.includes('invalid login credentials')) {
      return t('emailSignIn.invalidCredentials');
    }

    if (normalized.includes('email not confirmed')) {
      setNeedsConfirmation(true);
      return t('emailSignIn.emailNotConfirmed');
    }

    return t('emailSignIn.genericError');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !password) {
      setErrorMessage(t('emailSignIn.invalidInput'));
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const supabase = createBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) {
        setErrorMessage(mapErrorMessage(error.message));
        return;
      }

      router.replace(resolveSafeNext(nextPath));
      router.refresh();
    } catch {
      setErrorMessage(t('emailSignIn.genericError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-xl dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
      <h1 className="text-2xl font-bold">{t('emailSignIn.title')}</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-400">
        {t('emailSignIn.subtitle')}
      </p>

      {linkError && <p role="alert">{t('emailAuth.linkError')}</p>}
      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <label
          className="block text-sm font-medium"
          htmlFor="email-signin-email"
        >
          {t('emailSignIn.emailLabel')}
        </label>
        <input
          id="email-signin-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setErrorMessage(null);
          }}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500/40 placeholder:text-slate-400 focus:ring-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
        />

        <label
          className="block text-sm font-medium"
          htmlFor="email-signin-password"
        >
          {t('emailSignIn.passwordLabel')}
        </label>
        <input
          id="email-signin-password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            setErrorMessage(null);
          }}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500/40 placeholder:text-slate-400 focus:ring-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
        />

        {errorMessage && (
          <p
            role="alert"
            aria-live="assertive"
            className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
          >
            {errorMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
          className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? t('emailSignIn.submitting') : t('emailSignIn.submit')}
        </button>
      </form>
      {(needsConfirmation || linkError) && (
        <ConfirmationResendButton
          email={normalizeEmail(email)}
          nextPath={nextPath}
        />
      )}
      <nav className="mt-4 flex flex-wrap gap-4 text-sm text-blue-600">
        <Link
          href={`${ROUTES.authSignUp}?next=${encodeURIComponent(resolveSafeNext(nextPath))}`}
        >
          {t('emailAuth.signUp')}
        </Link>
        <Link href={ROUTES.authForgotPassword}>{t('emailAuth.forgot')}</Link>
      </nav>
    </section>
  );
}
