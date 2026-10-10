'use client';
import { useState } from 'react';
import { createBrowserClient } from '@/utils/supabase/client';
import { useI18n } from '@/components/I18nProvider';
import { resolveSafeNext } from '@/utils/auth/resolveSafeNext';

export default function ConfirmationResendButton({
  email,
  nextPath,
}: {
  email: string;
  nextPath?: string;
}) {
  const { t } = useI18n();
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<'success' | 'error' | null>(null);
  async function resend() {
    if (pending) return;
    setPending(true);
    setResult(null);
    try {
      const { error } = await createBrowserClient().auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(resolveSafeNext(nextPath))}`,
        },
      });
      setResult(error ? 'error' : 'success');
    } catch {
      setResult('error');
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="mt-4 flex flex-col items-center space-y-2">
      <button
        type="button"
        className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-750"
        disabled={pending || !email}
        aria-busy={pending}
        onClick={resend}
      >
        {t(pending ? 'emailAuth.sending' : 'emailAuth.resend')}
      </button>
      {result && (
        <p
          role={result === 'error' ? 'alert' : 'status'}
          className={`text-xs font-medium ${
            result === 'error'
              ? 'text-rose-600 dark:text-rose-400'
              : 'text-emerald-600 dark:text-emerald-400'
          }`}
        >
          {t(
            result === 'error'
              ? 'emailAuth.sendError'
              : 'emailAuth.resendSuccess'
          )}
        </p>
      )}
    </div>
  );
}
