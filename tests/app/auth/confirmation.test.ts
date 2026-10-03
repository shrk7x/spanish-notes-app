import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/auth/callback/route';
const { verifyOtp, exchangeCodeForSession } = vi.hoisted(() => ({
  verifyOtp: vi.fn(),
  exchangeCodeForSession: vi.fn(),
}));
vi.mock('@/utils/supabase/config', () => ({
  getSupabaseConfig: () => ({
    supabaseUrl: 'https://test.supabase.co',
    supabaseAnonKey: 'anon',
  }),
}));
vi.mock('@supabase/ssr', () => ({
  createServerClient: (
    _url: string,
    _key: string,
    options: { cookies: { setAll: (cookies: object[]) => void } }
  ) => ({
    auth: {
      verifyOtp: async (input: unknown) => {
        options.cookies.setAll([
          { name: 'session', value: 'verified', options: { httpOnly: true } },
        ]);
        return verifyOtp(input);
      },
      exchangeCodeForSession,
    },
  }),
}));
describe('email confirmation callback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyOtp.mockResolvedValue({ error: null });
  });
  it('verifies signup token hashes and persists session cookies', async () => {
    const response = await GET(
      new NextRequest(
        'https://app.test/auth/callback?token_hash=hash&type=signup&next=%2Fsettings'
      )
    );
    expect(verifyOtp).toHaveBeenCalledWith({
      token_hash: 'hash',
      type: 'signup',
    });
    expect(response.headers.get('location')).toBe('https://app.test/settings');
    expect(response.cookies.get('session')?.value).toBe('verified');
  });
  it('always sends recovery to password update', async () => {
    const response = await GET(
      new NextRequest(
        'https://app.test/auth/callback?token_hash=hash&type=recovery&next=https://evil.test'
      )
    );
    expect(response.headers.get('location')).toBe(
      'https://app.test/auth/update-password'
    );
  });
  it.each(['magiclink', 'invite', 'email_change', 'invalid', ''])(
    'rejects unsupported type %s without exchanging credentials',
    async (type) => {
      const response = await GET(
        new NextRequest(
          `https://app.test/auth/callback?token_hash=hash&type=${type}`
        )
      );
      expect(verifyOtp).not.toHaveBeenCalled();
      expect(exchangeCodeForSession).not.toHaveBeenCalled();
      expect(response.headers.get('location')).toContain('auth=error');
    }
  );
  it('handles expired hashes', async () => {
    verifyOtp.mockResolvedValue({ error: { message: 'expired' } });
    const response = await GET(
      new NextRequest(
        'https://app.test/auth/callback?token_hash=expired&type=signup'
      )
    );
    expect(response.headers.get('location')).toContain('auth=error');
  });
  it('supports PKCE recovery destination explicitly', async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null });
    const response = await GET(
      new NextRequest(
        'https://app.test/auth/callback?code=code&next=%2Fauth%2Fupdate-password'
      )
    );
    expect(response.headers.get('location')).toBe(
      'https://app.test/auth/update-password'
    );
  });
  it('handles network failures with an actionable retry destination', async () => {
    verifyOtp.mockRejectedValueOnce(new Error('network'));
    const response = await GET(
      new NextRequest(
        'https://app.test/auth/confirm?token_hash=hash&type=email'
      )
    );
    expect(response.headers.get('location')).toBe(
      'https://app.test/auth/sign-in?auth=error'
    );
  });
  it('never caches a verified session response', async () => {
    const response = await GET(
      new NextRequest(
        'https://app.test/auth/confirm?token_hash=hash&type=email'
      )
    );
    expect(response.headers.get('cache-control')).toContain('no-store');
  });
});
