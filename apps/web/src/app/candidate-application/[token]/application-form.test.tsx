import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApplicationForm } from './application-form';

describe('ApplicationForm', () => {
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    mockOnSubmit.mockReset();
    mockOnSubmit.mockResolvedValue(undefined);
  });

  function renderForm(props?: { submitting?: boolean; submitError?: string | null }) {
    return render(
      <ApplicationForm
        onSubmit={mockOnSubmit}
        submitting={props?.submitting ?? false}
        submitError={props?.submitError ?? null}
      />,
    );
  }

  it('renders all required form fields', () => {
    renderForm();

    expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/current location/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/current role/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/notice period/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/salary expectation/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/linkedin profile/i)).toBeInTheDocument();
  });

  it('renders the submit button', () => {
    renderForm();
    expect(screen.getByRole('button', { name: /submit application/i })).toBeInTheDocument();
  });

  it('shows required errors when submitting empty form', async () => {
    renderForm();

    fireEvent.click(screen.getByRole('button', { name: /submit application/i }));

    expect(screen.getByText('Phone number is required')).toBeInTheDocument();
    expect(screen.getByText('Current location is required')).toBeInTheDocument();
    expect(screen.getByText('Current role is required')).toBeInTheDocument();
    expect(screen.getByText('Notice period is required')).toBeInTheDocument();
    expect(screen.getByText('Salary expectation is required')).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('validates phone number — rejects invalid characters', () => {
    renderForm();

    const phoneInput = screen.getByLabelText(/phone number/i);
    fireEvent.change(phoneInput, { target: { value: 'abc12345' } });
    fireEvent.blur(phoneInput);

    expect(
      screen.getByText(/phone number may only contain digits, spaces, hyphens/i),
    ).toBeInTheDocument();
  });

  it('validates phone number — rejects too short', () => {
    renderForm();

    const phoneInput = screen.getByLabelText(/phone number/i);
    fireEvent.change(phoneInput, { target: { value: '123' } });
    fireEvent.blur(phoneInput);

    expect(screen.getByText(/at least 7 characters/i)).toBeInTheDocument();
  });

  it('validates phone number — accepts valid input', () => {
    renderForm();

    const phoneInput = screen.getByLabelText(/phone number/i);
    fireEvent.change(phoneInput, { target: { value: '+1 (555) 123-4567' } });
    fireEvent.blur(phoneInput);

    // No error alert should be present for the phone field
    expect(document.getElementById('phone-error')).not.toBeInTheDocument();
  });

  it('validates LinkedIn URL — rejects invalid prefix', () => {
    renderForm();

    const linkedinInput = screen.getByLabelText(/linkedin profile/i);
    fireEvent.change(linkedinInput, { target: { value: 'https://example.com/profile' } });
    fireEvent.blur(linkedinInput);

    expect(screen.getByText(/must start with https:\/\/linkedin\.com\/ or/i)).toBeInTheDocument();
  });

  it('validates LinkedIn URL — accepts valid URL', () => {
    renderForm();

    const linkedinInput = screen.getByLabelText(/linkedin profile/i);
    fireEvent.change(linkedinInput, {
      target: { value: 'https://www.linkedin.com/in/john-doe' },
    });
    fireEvent.blur(linkedinInput);

    expect(screen.queryByText(/must start with https:\/\/linkedin\.com/i)).not.toBeInTheDocument();
  });

  it('LinkedIn URL is optional — no error when empty', () => {
    renderForm();

    const linkedinInput = screen.getByLabelText(/linkedin profile/i);
    fireEvent.focus(linkedinInput);
    fireEvent.blur(linkedinInput);

    expect(screen.queryByText(/linkedin/i, { selector: '[role="alert"]' })).not.toBeInTheDocument();
  });

  it('validates location max length (100 chars)', () => {
    renderForm();

    const locationInput = screen.getByLabelText(/current location/i);
    fireEvent.change(locationInput, { target: { value: 'x'.repeat(101) } });
    fireEvent.blur(locationInput);

    expect(screen.getByText(/must not exceed 100 characters/i)).toBeInTheDocument();
  });

  it('calls onSubmit with cleaned data when valid', async () => {
    renderForm();

    fireEvent.change(screen.getByLabelText(/phone number/i), {
      target: { value: '+44 7911 123456' },
    });
    fireEvent.change(screen.getByLabelText(/current location/i), {
      target: { value: 'London, UK' },
    });
    fireEvent.change(screen.getByLabelText(/current role/i), {
      target: { value: 'Software Engineer' },
    });
    fireEvent.change(screen.getByLabelText(/notice period/i), {
      target: { value: '2 weeks' },
    });
    fireEvent.change(screen.getByLabelText(/salary expectation/i), {
      target: { value: '£80,000 - £90,000' },
    });
    fireEvent.change(screen.getByLabelText(/linkedin profile/i), {
      target: { value: 'https://www.linkedin.com/in/john-doe' },
    });

    fireEvent.click(screen.getByRole('button', { name: /submit application/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        phone: '+44 7911 123456',
        location: 'London, UK',
        currentRole: 'Software Engineer',
        noticePeriod: '2 weeks',
        salaryExpectation: '£80,000 - £90,000',
        linkedinUrl: 'https://www.linkedin.com/in/john-doe',
      });
    });
  });

  it('disables button and shows loading text while submitting', () => {
    renderForm({ submitting: true });

    const button = screen.getByRole('button', { name: /submitting/i });
    expect(button).toBeDisabled();
  });

  it('displays submit error as alert', () => {
    renderForm({ submitError: 'Server error occurred' });

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Server error occurred');
  });

  it('preserves form data on submission failure', async () => {
    // Simulate an async submission that resolves (error is handled by parent component)
    mockOnSubmit.mockResolvedValue(undefined);
    renderForm({ submitError: 'Something went wrong' });

    const phoneInput = screen.getByLabelText(/phone number/i);
    fireEvent.change(phoneInput, { target: { value: '+1 555 1234567' } });
    fireEvent.change(screen.getByLabelText(/current location/i), {
      target: { value: 'NYC' },
    });
    fireEvent.change(screen.getByLabelText(/current role/i), {
      target: { value: 'Dev' },
    });
    fireEvent.change(screen.getByLabelText(/notice period/i), {
      target: { value: '1 month' },
    });
    fireEvent.change(screen.getByLabelText(/salary expectation/i), {
      target: { value: '$100k' },
    });

    // Form data should be preserved even with an error displayed
    expect(phoneInput).toHaveValue('+1 555 1234567');
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
  });

  it('clears field error when user corrects input', () => {
    renderForm();

    const phoneInput = screen.getByLabelText(/phone number/i);
    fireEvent.change(phoneInput, { target: { value: 'abc12345678' } });
    fireEvent.blur(phoneInput);

    expect(screen.getByText(/phone number may only contain/i)).toBeInTheDocument();

    // Correct the input
    fireEvent.change(phoneInput, { target: { value: '+1234567' } });

    expect(screen.queryByText(/phone number may only contain/i)).not.toBeInTheDocument();
  });

  it('sets aria-invalid on fields with errors', () => {
    renderForm();

    const phoneInput = screen.getByLabelText(/phone number/i);
    fireEvent.focus(phoneInput);
    fireEvent.blur(phoneInput);

    // After submitting empty, it should show required error
    fireEvent.click(screen.getByRole('button', { name: /submit application/i }));

    expect(phoneInput).toHaveAttribute('aria-invalid', 'true');
  });

  it('has proper aria-describedby linking errors to inputs', () => {
    renderForm();

    fireEvent.click(screen.getByRole('button', { name: /submit application/i }));

    const phoneInput = screen.getByLabelText(/phone number/i);
    const describedBy = phoneInput.getAttribute('aria-describedby');
    expect(describedBy).toBe('phone-error');

    const errorEl = document.getElementById('phone-error');
    expect(errorEl).toHaveTextContent('Phone number is required');
  });
});
