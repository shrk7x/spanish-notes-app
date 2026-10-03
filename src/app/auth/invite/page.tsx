import { redirect } from 'next/navigation';
import { ROUTES } from '@/constants';
import { resolveSafeNext } from '@/utils/auth/resolveSafeNext';
export default async function InvitePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams();
  if (typeof params.email === 'string')
    query.set('email', params.email.trim().toLowerCase());
  query.set('next', resolveSafeNext(params.next));
  redirect(`${ROUTES.authSignUp}?${query}`);
}
