import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import EmailPasswordSignInForm from '@/components/EmailPasswordSignInForm';
import { renderWithI18n } from '../utils/renderWithI18n';

const signInWithPassword = vi.fn();
const replace = vi.fn();
const refresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, refresh }),
}));

vi.mock('@/utils/supabase/client', () => ({
  createBrowserClient: () => ({
    auth: {
      signInWithPassword,
    },
  }),
}));

describe('EmailPasswordSignInForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('prefills email from props', () => {
    renderWithI18n(
      <EmailPasswordSignInForm initialEmail="Invited@Example.com" />
    );

    expect(screen.getByLabelText('Email')).toHaveValue('invited@example.com');
  });

  it('signs in and redirects on success', async () => {
    signInWithPassword.mockResolvedValue({
      data: { session: { access_token: 'token' } },
      error: null,
    });
    renderWithI18n(<EmailPasswordSignInForm />);

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'Invited@Example.com ' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'secret123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(signInWithPassword).toHaveBeenCalledWith({
        email: 'invited@example.com',
        password: 'secret123',
      });
      expect(refresh).toHaveBeenCalled();
    });
    expect(replace).toHaveBeenCalledWith('/app');
  });

  it('shows invalid credentials error', async () => {
    signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: { message: 'Invalid login credentials' },
    });
    renderWithI18n(
      <EmailPasswordSignInForm initialEmail="invited@example.com" />
    );

    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'wrong-pass' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(
      await screen.findByText('Invalid email or password.')
    ).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it('shows invalid input error on empty submit', async () => {
    renderWithI18n(<EmailPasswordSignInForm />);

    const form = screen
      .getByRole('button', { name: 'Sign in' })
      .closest('form');
    fireEvent.submit(form!);

    expect(
      await screen.findByText('Email and password are required.')
    ).toBeInTheDocument();
    expect(signInWithPassword).not.toHaveBeenCalled();
  });

  it('returns to the requested safe page after a successful sign-in', async () => {
    signInWithPassword.mockResolvedValue({
      data: { session: { access_token: 'token' } },
      error: null,
    });
    renderWithI18n(
      <EmailPasswordSignInForm
        initialEmail="invited@example.com"
        nextPath="/settings?section=shared-links"
      />
    );

    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'secret123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(signInWithPassword).toHaveBeenCalledWith({
        email: 'invited@example.com',
        password: 'secret123',
      });
      expect(refresh).toHaveBeenCalled();
    });
    expect(replace).toHaveBeenCalledWith('/settings?section=shared-links');
  });
});
