import { redirect } from 'next/navigation';
import EmailPasswordSignInForm from '@/components/EmailPasswordSignInForm';
import { resolveSafeNext } from '@/utils/auth/resolveSafeNext';
import { createServerClient } from '@/utils/supabase/server';

interface EmailSignInPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function resolvePrefillEmail(raw: string | string[] | undefined) {
  if (typeof raw !== 'string') {
    return '';
  }

  return raw.trim().toLowerCase();
}

export default async function EmailSignInPage({
  searchParams,
}: EmailSignInPageProps) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const params = await searchParams;
  const nextPath = resolveSafeNext(params.next);

  if (user && params.auth !== 'error') {
    redirect(nextPath);
  }

  const initialEmail = resolvePrefillEmail(params.email);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-12 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto flex min-h-[70vh] w-full max-w-3xl items-center justify-center">
        <EmailPasswordSignInForm
          initialEmail={initialEmail}
          nextPath={nextPath}
          linkError={params.auth === 'error'}
        />
      </div>
    </main>
  );
}
