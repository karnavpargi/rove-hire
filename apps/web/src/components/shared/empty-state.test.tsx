import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { EmptyState } from './empty-state';

describe('EmptyState', () => {
  it('renders description text', () => {
    render(<EmptyState description="No candidates found" />);
    expect(screen.getByText('No candidates found')).toBeInTheDocument();
  });

  it('renders title when provided', () => {
    render(<EmptyState title="No Results" description="Try different filters" />);
    expect(screen.getByText('No Results')).toBeInTheDocument();
    expect(screen.getByText('Try different filters')).toBeInTheDocument();
  });

  it('renders CTA link when actionHref and actionLabel provided', () => {
    render(
      <EmptyState
        description="No candidates yet"
        actionHref="/candidates/new"
        actionLabel="Add Candidate"
      />,
    );
    const link = screen.getByRole('link', { name: 'Add Candidate' });
    expect(link).toHaveAttribute('href', '/candidates/new');
  });

  it('renders CTA button when onAction provided', () => {
    const handler = vi.fn();
    render(
      <EmptyState description="No candidates yet" onAction={handler} actionLabel="Add Candidate" />,
    );
    const button = screen.getByRole('button', { name: 'Add Candidate' });
    fireEvent.click(button);
    expect(handler).toHaveBeenCalledOnce();
  });

  it('has accessible role and label', () => {
    render(<EmptyState title="Empty" description="Nothing here" />);
    const container = screen.getByRole('status');
    expect(container).toHaveAttribute('aria-label', 'Empty');
  });

  it('uses description as aria-label fallback when no title', () => {
    render(<EmptyState description="Nothing here" />);
    const container = screen.getByRole('status');
    expect(container).toHaveAttribute('aria-label', 'No content available');
  });

  it('renders default icon when none provided', () => {
    const { container } = render(<EmptyState description="Empty" />);
    // Default InboxIcon is rendered with aria-hidden
    const iconContainer = container.querySelector('[aria-hidden="true"]');
    expect(iconContainer).toBeInTheDocument();
  });
});
