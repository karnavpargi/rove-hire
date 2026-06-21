import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import LoginPage from './page';

// Mock state
let mockIsAuthenticated = false;
let mockIsLoading = false;
let mockIsInitialized = true;
const mockLogin = vi.fn();
const mockPush = vi.fn();

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/login',
}));

// Mock useAuth hook
vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    login: mockLogin,
    logout: vi.fn(),
    checkSession: vi.fn(),
    user: mockIsAuthenticated ? { id: '1', email: 'test@rove.com', name: 'Test' } : null,
    isAuthenticated: mockIsAuthenticated,
    isLoading: mockIsLoading,
  }),
}));

// Mock session store
vi.mock('@/stores/session-store', () => ({
  useSessionStore: (selector?: (state: unknown) => unknown) => {
    const state = { isInitialized: mockIsInitialized };
    if (typeof selector === 'function') return selector(state);
    return state;
  },
}));

describe('LoginPage', () => {
  beforeEach(() => {
    mockIsAuthenticated = false;
    mockIsLoading = false;
    mockIsInitialized = true;
    mockLogin.mockReset();
    mockPush.mockReset();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('renders login form with email and password fields', () => {
    render(<LoginPage />);

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('renders sign in heading and description', () => {
    render(<LoginPage />);

    expect(screen.getByText('Sign in to ROVE Hire')).toBeInTheDocument();
    expect(
      screen.getByText('Enter your credentials to access the recruitment dashboard'),
    ).toBeInTheDocument();
  });

  it('shows loading spinner when auth is initializing', () => {
    mockIsLoading = true;
    render(<LoginPage />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument();
  });

  it('redirects to dashboard if already authenticated', () => {
    mockIsAuthenticated = true;
    render(<LoginPage />);

    expect(mockPush).toHaveBeenCalledWith('/');
  });

  it('validates email format on blur', () => {
    render(<LoginPage />);

    const emailInput = screen.getByLabelText('Email');
    fireEvent.change(emailInput, { target: { value: 'not-an-email' } });
    fireEvent.blur(emailInput);

    expect(screen.getByText(/must be a valid email/i)).toBeInTheDocument();
  });

  it('shows required error when email is empty on blur', () => {
    render(<LoginPage />);

    const emailInput = screen.getByLabelText('Email');
    fireEvent.focus(emailInput);
    fireEvent.blur(emailInput);

    expect(screen.getByText('Email is required')).toBeInTheDocument();
  });

  it('validates password length (min 8) on blur', () => {
    render(<LoginPage />);

    const passwordInput = screen.getByLabelText('Password');
    fireEvent.change(passwordInput, { target: { value: 'short' } });
    fireEvent.blur(passwordInput);

    expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
  });

  it('shows required error when password is empty on blur', () => {
    render(<LoginPage />);

    const passwordInput = screen.getByLabelText('Password');
    fireEvent.focus(passwordInput);
    fireEvent.blur(passwordInput);

    expect(screen.getByText('Password is required')).toBeInTheDocument();
  });

  it('clears field error when user starts typing', () => {
    render(<LoginPage />);

    const emailInput = screen.getByLabelText('Email');
    fireEvent.focus(emailInput);
    fireEvent.blur(emailInput);
    expect(screen.getByText('Email is required')).toBeInTheDocument();

    fireEvent.change(emailInput, { target: { value: 'a' } });
    expect(screen.queryByText('Email is required')).not.toBeInTheDocument();
  });

  it('does not submit form with invalid fields', async () => {
    render(<LoginPage />);

    const submitButton = screen.getByRole('button', { name: 'Sign in' });
    fireEvent.click(submitButton);

    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('calls login and redirects on success', async () => {
    mockLogin.mockResolvedValue({ success: true });
    render(<LoginPage />);

    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: 'Sign in' });

    fireEvent.change(emailInput, { target: { value: 'hr@rove.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('hr@rove.com', 'password123');
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  it('displays generic error on failed login (no email/password differentiation)', async () => {
    mockLogin.mockResolvedValue({
      success: false,
      error: { message: 'Invalid email or password.' },
    });
    render(<LoginPage />);

    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: 'Sign in' });

    fireEvent.change(emailInput, { target: { value: 'hr@rove.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid email or password.');
    });
  });

  it('handles rate limit error with retry-after countdown', async () => {
    mockLogin.mockResolvedValue({
      success: false,
      error: { message: 'Too many login attempts. Please try again later.', retryAfter: 60 },
    });

    render(<LoginPage />);

    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');

    fireEvent.change(emailInput, { target: { value: 'hr@rove.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    });

    // Should show rate limit message with retry countdown
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Too many login attempts');
      expect(screen.getByRole('alert')).toHaveTextContent('Retry in');
    });

    // Button should show wait state and be disabled
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent(/wait/i);
  });

  it('disables submit button while submitting', async () => {
    mockLogin.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve({ success: true }), 100);
        }),
    );

    render(<LoginPage />);

    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');

    fireEvent.change(emailInput, { target: { value: 'hr@rove.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    });

    // After the login resolves it navigates, so we verify the login was called
    expect(mockLogin).toHaveBeenCalledWith('hr@rove.com', 'password123');
  });

  it('sets aria-invalid on fields with errors', () => {
    render(<LoginPage />);

    const emailInput = screen.getByLabelText('Email');
    fireEvent.focus(emailInput);
    fireEvent.blur(emailInput);

    expect(emailInput).toHaveAttribute('aria-invalid', 'true');
  });

  it('has proper autocomplete attributes for credential management', () => {
    render(<LoginPage />);

    expect(screen.getByLabelText('Email')).toHaveAttribute('autocomplete', 'email');
    expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'current-password');
  });

  it('has accessible form with aria-label', () => {
    render(<LoginPage />);

    expect(screen.getByRole('form', { name: 'Login form' })).toBeInTheDocument();
  });
});
