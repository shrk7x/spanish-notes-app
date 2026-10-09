'use client';

import { FormEvent, useState } from 'react';
import { createBrowserClient } from '@/utils/supabase/client';
import { useI18n } from '@/components/I18nProvider';
import Link from 'next/link';
import ConfirmationResendButton from '@/components/ConfirmationResendButton';
import { resolveSafeNext } from '@/utils/auth/resolveSafeNext';
import { ROUTES } from '@/constants';
import { Mail } from 'lucide-react';

interface InviteEmailSignupFormProps {
  initialEmail?: string;
  nextPath?: string;
}

const MIN_PASSWORD_LENGTH = 8;
// 密码强度：分条校验，给出精确的缺失提示
const HAS_LOWERCASE = /[a-z]/;
const HAS_UPPERCASE = /[A-Z]/;
const HAS_NUMBER = /[0-9]/;

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export default function InviteEmailSignupForm({
  initialEmail = '',
  nextPath = ROUTES.app,
}: InviteEmailSignupFormProps) {
  const { t } = useI18n();
  const [email, setEmail] = useState(normalizeEmail(initialEmail));
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successEmail, setSuccessEmail] = useState<string | null>(null);

  const mapErrorMessage = (rawMessage: string) => {
    const normalized = rawMessage.toLowerCase();

    // Supabase 密码强度策略错误：只靠关键字检测
    if (
      normalized.includes('password should contain') ||
      normalized.includes('password is too weak')
    ) {
      return t('inviteSignup.passwordWeakGeneric');
    }

    return t('inviteSignup.genericError');
  };

  const validateForm = (normalizedEmail: string) => {
    if (!normalizedEmail || !password || !confirmPassword) {
      return t('inviteSignup.invalidInput');
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return t('inviteSignup.passwordTooShort');
    }

    // 分条校验，精确告知缺少哪类字符
    if (!HAS_LOWERCASE.test(password)) {
      return t('inviteSignup.passwordMissingLower');
    }
    if (!HAS_UPPERCASE.test(password)) {
      return t('inviteSignup.passwordMissingUpper');
    }
    if (!HAS_NUMBER.test(password)) {
      return t('inviteSignup.passwordMissingNumber');
    }

    if (password !== confirmPassword) {
      return t('inviteSignup.passwordMismatch');
    }

    return null;
  };

  const normalizedEmail = normalizeEmail(email);
  // canSubmit 只做基础检查：邮箱非空 + 密码不为空 + 两次一致
  // 密码强度校验故意留给 validateForm，这样用户能看到精确的缺字符错误提示
  const canSubmit =
    Boolean(normalizedEmail) &&
    password.length > 0 &&
    confirmPassword.length > 0 &&
    password === confirmPassword;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    const validationError = validateForm(normalizedEmail);

    if (validationError) {
      setErrorMessage(validationError);
      setSuccessEmail(null);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const supabase = createBrowserClient();
      const { error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(resolveSafeNext(nextPath))}`,
        },
      });

      if (error) {
        setErrorMessage(mapErrorMessage(error.message));
        setSuccessEmail(null);
        return;
      }

      setSuccessEmail(normalizedEmail);
      setPassword('');
      setConfirmPassword('');
    } catch {
      setErrorMessage(t('inviteSignup.genericError'));
      setSuccessEmail(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 注册成功后完全替换表单，避免与表单混在一起造成困惑
  if (successEmail) {
    return (
      <section
        role="status"
        aria-live="polite"
        className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-7 text-slate-900 shadow-xl dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
            <Mail className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            {t('inviteSignup.successTitle')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('inviteSignup.successBody')}
          </p>
          <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-mono font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {successEmail}
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {t('inviteSignup.successHint')}
          </p>
          <ConfirmationResendButton email={successEmail} nextPath={nextPath} />
          <div className="mt-4 w-full border-t border-slate-100 pt-3 text-center dark:border-slate-800">
            <Link
              href={`${ROUTES.authSignIn}?next=${encodeURIComponent(resolveSafeNext(nextPath))}`}
              className="text-xs font-medium text-blue-600 hover:text-blue-500 hover:underline dark:text-blue-400"
            >
              {t('emailAuth.signIn')}
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-7 text-slate-900 shadow-xl dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{t('inviteSignup.title')}</h1>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        {t('inviteSignup.subtitle')}
      </p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <label
          className="block text-sm font-medium"
          htmlFor="invite-signup-email"
        >
          {t('inviteSignup.emailLabel')}
        </label>
        <input
          id="invite-signup-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500/40 placeholder:text-slate-400 focus:ring-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
        />

        <div className="flex items-center justify-between gap-3">
          <label
            className="block text-sm font-medium"
            htmlFor="invite-signup-password"
          >
            {t('inviteSignup.passwordLabel')}
          </label>
          <button
            type="button"
            aria-pressed={showPasswords}
            onClick={() => setShowPasswords((value) => !value)}
            className="rounded-md px-2 py-1 text-sm font-medium text-blue-700 transition-colors hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 dark:text-blue-300 dark:hover:text-blue-200"
          >
            {showPasswords
              ? t('inviteSignup.hidePasswords')
              : t('inviteSignup.showPasswords')}
          </button>
        </div>
        <input
          id="invite-signup-password"
          type={showPasswords ? 'text' : 'password'}
          autoComplete="new-password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            setErrorMessage(null);
            setSuccessEmail(null);
          }}
          aria-describedby="invite-signup-password-help"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500/40 placeholder:text-slate-400 focus:ring-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
        />
        <p
          id="invite-signup-password-help"
          className="text-sm text-slate-500 dark:text-slate-400"
        >
          {t('inviteSignup.passwordRequirements')}
        </p>

        <label
          className="block text-sm font-medium"
          htmlFor="invite-signup-confirm-password"
        >
          {t('inviteSignup.confirmPasswordLabel')}
        </label>
        <input
          id="invite-signup-confirm-password"
          type={showPasswords ? 'text' : 'password'}
          autoComplete="new-password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          value={confirmPassword}
          onChange={(event) => {
            setConfirmPassword(event.target.value);
            setErrorMessage(null);
            setSuccessEmail(null);
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
          disabled={isSubmitting || !canSubmit}
          aria-busy={isSubmitting}
          className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting
            ? t('inviteSignup.submitting')
            : t('inviteSignup.submit')}
        </button>
      </form>
      <div className="mt-5 text-center text-xs text-slate-500 dark:text-slate-400">
        <span>{t('auth.hasAccount') || '已有账号？'} </span>
        <Link
          className="font-medium text-blue-600 hover:text-blue-500 hover:underline dark:text-blue-400"
          href={`${ROUTES.authSignIn}?next=${encodeURIComponent(resolveSafeNext(nextPath))}`}
        >
          {t('emailAuth.signIn')}
        </Link>
      </div>
    </section>
  );
}
