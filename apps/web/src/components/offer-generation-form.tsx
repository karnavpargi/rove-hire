/**
 * Offer Generation Form Component
 *
 * Renders an inline form on the candidate profile for generating offer documents.
 * Fields: role title, salary (currency + amount), start date, reporting manager, location.
 *
 * Features:
 * - Client-side validation matching backend rules
 * - Loading state during generation (up to 10s)
 * - On success: display download links, update status badge to Offer_Sent
 * - On failure/timeout: show error with retry option
 *
 * Validates: Requirements 8.1, 8.2, 8.8, 8.10, 8.11, 12.3, 12.4
 */

'use client';

import * as React from 'react';
import {
  FileTextIcon,
  DownloadIcon,
  Loader2Icon,
  AlertCircleIcon,
  CheckCircle2Icon,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { showToast } from '@/components/shared';
import { useGenerateOffer, type GenerateOfferResult } from '@/hooks/use-generate-offer';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'AED'] as const;
type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

const CURRENCY_SYMBOLS: Record<SupportedCurrency, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  INR: '₹',
  AED: 'د.إ',
};

const SALARY_MIN = 0.01;
const SALARY_MAX = 9_999_999.99;

// ---------------------------------------------------------------------------
// Validation Helpers
// ---------------------------------------------------------------------------

interface FormValues {
  roleTitle: string;
  salaryCurrency: SupportedCurrency;
  salaryAmount: string;
  startDate: string;
  reportingManager: string;
  location: string;
}

interface FormErrors {
  roleTitle?: string;
  salaryCurrency?: string;
  salaryAmount?: string;
  startDate?: string;
  reportingManager?: string;
  location?: string;
}

function getTodayISO(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function validateForm(values: FormValues): FormErrors {
  const errors: FormErrors = {};

  // Role title: required, max 200 chars
  if (!values.roleTitle.trim()) {
    errors.roleTitle = 'Role title is required';
  } else if (values.roleTitle.trim().length > 200) {
    errors.roleTitle = 'Role title must be 200 characters or less';
  }

  // Currency: required, must be from supported list
  if (!values.salaryCurrency) {
    errors.salaryCurrency = 'Currency is required';
  } else if (!SUPPORTED_CURRENCIES.includes(values.salaryCurrency as SupportedCurrency)) {
    errors.salaryCurrency = 'Invalid currency selected';
  }

  // Salary amount: required, 0.01-9,999,999.99, max 2 decimal places
  if (!values.salaryAmount.trim()) {
    errors.salaryAmount = 'Salary amount is required';
  } else {
    const amount = parseFloat(values.salaryAmount);
    if (isNaN(amount)) {
      errors.salaryAmount = 'Salary must be a valid number';
    } else if (amount < SALARY_MIN) {
      errors.salaryAmount = `Salary must be at least ${SALARY_MIN}`;
    } else if (amount > SALARY_MAX) {
      errors.salaryAmount = `Salary must not exceed ${SALARY_MAX.toLocaleString()}`;
    } else {
      // Check max 2 decimal places
      const parts = values.salaryAmount.trim().split('.');
      if (parts[1] && parts[1].length > 2) {
        errors.salaryAmount = 'Salary can have at most 2 decimal places';
      }
    }
  }

  // Start date: required, must be >= today
  if (!values.startDate) {
    errors.startDate = 'Start date is required';
  } else {
    const today = getTodayISO();
    if (values.startDate < today) {
      errors.startDate = 'Start date must be today or in the future';
    }
  }

  // Reporting manager: required, max 100 chars
  if (!values.reportingManager.trim()) {
    errors.reportingManager = 'Reporting manager is required';
  } else if (values.reportingManager.trim().length > 100) {
    errors.reportingManager = 'Reporting manager must be 100 characters or less';
  }

  // Location: required, max 200 chars
  if (!values.location.trim()) {
    errors.location = 'Location is required';
  } else if (values.location.trim().length > 200) {
    errors.location = 'Location must be 200 characters or less';
  }

  return errors;
}

function hasErrors(errors: FormErrors): boolean {
  return Object.values(errors).some(Boolean);
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface OfferGenerationFormProps {
  candidateId: string;
  candidateName: string;
  /** Called when offer generation completes successfully */
  onSuccess?: () => void;
  /** Called when user cancels the form */
  onCancel?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OfferGenerationForm({
  candidateId,
  candidateName,
  onSuccess,
  onCancel,
}: OfferGenerationFormProps) {
  // Form state
  const [values, setValues] = React.useState<FormValues>({
    roleTitle: '',
    salaryCurrency: 'USD',
    salaryAmount: '',
    startDate: '',
    reportingManager: '',
    location: '',
  });

  const [errors, setErrors] = React.useState<FormErrors>({});
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});
  const [generationResult, setGenerationResult] = React.useState<GenerateOfferResult | null>(null);
  const [generationError, setGenerationError] = React.useState<string | null>(null);

  // Mutation hook
  const { generate, isPending, reset } = useGenerateOffer({
    onSuccess: (result) => {
      setGenerationResult(result);
      setGenerationError(null);
      showToast({
        message: 'Offer documents generated successfully',
        type: 'success',
      });
      onSuccess?.();
    },
    onError: (classified) => {
      setGenerationError(classified.message || 'Failed to generate offer documents');
      setGenerationResult(null);
    },
  });

  // ---------------------------------------------------------------------------
  // Field change handler
  // ---------------------------------------------------------------------------

  const handleChange = (field: keyof FormValues, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));

    // Clear error on valid input
    if (touched[field]) {
      const newValues = { ...values, [field]: value };
      const fieldErrors = validateForm(newValues);
      setErrors((prev) => ({ ...prev, [field]: fieldErrors[field] }));
    }
  };

  // ---------------------------------------------------------------------------
  // Blur handler (validate on blur)
  // ---------------------------------------------------------------------------

  const handleBlur = (field: keyof FormValues) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const fieldErrors = validateForm(values);
    setErrors((prev) => ({ ...prev, [field]: fieldErrors[field] }));
  };

  // ---------------------------------------------------------------------------
  // Submit handler
  // ---------------------------------------------------------------------------

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched
    const allTouched: Record<string, boolean> = {};
    Object.keys(values).forEach((key) => {
      allTouched[key] = true;
    });
    setTouched(allTouched);

    // Validate all fields
    const formErrors = validateForm(values);
    setErrors(formErrors);

    if (hasErrors(formErrors)) {
      return;
    }

    // Clear previous error
    setGenerationError(null);
    reset();

    // Trigger mutation
    generate({
      candidateId,
      roleTitle: values.roleTitle.trim(),
      salaryCurrency: values.salaryCurrency,
      salaryAmount: parseFloat(values.salaryAmount),
      startDate: values.startDate,
      reportingManager: values.reportingManager.trim(),
      location: values.location.trim(),
    });
  };

  // ---------------------------------------------------------------------------
  // Retry handler
  // ---------------------------------------------------------------------------

  const handleRetry = () => {
    setGenerationError(null);
    reset();
    handleSubmit(new Event('submit') as unknown as React.FormEvent);
  };

  // ---------------------------------------------------------------------------
  // Render: Success state
  // ---------------------------------------------------------------------------

  if (generationResult) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2Icon className="h-5 w-5 text-green-600" />
            Offer Documents Generated
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Offer documents have been generated for {candidateName}. The candidate&apos;s status has
            been updated to Offer Sent.
          </p>

          <div className="space-y-3">
            {/* Offer Letter Download */}
            <div className="flex items-center justify-between rounded-md border p-3">
              <div className="flex items-center gap-3">
                <FileTextIcon className="h-5 w-5 text-purple-500" aria-hidden="true" />
                <div>
                  <p className="text-sm font-medium">Offer Letter</p>
                  <p className="text-xs text-muted-foreground">PDF Document</p>
                </div>
              </div>
              <Button variant="outline" size="sm" asChild>
                <a
                  href={generationResult.offerLetterUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Download offer letter"
                >
                  <DownloadIcon className="mr-1 h-3 w-3" />
                  Download
                </a>
              </Button>
            </div>

            {/* NDA Download */}
            <div className="flex items-center justify-between rounded-md border p-3">
              <div className="flex items-center gap-3">
                <FileTextIcon className="h-5 w-5 text-amber-500" aria-hidden="true" />
                <div>
                  <p className="text-sm font-medium">NDA</p>
                  <p className="text-xs text-muted-foreground">PDF Document</p>
                </div>
              </div>
              <Button variant="outline" size="sm" asChild>
                <a
                  href={generationResult.ndaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Download NDA"
                >
                  <DownloadIcon className="mr-1 h-3 w-3" />
                  Download
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: Form
  // ---------------------------------------------------------------------------

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate Offer Documents</CardTitle>
        <p className="text-sm text-muted-foreground">
          Fill in the offer details to generate an offer letter and NDA for {candidateName}.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* Role Title */}
          <FormFieldWrapper
            id="offer-role-title"
            label="Role Title"
            error={touched.roleTitle ? errors.roleTitle : undefined}
            required
          >
            <input
              id="offer-role-title"
              type="text"
              className={cn(
                'flex h-9 w-full rounded-md border bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
                touched.roleTitle &&
                  errors.roleTitle &&
                  'border-destructive focus-visible:ring-destructive',
              )}
              placeholder="e.g. Senior Software Engineer"
              value={values.roleTitle}
              onChange={(e) => handleChange('roleTitle', e.target.value)}
              onBlur={() => handleBlur('roleTitle')}
              disabled={isPending}
              maxLength={200}
              aria-invalid={!!(touched.roleTitle && errors.roleTitle)}
              aria-describedby={
                touched.roleTitle && errors.roleTitle ? 'offer-role-title-error' : undefined
              }
            />
          </FormFieldWrapper>

          {/* Salary: Currency + Amount */}
          <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
            {/* Currency */}
            <FormFieldWrapper
              id="offer-salary-currency"
              label="Currency"
              error={touched.salaryCurrency ? errors.salaryCurrency : undefined}
              required
            >
              <select
                id="offer-salary-currency"
                className={cn(
                  'flex h-9 w-full rounded-md border bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
                  touched.salaryCurrency &&
                    errors.salaryCurrency &&
                    'border-destructive focus-visible:ring-destructive',
                )}
                value={values.salaryCurrency}
                onChange={(e) => handleChange('salaryCurrency', e.target.value)}
                onBlur={() => handleBlur('salaryCurrency')}
                disabled={isPending}
                aria-invalid={!!(touched.salaryCurrency && errors.salaryCurrency)}
                aria-describedby={
                  touched.salaryCurrency && errors.salaryCurrency
                    ? 'offer-salary-currency-error'
                    : undefined
                }
              >
                {SUPPORTED_CURRENCIES.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency} ({CURRENCY_SYMBOLS[currency]})
                  </option>
                ))}
              </select>
            </FormFieldWrapper>

            {/* Amount */}
            <FormFieldWrapper
              id="offer-salary-amount"
              label="Salary Amount"
              error={touched.salaryAmount ? errors.salaryAmount : undefined}
              required
            >
              <input
                id="offer-salary-amount"
                type="number"
                className={cn(
                  'flex h-9 w-full rounded-md border bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
                  touched.salaryAmount &&
                    errors.salaryAmount &&
                    'border-destructive focus-visible:ring-destructive',
                )}
                placeholder="e.g. 120000.00"
                value={values.salaryAmount}
                onChange={(e) => handleChange('salaryAmount', e.target.value)}
                onBlur={() => handleBlur('salaryAmount')}
                disabled={isPending}
                min={SALARY_MIN}
                max={SALARY_MAX}
                step="0.01"
                aria-invalid={!!(touched.salaryAmount && errors.salaryAmount)}
                aria-describedby={
                  touched.salaryAmount && errors.salaryAmount
                    ? 'offer-salary-amount-error'
                    : undefined
                }
              />
            </FormFieldWrapper>
          </div>

          {/* Start Date */}
          <FormFieldWrapper
            id="offer-start-date"
            label="Start Date"
            error={touched.startDate ? errors.startDate : undefined}
            required
          >
            <input
              id="offer-start-date"
              type="date"
              className={cn(
                'flex h-9 w-full rounded-md border bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
                touched.startDate &&
                  errors.startDate &&
                  'border-destructive focus-visible:ring-destructive',
              )}
              value={values.startDate}
              onChange={(e) => handleChange('startDate', e.target.value)}
              onBlur={() => handleBlur('startDate')}
              disabled={isPending}
              min={getTodayISO()}
              aria-invalid={!!(touched.startDate && errors.startDate)}
              aria-describedby={
                touched.startDate && errors.startDate ? 'offer-start-date-error' : undefined
              }
            />
          </FormFieldWrapper>

          {/* Reporting Manager */}
          <FormFieldWrapper
            id="offer-reporting-manager"
            label="Reporting Manager"
            error={touched.reportingManager ? errors.reportingManager : undefined}
            required
          >
            <input
              id="offer-reporting-manager"
              type="text"
              className={cn(
                'flex h-9 w-full rounded-md border bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
                touched.reportingManager &&
                  errors.reportingManager &&
                  'border-destructive focus-visible:ring-destructive',
              )}
              placeholder="e.g. Jane Smith"
              value={values.reportingManager}
              onChange={(e) => handleChange('reportingManager', e.target.value)}
              onBlur={() => handleBlur('reportingManager')}
              disabled={isPending}
              maxLength={100}
              aria-invalid={!!(touched.reportingManager && errors.reportingManager)}
              aria-describedby={
                touched.reportingManager && errors.reportingManager
                  ? 'offer-reporting-manager-error'
                  : undefined
              }
            />
          </FormFieldWrapper>

          {/* Location */}
          <FormFieldWrapper
            id="offer-location"
            label="Location"
            error={touched.location ? errors.location : undefined}
            required
          >
            <input
              id="offer-location"
              type="text"
              className={cn(
                'flex h-9 w-full rounded-md border bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
                touched.location &&
                  errors.location &&
                  'border-destructive focus-visible:ring-destructive',
              )}
              placeholder="e.g. Dubai, UAE"
              value={values.location}
              onChange={(e) => handleChange('location', e.target.value)}
              onBlur={() => handleBlur('location')}
              disabled={isPending}
              maxLength={200}
              aria-invalid={!!(touched.location && errors.location)}
              aria-describedby={
                touched.location && errors.location ? 'offer-location-error' : undefined
              }
            />
          </FormFieldWrapper>

          {/* Generation Error */}
          {generationError && (
            <div
              className="flex items-start gap-3 rounded-md border border-destructive/50 bg-destructive/5 p-3"
              role="alert"
            >
              <AlertCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <div className="flex-1">
                <p className="text-sm font-medium text-destructive">Generation Failed</p>
                <p className="mt-0.5 text-xs text-destructive/80">{generationError}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRetry}
                className="shrink-0"
              >
                Retry
              </Button>
            </div>
          )}

          {/* Loading State */}
          {isPending && (
            <div
              className="flex items-center gap-3 rounded-md border bg-muted/50 p-3"
              role="status"
              aria-live="polite"
            >
              <Loader2Icon className="h-4 w-4 animate-spin text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">Generating offer documents...</p>
                <p className="text-xs text-muted-foreground">
                  This may take up to 10 seconds. Please do not close this page.
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isPending} aria-busy={isPending}>
              {isPending ? (
                <>
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate Offer Documents'
              )}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// FormFieldWrapper — Inline labeled field with error display
// ---------------------------------------------------------------------------

interface FormFieldWrapperProps {
  id: string;
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}

function FormFieldWrapper({ id, label, error, required, children }: FormFieldWrapperProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
        {required && (
          <span className="ml-0.5 text-destructive" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
