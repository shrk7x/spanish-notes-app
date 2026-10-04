'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@/utils/supabase/client';
import { useI18n } from '@/components/I18nProvider';
import { ROUTES } from '@/constants';

export default function AuthGate() {
  const { t } = useI18n();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  const nextQuery = searchParams?.toString();
  const nextPath = nextQuery ? `${pathname}?${nextQuery}` : pathname;
  const emailSignInHref = `${ROUTES.authSignIn}?next=${encodeURIComponent(nextPath)}`;

  useEffect(() => {
    const supabase = createBrowserClient();

    supabase.auth
      .getSession()
      .then(({ data }) => {
        setIsAuthenticated(Boolean(data.session));
      })
      .catch(() => {
        setIsAuthenticated(false);
      });
  }, []);

  if (isAuthenticated !== false) {
    return null;
  }

  const handleLogin = async () => {
    const supabase = createBrowserClient();
    const next = `${window.location.pathname}${window.location.search}`;
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/20 backdrop-blur-sm dark:bg-black/60">
      <div
        data-testid="auth-card"
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-xl dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      >
        <h1 className="text-2xl font-bold">{t('auth.title')}</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          {t('auth.subtitle')}
        </p>
        <button
          onClick={handleLogin}
          className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-500"
        >
          {t('auth.button')}
        </button>
        <Link
          href={emailSignInHref}
          className="mt-4 inline-flex text-sm font-medium text-blue-600 transition-colors hover:text-blue-500 dark:text-blue-300 dark:hover:text-blue-200"
        >
          {t('auth.emailLink')}
        </Link>
        <Link
          href={`${ROUTES.authSignUp}?next=${encodeURIComponent(nextPath)}`}
          className="ml-4 text-sm font-medium text-blue-600 dark:text-blue-300"
        >
          {t('emailAuth.signUp')}
        </Link>
      </div>
    </div>
  );
}
