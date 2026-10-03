import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithI18n } from '../../utils/renderWithI18n';
import SignInPage from '@/app/auth/sign-in/page';
import InvitePage from '@/app/auth/invite/page';
import SignupPage from '@/app/auth/sign-up/page';
import UpdatePage from '@/app/auth/update-password/page';
const { getUser, redirect } = vi.hoisted(() => ({
  getUser: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
}));
vi.mock('@/utils/supabase/server', () => ({
  createServerClient: () => ({ auth: { getUser } }),
}));
vi.mock('next/navigation', () => ({
  redirect,
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));
describe('public email pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({ data: { user: null }, error: null });
  });
  it('redirects old invite URLs preserving normalized email and safe next', async () => {
    await expect(
      InvitePage({
        searchParams: Promise.resolve({
          email: ' Any@Example.com ',
          next: '/settings',
        }),
      })
    ).rejects.toThrow(
      'redirect:/auth/sign-up?email=any%40example.com&next=%2Fsettings'
    );
  });
  it('shows public signup without invitation', async () => {
    expect(
      await SignupPage({ searchParams: Promise.resolve({}) })
    ).toBeTruthy();
  });
  it('guards password updates using verified user lookup', async () => {
    await expect(UpdatePage()).rejects.toThrow(
      'redirect:/auth/forgot-password'
    );
  });
  it('rejects a user lookup error even when stale user data exists', async () => {
    getUser.mockResolvedValue({
      data: { user: { id: 'u' } },
      error: { message: 'invalid' },
    });
    await expect(UpdatePage()).rejects.toThrow(
      'redirect:/auth/forgot-password'
    );
  });
  it('allows authenticated password update', async () => {
    getUser.mockResolvedValue({
      data: { user: { id: 'u', email_confirmed_at: '2026-10-03' } },
      error: null,
    });
    expect(await UpdatePage()).toBeTruthy();
  });
  it('shows failed confirmation guidance even with an existing authenticated session', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u' } }, error: null });
    const page = await SignInPage({
      searchParams: Promise.resolve({ auth: 'error', next: '/settings' }),
    });
    renderWithI18n(page);
    expect(screen.getByRole('alert')).toHaveTextContent('invalid or expired');
    expect(
      screen.getByRole('button', { name: 'Resend confirmation' })
    ).toBeInTheDocument();
    expect(redirect).not.toHaveBeenCalled();
  });
});
