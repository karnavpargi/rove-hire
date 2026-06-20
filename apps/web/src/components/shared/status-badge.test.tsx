import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StatusBadge } from './status-badge';
import { CandidateStatus } from '@rove-hire/shared';

describe('StatusBadge', () => {
  it('renders the correct label for each status', () => {
    const statusLabels: Record<CandidateStatus, string> = {
      [CandidateStatus.Applied]: 'Applied',
      [CandidateStatus.FormSubmitted]: 'Form Submitted',
      [CandidateStatus.InterviewScheduled]: 'Interview Scheduled',
      [CandidateStatus.OfferSent]: 'Offer Sent',
      [CandidateStatus.Hired]: 'Hired',
      [CandidateStatus.Rejected]: 'Rejected',
    };

    for (const [status, label] of Object.entries(statusLabels)) {
      const { unmount } = render(<StatusBadge status={status as CandidateStatus} />);
      expect(screen.getByText(label)).toBeInTheDocument();
      unmount();
    }
  });

  it('has role="status" for accessibility', () => {
    render(<StatusBadge status={CandidateStatus.Applied} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('includes aria-label with status name', () => {
    render(<StatusBadge status={CandidateStatus.Hired} />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Status: Hired');
  });

  it('applies size="sm" variant styles', () => {
    render(<StatusBadge status={CandidateStatus.Applied} size="sm" />);
    const badge = screen.getByRole('status');
    expect(badge.className).toContain('text-xs');
  });

  it('applies custom className', () => {
    render(<StatusBadge status={CandidateStatus.Applied} className="custom-class" />);
    const badge = screen.getByRole('status');
    expect(badge.className).toContain('custom-class');
  });

  it('applies distinct color classes for each status', () => {
    const { container: c1 } = render(<StatusBadge status={CandidateStatus.Applied} />);
    const { container: c2 } = render(<StatusBadge status={CandidateStatus.Rejected} />);
    
    const badge1 = c1.querySelector('[role="status"]');
    const badge2 = c2.querySelector('[role="status"]');
    
    // Applied uses blue, Rejected uses red - they should have different classes
    expect(badge1?.className).not.toEqual(badge2?.className);
  });
});
