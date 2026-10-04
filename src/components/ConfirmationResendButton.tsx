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
    <div className="mt-4 space-y-2">
      <button
        type="button"
        className="text-blue-600 disabled:opacity-60"
        disabled={pending || !email}
        aria-busy={pending}
        onClick={resend}
      >
        {t(pending ? 'emailAuth.sending' : 'emailAuth.resend')}
      </button>
      {result && (
        <p role={result === 'error' ? 'alert' : 'status'}>
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
