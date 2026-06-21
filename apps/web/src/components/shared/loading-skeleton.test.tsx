import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { LoadingSkeleton } from './loading-skeleton';

describe('LoadingSkeleton', () => {
  it('renders list variant with correct number of rows', () => {
    render(<LoadingSkeleton variant="list" rows={3} />);
    const container = screen.getByRole('status');
    expect(container).toHaveAttribute('aria-busy', 'true');
    expect(container).toHaveAttribute('aria-label', 'Loading list');
    // 3 rows + sr-only text
    expect(container.children.length).toBe(4);
  });

  it('renders profile variant', () => {
    render(<LoadingSkeleton variant="profile" />);
    const container = screen.getByRole('status');
    expect(container).toHaveAttribute('aria-label', 'Loading content');
    expect(container).toHaveAttribute('aria-busy', 'true');
  });

  it('renders card variant', () => {
    render(<LoadingSkeleton variant="card" />);
    const container = screen.getByRole('status');
    expect(container).toHaveAttribute('aria-label', 'Loading content');
    expect(container).toHaveAttribute('aria-busy', 'true');
  });

  it('defaults to list variant with 5 rows', () => {
    render(<LoadingSkeleton />);
    const container = screen.getByRole('status');
    expect(container).toHaveAttribute('aria-label', 'Loading list');
    // 5 rows + sr-only text
    expect(container.children.length).toBe(6);
  });

  it('includes sr-only text for screen readers', () => {
    render(<LoadingSkeleton variant="list" />);
    expect(screen.getByText('Loading list...')).toBeInTheDocument();
  });
});
