import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Breadcrumbs } from './breadcrumbs';

const mockPathname = vi.fn(() => '/');
vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
}));

describe('Breadcrumbs', () => {
  it('does not render on root dashboard page', () => {
    mockPathname.mockReturnValue('/');
    const { container } = render(<Breadcrumbs />);
    expect(container.firstChild).toBeNull();
  });

  it('renders breadcrumb for first-level pages', () => {
    mockPathname.mockReturnValue('/jobs');
    render(<Breadcrumbs />);

    expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Jobs')).toBeInTheDocument();
  });

  it('renders multi-level breadcrumbs for detail pages', () => {
    mockPathname.mockReturnValue('/candidates/new');
    render(<Breadcrumbs />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Candidates')).toBeInTheDocument();
    expect(screen.getByText('New')).toBeInTheDocument();
  });

  it('marks last breadcrumb item as current page', () => {
    mockPathname.mockReturnValue('/jobs');
    render(<Breadcrumbs />);

    const currentItem = screen.getByText('Jobs');
    expect(currentItem).toHaveAttribute('aria-current', 'page');
  });

  it('makes intermediate items clickable links', () => {
    mockPathname.mockReturnValue('/candidates/new');
    render(<Breadcrumbs />);

    const candidatesLink = screen.getByText('Candidates').closest('a');
    expect(candidatesLink).toHaveAttribute('href', '/candidates');
  });

  it('truncates UUID-like segments', () => {
    mockPathname.mockReturnValue('/candidates/a1b2c3d4-e5f6-7890-abcd-ef1234567890');
    render(<Breadcrumbs />);

    expect(screen.getByText('a1b2c3d4…')).toBeInTheDocument();
  });
});
