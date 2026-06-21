'use client';

/**
 * Record Feedback Form Component
 *
 * Form fields:
 * - Recommendation (hire/no-hire/maybe) — required
 * - Notes (1-2000 chars) — required
 *
 * Client-side validation with inline errors.
 *
 * Validates: Requirements 6.4, 6.7
 */

import * as React from 'react';
import { Recommendation, validateFeedback } from '@rove-hire/shared';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DialogFooter } from '@/components/ui/dialog';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RecordFeedbackFormProps {
  onSubmit: (data: { recommendation: Recommendation; feedback: string }) => void;
  isPending: boolean;
  onCancel: () => void;
}

interface FormErrors {
  recommendation?: string;
  feedback?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RecordFeedbackForm({ onSubmit, isPending, onCancel }: RecordFeedbackFormProps) {
  const [recommendation, setRecommendation] = React.useState<Recommendation | ''>('');
  const [feedback, setFeedback] = React.useState('');
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});

  // -------------------------------------------------------------------------
  // Validation
  // -------------------------------------------------------------------------

  const validateField = React.useCallback((field: string, value: string): string | undefined => {
    switch (field) {
      case 'recommendation':
        if (!value) return 'Recommendation is required';
        return undefined;

      case 'feedback': {
        const result = validateFeedback(value);
        if (!result.valid) return result.error;
        return undefined;
      }

      default:
        return undefined;
    }
  }, []);

  const validateAll = React.useCallback((): boolean => {
    const newErrors: FormErrors = {};
    newErrors.recommendation = validateField('recommendation', recommendation);
    newErrors.feedback = validateField('feedback', feedback);

    setErrors(newErrors);
    setTouched({ recommendation: true, feedback: true });

    return !Object.values(newErrors).some(Boolean);
  }, [recommendation, feedback, validateField]);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleBlur = React.useCallback(
    (field: string, value: string) => {
      setTouched((prev) => ({ ...prev, [field]: true }));
      const error = validateField(field, value);
      setErrors((prev) => ({ ...prev, [field]: error }));
    },
    [validateField],
  );

  const handleFieldChange = React.useCallback(
    (field: string, value: string) => {
      if (touched[field]) {
        const error = validateField(field, value);
        if (!error) {
          setErrors((prev) => ({ ...prev, [field]: undefined }));
        }
      }
    },
    [touched, validateField],
  );

  const handleSubmit = React.useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!validateAll()) return;

      onSubmit({
        recommendation: recommendation as Recommendation,
        feedback: feedback.trim(),
      });
    },
    [validateAll, recommendation, feedback, onSubmit],
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {/* Recommendation */}
      <div className="space-y-1.5">
        <Label htmlFor="feedback-recommendation" className="text-sm font-medium">
          Recommendation
          <span className="ml-0.5 text-destructive" aria-hidden="true">
            *
          </span>
        </Label>
        <Select
          value={recommendation}
          onValueChange={(val) => {
            setRecommendation(val as Recommendation);
            handleFieldChange('recommendation', val);
            setTouched((prev) => ({ ...prev, recommendation: true }));
            setErrors((prev) => ({ ...prev, recommendation: undefined }));
          }}
        >
          <SelectTrigger
            id="feedback-recommendation"
            aria-invalid={!!(touched.recommendation && errors.recommendation)}
            aria-describedby={errors.recommendation ? 'feedback-recommendation-error' : undefined}
            aria-required="true"
          >
            <SelectValue placeholder="Select recommendation" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={Recommendation.Hire}>Hire</SelectItem>
            <SelectItem value={Recommendation.NoHire}>No Hire</SelectItem>
            <SelectItem value={Recommendation.Maybe}>Maybe</SelectItem>
          </SelectContent>
        </Select>
        {touched.recommendation && errors.recommendation && (
          <p
            id="feedback-recommendation-error"
            className="text-xs text-destructive"
            role="alert"
            aria-live="assertive"
          >
            {errors.recommendation}
          </p>
        )}
      </div>

      {/* Feedback Notes */}
      <div className="space-y-1.5">
        <Label htmlFor="feedback-notes" className="text-sm font-medium">
          Feedback Notes
          <span className="ml-0.5 text-destructive" aria-hidden="true">
            *
          </span>
        </Label>
        <Textarea
          id="feedback-notes"
          value={feedback}
          onChange={(e) => {
            setFeedback(e.target.value);
            handleFieldChange('feedback', e.target.value);
          }}
          onBlur={() => handleBlur('feedback', feedback)}
          placeholder="Provide detailed feedback (1-2000 characters)"
          maxLength={2000}
          rows={5}
          aria-invalid={!!(touched.feedback && errors.feedback)}
          aria-describedby={errors.feedback ? 'feedback-notes-error' : undefined}
          aria-required="true"
        />
        <div className="flex justify-between">
          {touched.feedback && errors.feedback ? (
            <p
              id="feedback-notes-error"
              className="text-xs text-destructive"
              role="alert"
              aria-live="assertive"
            >
              {errors.feedback}
            </p>
          ) : (
            <span />
          )}
          <span className="text-xs text-muted-foreground">{feedback.length}/2000</span>
        </div>
      </div>

      {/* Actions */}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Submitting...' : 'Submit Feedback'}
        </Button>
      </DialogFooter>
    </form>
  );
}
