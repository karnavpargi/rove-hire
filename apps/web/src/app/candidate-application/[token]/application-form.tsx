'use client';

/**
 * Candidate application form component.
 * Client-side validation matches server-side rules from @rove-hire/shared.
 *
 * Fields:
 * - Phone (max 20, validated chars: digits, spaces, hyphens, parens, leading +)
 * - Location (max 100)
 * - Current role (max 100)
 * - Notice period (max 50)
 * - Salary expectation (max 50)
 * - LinkedIn URL (optional, validated format)
 *
 * Validates: Requirements 5.1, 5.2, 5.7, 5.8, 5.9, 16.4
 */

import { useState, type FormEvent } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ApplicationFormInput } from '@/lib/graphql/magic-link';

// ---------------------------------------------------------------------------
// Validation (matches server-side rules from @rove-hire/shared)
// ---------------------------------------------------------------------------

const PHONE_REGEX = /^\+?[\d\s\-()]+$/;

interface FieldError {
  field: string;
  message: string;
}

function validateForm(data: ApplicationFormInput): FieldError[] {
  const errors: FieldError[] = [];

  // Phone: required, max 20, valid chars, min 7
  if (!data.phone.trim()) {
    errors.push({ field: 'phone', message: 'Phone number is required' });
  } else if (data.phone.length < 7) {
    errors.push({ field: 'phone', message: 'Phone number must be at least 7 characters' });
  } else if (data.phone.length > 20) {
    errors.push({ field: 'phone', message: 'Phone number must not exceed 20 characters' });
  } else if (!PHONE_REGEX.test(data.phone)) {
    errors.push({
      field: 'phone',
      message:
        'Phone number may only contain digits, spaces, hyphens, parentheses, or a leading plus sign',
    });
  }

  // Location: required, max 100
  if (!data.location.trim()) {
    errors.push({ field: 'location', message: 'Current location is required' });
  } else if (data.location.length > 100) {
    errors.push({ field: 'location', message: 'Location must not exceed 100 characters' });
  }

  // Current role: required, max 100
  if (!data.currentRole.trim()) {
    errors.push({ field: 'currentRole', message: 'Current role is required' });
  } else if (data.currentRole.length > 100) {
    errors.push({ field: 'currentRole', message: 'Role must not exceed 100 characters' });
  }

  // Notice period: required, max 50
  if (!data.noticePeriod.trim()) {
    errors.push({ field: 'noticePeriod', message: 'Notice period is required' });
  } else if (data.noticePeriod.length > 50) {
    errors.push({ field: 'noticePeriod', message: 'Notice period must not exceed 50 characters' });
  }

  // Salary expectation: required, max 50
  if (!data.salaryExpectation.trim()) {
    errors.push({ field: 'salaryExpectation', message: 'Salary expectation is required' });
  } else if (data.salaryExpectation.length > 50) {
    errors.push({
      field: 'salaryExpectation',
      message: 'Salary expectation must not exceed 50 characters',
    });
  }

  // LinkedIn URL: optional, but if provided must match format
  if (data.linkedinUrl && data.linkedinUrl.trim()) {
    const url = data.linkedinUrl.trim();
    if (url.length > 255) {
      errors.push({
        field: 'linkedinUrl',
        message: 'LinkedIn URL must not exceed 255 characters',
      });
    } else if (
      !url.startsWith('https://linkedin.com/') &&
      !url.startsWith('https://www.linkedin.com/')
    ) {
      errors.push({
        field: 'linkedinUrl',
        message:
          'LinkedIn URL must start with https://linkedin.com/ or https://www.linkedin.com/',
      });
    }
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ApplicationFormProps {
  onSubmit: (data: ApplicationFormInput) => Promise<void>;
  submitting: boolean;
  submitError: string | null;
}

export function ApplicationForm({ onSubmit, submitting, submitError }: ApplicationFormProps) {
  const [formData, setFormData] = useState<ApplicationFormInput>({
    phone: '',
    location: '',
    currentRole: '',
    noticePeriod: '',
    salaryExpectation: '',
    linkedinUrl: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  function updateField(field: keyof ApplicationFormInput, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear error on valid input
    if (errors[field]) {
      const updatedData = { ...formData, [field]: value };
      const fieldErrors = validateForm(updatedData);
      const fieldError = fieldErrors.find((e) => e.field === field);
      if (!fieldError) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next[field];
          return next;
        });
      }
    }
  }

  function handleBlur(field: keyof ApplicationFormInput) {
    setTouched((prev) => ({ ...prev, [field]: true }));

    // Validate single field on blur
    const fieldErrors = validateForm(formData);
    const fieldError = fieldErrors.find((e) => e.field === field);
    if (fieldError) {
      setErrors((prev) => ({ ...prev, [field]: fieldError.message }));
    } else {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    // Mark all fields as touched
    const allTouched: Record<string, boolean> = {};
    (Object.keys(formData) as (keyof ApplicationFormInput)[]).forEach((key) => {
      allTouched[key] = true;
    });
    setTouched(allTouched);

    // Validate all fields
    const fieldErrors = validateForm(formData);
    if (fieldErrors.length > 0) {
      const errorMap: Record<string, string> = {};
      fieldErrors.forEach((e) => {
        errorMap[e.field] = e.message;
      });
      setErrors(errorMap);
      return;
    }

    // Clean data before submission
    const cleanData: ApplicationFormInput = {
      phone: formData.phone.trim(),
      location: formData.location.trim(),
      currentRole: formData.currentRole.trim(),
      noticePeriod: formData.noticePeriod.trim(),
      salaryExpectation: formData.salaryExpectation.trim(),
      linkedinUrl: formData.linkedinUrl?.trim() || undefined,
    };

    await onSubmit(cleanData);
    // Form data is preserved on failure (state remains unchanged)
  }

  function getFieldError(field: string): string | undefined {
    return touched[field] ? errors[field] : undefined;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Complete Your Application</CardTitle>
        <CardDescription>
          Please fill in your details below to complete your application.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {/* Submit error banner */}
          {submitError && (
            <div
              role="alert"
              className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
            >
              {submitError}
            </div>
          )}

          {/* Phone */}
          <FormField
            id="phone"
            label="Phone Number"
            required
            value={formData.phone}
            onChange={(val) => updateField('phone', val)}
            onBlur={() => handleBlur('phone')}
            error={getFieldError('phone')}
            placeholder="+1 (555) 123-4567"
            maxLength={20}
            type="tel"
          />

          {/* Location */}
          <FormField
            id="location"
            label="Current Location"
            required
            value={formData.location}
            onChange={(val) => updateField('location', val)}
            onBlur={() => handleBlur('location')}
            error={getFieldError('location')}
            placeholder="City, Country"
            maxLength={100}
          />

          {/* Current Role */}
          <FormField
            id="currentRole"
            label="Current Role"
            required
            value={formData.currentRole}
            onChange={(val) => updateField('currentRole', val)}
            onBlur={() => handleBlur('currentRole')}
            error={getFieldError('currentRole')}
            placeholder="e.g. Senior Frontend Engineer"
            maxLength={100}
          />

          {/* Notice Period */}
          <FormField
            id="noticePeriod"
            label="Notice Period"
            required
            value={formData.noticePeriod}
            onChange={(val) => updateField('noticePeriod', val)}
            onBlur={() => handleBlur('noticePeriod')}
            error={getFieldError('noticePeriod')}
            placeholder="e.g. 2 weeks, 1 month"
            maxLength={50}
          />

          {/* Salary Expectation */}
          <FormField
            id="salaryExpectation"
            label="Salary Expectation"
            required
            value={formData.salaryExpectation}
            onChange={(val) => updateField('salaryExpectation', val)}
            onBlur={() => handleBlur('salaryExpectation')}
            error={getFieldError('salaryExpectation')}
            placeholder="e.g. $120,000 - $140,000"
            maxLength={50}
          />

          {/* LinkedIn URL */}
          <FormField
            id="linkedinUrl"
            label="LinkedIn Profile"
            value={formData.linkedinUrl || ''}
            onChange={(val) => updateField('linkedinUrl', val)}
            onBlur={() => handleBlur('linkedinUrl')}
            error={getFieldError('linkedinUrl')}
            placeholder="https://www.linkedin.com/in/your-profile"
            maxLength={255}
            type="url"
          />

          {/* Submit */}
          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={submitting}
            aria-busy={submitting}
          >
            {submitting ? 'Submitting...' : 'Submit Application'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// FormField — Internal reusable input field with error display
// ---------------------------------------------------------------------------

interface FormFieldProps {
  id: string;
  label: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  error?: string;
  placeholder?: string;
  maxLength?: number;
  type?: string;
}

function FormField({
  id,
  label,
  required,
  value,
  onChange,
  onBlur,
  error,
  placeholder,
  maxLength,
  type = 'text',
}: FormFieldProps) {
  const errorId = `${id}-error`;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      <Input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        maxLength={maxLength}
        aria-required={required}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        autoComplete={getAutoComplete(id)}
      />
      {error && (
        <p id={errorId} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function getAutoComplete(field: string): string | undefined {
  switch (field) {
    case 'phone':
      return 'tel';
    case 'location':
      return 'address-level2';
    case 'linkedinUrl':
      return 'url';
    default:
      return undefined;
  }
}
