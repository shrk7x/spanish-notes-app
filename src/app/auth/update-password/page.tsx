import { redirect } from 'next/navigation';
import PasswordRecoveryForm from '@/components/PasswordRecoveryForm';
import { createServerClient } from '@/utils/supabase/server';
import { ROUTES } from '@/constants';
export default async function UpdatePage() {
  const supabase = await createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) redirect(ROUTES.authForgotPassword);
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-12 dark:bg-slate-950">
      <PasswordRecoveryForm mode="update" />
    </main>
  );
}
