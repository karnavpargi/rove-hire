import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ErrorState } from './error-state';

describe('ErrorState', () => {
  it('renders default error message', () => {
    render(<ErrorState />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('renders custom error message', () => {
    render(<ErrorState message="Network error" />);
    expect(screen.getByText('Network error')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(<ErrorState message="Failed" description="Please try again later" />);
    expect(screen.getByText('Please try again later')).toBeInTheDocument();
  });

  it('renders retry button and calls onRetry handler', () => {
    const handler = vi.fn();
    render(<ErrorState onRetry={handler} />);
    const button = screen.getByRole('button', { name: 'Try again' });
    fireEvent.click(button);
    expect(handler).toHaveBeenCalledOnce();
  });

  it('does not render retry button when onRetry is not provided', () => {
    render(<ErrorState />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('uses custom retry label', () => {
    render(<ErrorState onRetry={() => {}} retryLabel="Reload" />);
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument();
  });

  it('has role="alert" and aria-live="assertive" for accessibility', () => {
    render(<ErrorState />);
    const container = screen.getByRole('alert');
    expect(container).toHaveAttribute('aria-live', 'assertive');
  });
});
