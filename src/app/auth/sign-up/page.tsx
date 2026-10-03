import { redirect } from 'next/navigation';
import InviteEmailSignupForm from '@/components/InviteEmailSignupForm';
import { createServerClient } from '@/utils/supabase/server';
import { resolveSafeNext } from '@/utils/auth/resolveSafeNext';

interface SignupPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function resolvePrefillEmail(raw: string | string[] | undefined) {
  if (typeof raw !== 'string') {
    return '';
  }

  return raw.trim().toLowerCase();
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const params = await searchParams;
  const initialEmail = resolvePrefillEmail(params.email);
  const nextPath = resolveSafeNext(params.next);

  if (user) redirect(nextPath);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-12 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto flex min-h-[70vh] w-full max-w-3xl items-center justify-center">
        <InviteEmailSignupForm
          initialEmail={initialEmail}
          nextPath={nextPath}
        />
      </div>
    </main>
  );
}
