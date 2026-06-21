import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FormField } from './form-field';

describe('FormField', () => {
  it('renders label and input', () => {
    render(<FormField name="email" label="Email" />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('shows required indicator', () => {
    render(<FormField name="email" label="Email" required />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('validates on blur and shows error', () => {
    const validate = (v: string) => (v.length < 3 ? 'Too short' : undefined);
    render(<FormField name="name" label="Name" validate={validate} />);

    const input = screen.getByLabelText('Name');
    fireEvent.change(input, { target: { value: 'ab' } });
    fireEvent.blur(input);

    expect(screen.getByText('Too short')).toBeInTheDocument();
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('clears error when input becomes valid', () => {
    const validate = (v: string) => (v.length < 3 ? 'Too short' : undefined);
    render(<FormField name="name" label="Name" validate={validate} />);

    const input = screen.getByLabelText('Name');
    // First, trigger error
    fireEvent.change(input, { target: { value: 'ab' } });
    fireEvent.blur(input);
    expect(screen.getByText('Too short')).toBeInTheDocument();

    // Then fix it
    fireEvent.change(input, { target: { value: 'abc' } });
    expect(screen.queryByText('Too short')).not.toBeInTheDocument();
  });

  it('shows external error', () => {
    render(<FormField name="email" label="Email" error="Invalid email" />);
    expect(screen.getByText('Invalid email')).toBeInTheDocument();
  });

  it('shows hint text when no error', () => {
    render(<FormField name="email" label="Email" hint="Enter your work email" />);
    expect(screen.getByText('Enter your work email')).toBeInTheDocument();
  });

  it('hides hint when error is present', () => {
    render(<FormField name="email" label="Email" hint="Hint" error="Error" />);
    expect(screen.queryByText('Hint')).not.toBeInTheDocument();
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('calls onChange with the new value', () => {
    const onChange = vi.fn();
    render(<FormField name="email" label="Email" value="" onChange={onChange} />);

    const input = screen.getByLabelText('Email');
    fireEvent.change(input, { target: { value: 'test@example.com' } });
    expect(onChange).toHaveBeenCalledWith('test@example.com');
  });

  it('associates error message via aria-describedby', () => {
    render(<FormField name="email" label="Email" error="Required" />);
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-describedby', expect.stringContaining('email-error'));
  });
});
