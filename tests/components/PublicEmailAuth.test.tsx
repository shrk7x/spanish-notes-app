import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import InviteEmailSignupForm from '@/components/InviteEmailSignupForm';
import EmailPasswordSignInForm from '@/components/EmailPasswordSignInForm';
import PasswordRecoveryForm from '@/components/PasswordRecoveryForm';
import { renderWithI18n } from '../utils/renderWithI18n';
const {
  signUp,
  signInWithPassword,
  resend,
  resetPasswordForEmail,
  updateUser,
  replace,
  refresh,
} = vi.hoisted(() => ({
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
  resend: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock('@/utils/supabase/client', () => ({
  createBrowserClient: () => ({
    auth: {
      signUp,
      signInWithPassword,
      resend,
      resetPasswordForEmail,
      updateUser,
    },
  }),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace, refresh }) }));
describe('public email auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signUp.mockResolvedValue({ error: null });
    resend.mockResolvedValue({ error: null });
    resetPasswordForEmail.mockResolvedValue({ error: null });
    updateUser.mockResolvedValue({ error: null });
  });
  it('offers public signup and recovery from login', () => {
    renderWithI18n(<EmailPasswordSignInForm />);
    expect(
      screen.getByRole('link', { name: 'Create account' })
    ).toHaveAttribute('href', '/auth/sign-up?next=%2Fapp');
    expect(
      screen.getByRole('link', { name: 'Forgot password?' })
    ).toHaveAttribute('href', '/auth/forgot-password');
  });
  it('offers resend after signup and surfaces delivery failures', async () => {
    renderWithI18n(<InviteEmailSignupForm initialEmail="any@example.com" />);
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'Secret123' },
    });
    fireEvent.change(screen.getByLabelText('Confirm password'), {
      target: { value: 'Secret123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    fireEvent.click(
      await screen.findByRole('button', { name: 'Resend confirmation' })
    );
    expect(
      await screen.findByText(/Confirmation email requested/)
    ).toBeInTheDocument();
    resend.mockResolvedValue({ error: { message: 'rate limit' } });
    fireEvent.click(
      screen.getByRole('button', { name: 'Resend confirmation' })
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to send email'
    );
  });
  it('requests recovery for a normalized email with password update callback', async () => {
    renderWithI18n(<PasswordRecoveryForm />);
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: ' Any@Example.com ' },
    });
    fireEvent.submit(
      screen.getByRole('button', { name: 'Send reset link' }).closest('form')!
    );
    expect(await screen.findByRole('status')).toHaveTextContent(
      'If an account exists'
    );
    expect(resetPasswordForEmail).toHaveBeenCalledWith('any@example.com', {
      redirectTo: expect.stringContaining(
        '/auth/callback?next=%2Fauth%2Fupdate-password'
      ),
    });
  });
  it('shows recovery errors and re-enables submission', async () => {
    resetPasswordForEmail.mockRejectedValue(new Error('network'));
    renderWithI18n(<PasswordRecoveryForm />);
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'any@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to send email'
    );
    expect(
      screen.getByRole('button', { name: 'Send reset link' })
    ).toBeEnabled();
  });
  it('rejects mismatched update passwords without submitting', async () => {
    renderWithI18n(<PasswordRecoveryForm mode="update" />);
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'Secret123' },
    });
    fireEvent.change(screen.getByLabelText('Confirm password'), {
      target: { value: 'Other123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save password' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Passwords do not match'
    );
    expect(updateUser).not.toHaveBeenCalled();
  });
  it('updates password and only shows success after server accepts it', async () => {
    renderWithI18n(<PasswordRecoveryForm mode="update" />);
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'Secret123' },
    });
    fireEvent.change(screen.getByLabelText('Confirm password'), {
      target: { value: 'Secret123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save password' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Password updated'
    );
    expect(updateUser).toHaveBeenCalledWith({ password: 'Secret123' });
  });
  it('offers expired link guidance and resend without requiring a password', async () => {
    renderWithI18n(<EmailPasswordSignInForm linkError />);
    expect(screen.getByRole('alert')).toHaveTextContent('invalid or expired');
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'any@example.com' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Resend confirmation' })
    );
    expect(
      await screen.findByText(/Confirmation email requested/)
    ).toBeInTheDocument();
  });
  it('offers confirmation resend when password sign-in rejects an unconfirmed email', async () => {
    signInWithPassword.mockResolvedValue({
      error: { message: 'Email not confirmed' },
    });
    renderWithI18n(<EmailPasswordSignInForm initialEmail="any@example.com" />);
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'Secret123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(
      await screen.findByRole('button', { name: 'Resend confirmation' })
    ).toBeEnabled();
    expect(replace).not.toHaveBeenCalled();
  });
  it('prevents repeated reset submissions while a request is pending', async () => {
    let finish!: (value: { error: null }) => void;
    resetPasswordForEmail.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    renderWithI18n(<PasswordRecoveryForm />);
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'any@example.com' },
    });
    const form = screen
      .getByRole('button', { name: 'Send reset link' })
      .closest('form')!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(screen.getByRole('button', { name: 'Sending...' })).toBeDisabled();
    expect(resetPasswordForEmail).toHaveBeenCalledTimes(1);
    finish({ error: null });
    expect(await screen.findByRole('status')).toHaveTextContent(
      'If an account exists'
    );
  });
  it('keeps password form available when the server rejects an update', async () => {
    updateUser.mockResolvedValueOnce({ error: { message: 'same password' } });
    renderWithI18n(<PasswordRecoveryForm mode="update" />);
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'Secret123' },
    });
    fireEvent.change(screen.getByLabelText('Confirm password'), {
      target: { value: 'Secret123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save password' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to update password'
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
  it('localizes password recovery and success in Chinese', async () => {
    renderWithI18n(<PasswordRecoveryForm />, { locale: 'zh' });
    fireEvent.change(screen.getByLabelText('邮箱'), {
      target: { value: 'any@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: '发送重置链接' }));
    expect(await screen.findByRole('status')).toHaveTextContent('如果账号存在');
  });
  it('keeps confirmation and resend tied to the submitted mailbox during edits', async () => {
    let finish!: (value: { error: null }) => void;
    signUp.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    renderWithI18n(<InviteEmailSignupForm initialEmail="a@example.com" />);
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'Secret123' },
    });
    fireEvent.change(screen.getByLabelText('Confirm password'), {
      target: { value: 'Secret123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'b@example.com' },
    });
    finish({ error: null });
    expect(await screen.findByText('a@example.com')).toBeInTheDocument();
    expect(screen.queryByText('b@example.com')).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'Resend confirmation' })
    );
    await waitFor(() =>
      expect(resend).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'a@example.com', type: 'signup' })
      )
    );
  });
});
