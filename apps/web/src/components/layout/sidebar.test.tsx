import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Sidebar } from './sidebar';

// Mock next/navigation
const mockPathname = vi.fn(() => '/');
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
  useRouter: () => ({ push: mockPush }),
}));

// Mock useAuth
vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    user: { id: '1', name: 'HR Admin', email: 'admin@rove.com' },
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    checkSession: vi.fn(),
  }),
}));

vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'light', setTheme: vi.fn() }),
}));

describe('Sidebar', () => {
  const defaultProps = { isOpen: true, onClose: vi.fn() };

  it('renders all navigation items', () => {
    render(<Sidebar {...defaultProps} />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Jobs')).toBeInTheDocument();
    expect(screen.getByText('Add Candidate')).toBeInTheDocument();
    expect(screen.getByText('Interviews')).toBeInTheDocument();
    expect(screen.getByText('Documents')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('highlights active navigation item with aria-current', () => {
    mockPathname.mockReturnValue('/');
    render(<Sidebar {...defaultProps} />);

    const dashboardLink = screen.getByText('Dashboard').closest('a');
    expect(dashboardLink).toHaveAttribute('aria-current', 'page');
  });

  it('highlights active item with distinct styling (font-semibold)', () => {
    mockPathname.mockReturnValue('/jobs');
    render(<Sidebar {...defaultProps} />);

    const jobsLink = screen.getByText('Jobs').closest('a');
    expect(jobsLink).toHaveClass('font-semibold');
    expect(jobsLink).toHaveClass('bg-primary-50');
  });

  it('does not highlight inactive items', () => {
    mockPathname.mockReturnValue('/');
    render(<Sidebar {...defaultProps} />);

    const jobsLink = screen.getByText('Jobs').closest('a');
    expect(jobsLink).not.toHaveAttribute('aria-current');
    expect(jobsLink).not.toHaveClass('font-semibold');
  });

  it('matches nested routes (e.g., /jobs/123 highlights Jobs)', () => {
    mockPathname.mockReturnValue('/jobs/some-uuid');
    render(<Sidebar {...defaultProps} />);

    const jobsLink = screen.getByText('Jobs').closest('a');
    expect(jobsLink).toHaveAttribute('aria-current', 'page');
  });

  it('renders ROVE Hire branding', () => {
    render(<Sidebar {...defaultProps} />);

    expect(screen.getByText('ROVE Hire')).toBeInTheDocument();
  });

  it('has correct sidebar role and label', () => {
    render(<Sidebar {...defaultProps} />);

    expect(screen.getByRole('navigation', { name: /main navigation/i })).toBeInTheDocument();
  });

  it('shows close button for mobile', () => {
    render(<Sidebar {...defaultProps} />);

    expect(screen.getByRole('button', { name: /close navigation menu/i })).toBeInTheDocument();
  });

  it('applies hidden class when closed', () => {
    render(<Sidebar isOpen={false} onClose={vi.fn()} />);

    const aside = screen.getByRole('navigation', { name: /main navigation/i });
    expect(aside).toHaveClass('-translate-x-full');
  });

  it('applies visible class when open', () => {
    render(<Sidebar isOpen={true} onClose={vi.fn()} />);

    const aside = screen.getByRole('navigation', { name: /main navigation/i });
    expect(aside).toHaveClass('translate-x-0');
  });
});
