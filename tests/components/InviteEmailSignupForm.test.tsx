import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import InviteEmailSignupForm from '@/components/InviteEmailSignupForm';
import { renderWithI18n } from '../utils/renderWithI18n';

const signUp = vi.fn();

vi.mock('@/utils/supabase/client', () => ({
  createBrowserClient: () => ({
    auth: {
      signUp,
    },
  }),
}));

describe('InviteEmailSignupForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('prefills invited email from props', () => {
    renderWithI18n(<InviteEmailSignupForm initialEmail="invited@example.com" />);

    const emailInput = screen.getByLabelText('Email') as HTMLInputElement;
    expect(emailInput.value).toBe('invited@example.com');
  });

  it('toggles password visibility for both password fields', () => {
    renderWithI18n(<InviteEmailSignupForm initialEmail="invited@example.com" />);

    const passwordInput = screen.getByLabelText('Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm password');
    let toggleButton = screen.getByRole('button', { name: 'Show Passwords' });

    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(confirmPasswordInput).toHaveAttribute('type', 'password');

    fireEvent.click(toggleButton);

    expect(passwordInput).toHaveAttribute('type', 'text');
    expect(confirmPasswordInput).toHaveAttribute('type', 'text');
    toggleButton = screen.getByRole('button', { name: 'Hide Passwords' });
    expect(toggleButton).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(toggleButton);

    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(confirmPasswordInput).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: 'Show Passwords' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('submits email signup request with callback redirect', async () => {
    signUp.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    renderWithI18n(<InviteEmailSignupForm initialEmail="invited@example.com" />);

    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'Secret123' },
    });
    fireEvent.change(screen.getByLabelText('Confirm password'), {
      target: { value: 'Secret123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => {
      expect(signUp).toHaveBeenCalledWith({
        email: 'invited@example.com',
        password: 'Secret123',
        options: {
          emailRedirectTo: expect.stringContaining('/auth/callback?next=%2Fapp'),
        },
      });
    });
  });

  it('shows a retry error when backend registration fails', async () => {
    signUp.mockResolvedValue({
      data: { user: null },
      error: new Error('invite_required'),
    });
    renderWithI18n(<InviteEmailSignupForm initialEmail="no-invite@example.com" />);

    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'Secret123' },
    });
    fireEvent.change(screen.getByLabelText('Confirm password'), {
      target: { value: 'Secret123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Unable to create account. Please try again.')).toBeInTheDocument();
  });

  it('shows success state after invited signup request', async () => {
    signUp.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    renderWithI18n(<InviteEmailSignupForm initialEmail="invited@example.com" />);

    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'Secret123' },
    });
    fireEvent.change(screen.getByLabelText('Confirm password'), {
      target: { value: 'Secret123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Check your email')).toBeInTheDocument();
    expect(await screen.findByText('invited@example.com')).toBeInTheDocument();
  });
  it('shows invite-already-used error', async () => {
    signUp.mockResolvedValue({
      data: { user: null },
      error: new Error('invite_already_used'),
    });
    renderWithI18n(<InviteEmailSignupForm initialEmail="used-invite@example.com" />);

    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'Secret123' },
    });
    fireEvent.change(screen.getByLabelText('Confirm password'), {
      target: { value: 'Secret123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Unable to create account. Please try again.')).toBeInTheDocument();
  });

  it('shows invalid input error on empty password', async () => {
    renderWithI18n(<InviteEmailSignupForm initialEmail="invited@example.com" />);

    const form = screen.getByRole('button', { name: 'Create account' }).closest('form');
    fireEvent.submit(form!);

    expect(await screen.findByText('Email, password, and confirmation are required.')).toBeInTheDocument();
  });

  it('shows password mismatch error before submit', async () => {
    renderWithI18n(<InviteEmailSignupForm initialEmail="invited@example.com" />);

    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'Secret123' },
    });
    fireEvent.change(screen.getByLabelText('Confirm password'), {
      target: { value: 'Secret124' },
    });

    const form = screen.getByRole('button', { name: 'Create account' }).closest('form');
    fireEvent.submit(form!);

    expect(await screen.findByText('Passwords do not match.')).toBeInTheDocument();
    expect(signUp).not.toHaveBeenCalled();
  });

  it('shows password length error on submit', async () => {
    renderWithI18n(<InviteEmailSignupForm initialEmail="invited@example.com" />);

    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'short1' },
    });
    fireEvent.change(screen.getByLabelText('Confirm password'), {
      target: { value: 'short1' },
    });

    const form = screen.getByRole('button', { name: 'Create account' }).closest('form');
    fireEvent.submit(form!);

    expect(await screen.findByText('Password must be at least 8 characters.')).toBeInTheDocument();
    expect(signUp).not.toHaveBeenCalled();
  });

  it('shows generic error on network failure', async () => {
    signUp.mockRejectedValue(new Error('Network Error'));
    renderWithI18n(<InviteEmailSignupForm initialEmail="network-fail@example.com" />);

    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'Secret123' },
    });
    fireEvent.change(screen.getByLabelText('Confirm password'), {
      target: { value: 'Secret123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Unable to create account. Please try again.')).toBeInTheDocument();
  });
});
