'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface FormFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  /** Unique field identifier */
  name: string;
  /** Visible label text */
  label: string;
  /** Error message to display (externally controlled) */
  error?: string;
  /** Hint text displayed below the input */
  hint?: string;
  /** Validation function - returns error string or undefined if valid */
  validate?: (value: string) => string | undefined;
  /** Controlled value */
  value?: string;
  /** Change handler receiving the new value */
  onChange?: (value: string) => void;
}

/**
 * FormField wraps an input with a label, inline error display, and validation.
 * - Validates on blur
 * - Clears error when input becomes valid
 * - Displays inline error message with proper ARIA association
 */
export function FormField({
  name,
  label,
  error: externalError,
  hint,
  validate,
  value: controlledValue,
  onChange,
  className,
  required,
  ...inputProps
}: FormFieldProps) {
  const [internalValue, setInternalValue] = React.useState('');
  const [internalError, setInternalError] = React.useState<string | undefined>();
  const [touched, setTouched] = React.useState(false);

  const value = controlledValue !== undefined ? controlledValue : internalValue;
  const displayError = externalError || (touched ? internalError : undefined);
  const errorId = `${name}-error`;
  const hintId = `${name}-hint`;

  const handleChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      if (onChange) {
        onChange(newValue);
      } else {
        setInternalValue(newValue);
      }

      // Clear error if the input becomes valid while typing
      if (validate && touched) {
        const validationResult = validate(newValue);
        if (!validationResult) {
          setInternalError(undefined);
        }
      }
    },
    [onChange, validate, touched],
  );

  const handleBlur = React.useCallback(() => {
    setTouched(true);
    if (validate) {
      const validationResult = validate(value);
      setInternalError(validationResult);
    }
  }, [validate, value]);

  const describedBy = [
    displayError ? errorId : undefined,
    hint ? hintId : undefined,
  ]
    .filter(Boolean)
    .join(' ') || undefined;

  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={name} className="text-sm font-medium">
        {label}
        {required && <span className="ml-0.5 text-destructive" aria-hidden="true">*</span>}
      </Label>

      <Input
        id={name}
        name={name}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        aria-invalid={!!displayError}
        aria-describedby={describedBy}
        aria-required={required}
        required={required}
        {...inputProps}
      />

      {/* Hint text */}
      {hint && !displayError && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}

      {/* Error message */}
      {displayError && (
        <p
          id={errorId}
          className="text-xs text-destructive"
          role="alert"
          aria-live="assertive"
        >
          {displayError}
        </p>
      )}
    </div>
  );
}
