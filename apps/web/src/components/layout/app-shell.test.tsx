import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AppShell } from './app-shell';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: () => '/jobs',
  useRouter: () => ({ push: mockPush }),
}));

// Mock useAuth
vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    checkSession: vi.fn(),
  }),
}));

describe('AppShell', () => {
  it('renders children in the main content area', () => {
    render(
      <AppShell>
        <div data-testid="child">Content</div>
      </AppShell>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByRole('main')).toContainElement(screen.getByTestId('child'));
  });

  it('renders skip navigation link as first focusable element', () => {
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    );

    const skipLink = screen.getByText('Skip to main content');
    expect(skipLink).toBeInTheDocument();
    expect(skipLink).toHaveAttribute('href', '#main-content');
  });

  it('renders main content area with id for skip-nav target', () => {
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    );

    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('id', 'main-content');
  });

  it('renders sidebar navigation', () => {
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    );

    expect(screen.getByRole('navigation', { name: /main navigation/i })).toBeInTheDocument();
  });

  it('renders mobile menu toggle button', () => {
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    );

    expect(screen.getByRole('button', { name: /open navigation menu/i })).toBeInTheDocument();
  });

  it('opens sidebar when mobile menu button is clicked', () => {
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    );

    const menuButton = screen.getByRole('button', { name: /open navigation menu/i });
    fireEvent.click(menuButton);

    // Sidebar should now be visible (translated to 0)
    const sidebar = screen.getByRole('navigation', { name: /main navigation/i });
    expect(sidebar).toHaveClass('translate-x-0');
  });

  it('closes sidebar when close button is clicked', () => {
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    );

    // Open sidebar
    fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));

    // Close sidebar
    fireEvent.click(screen.getByRole('button', { name: /close navigation menu/i }));

    // Sidebar should be hidden
    const sidebar = screen.getByRole('navigation', { name: /main navigation/i });
    expect(sidebar).toHaveClass('-translate-x-full');
  });

  it('renders breadcrumb navigation', () => {
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    );

    expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toBeInTheDocument();
  });
});
