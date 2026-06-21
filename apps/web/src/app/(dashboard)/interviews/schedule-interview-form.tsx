'use client';

/**
 * Schedule Interview Form Component
 *
 * Form fields:
 * - Candidate ID (required — input or select)
 * - Date (required, must be in the future)
 * - Time (required)
 * - Type (Screening/Technical)
 * - Interviewer name (1-100 chars)
 * - Notes (optional, max 1000 chars)
 *
 * Client-side validation with inline errors.
 *
 * Validates: Requirements 6.3, 6.6
 */

import * as React from 'react';
import {
  InterviewType,
  validateInterviewerName,
  validateInterviewNotes,
} from '@rove-hire/shared';
import { FormField } from '@/components/shared/form-field';
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

interface ScheduleInterviewFormProps {
  onSubmit: (data: {
    candidateId: string;
    type: InterviewType;
    scheduledAt: string;
    interviewerName: string;
    notes?: string;
  }) => void;
  isPending: boolean;
  onCancel: () => void;
  candidates?: Array<{ id: string; name: string; email: string }>;
}

interface FormErrors {
  candidateId?: string;
  date?: string;
  time?: string;
  type?: string;
  interviewerName?: string;
  notes?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ScheduleInterviewForm({
  onSubmit,
  isPending,
  onCancel,
  candidates,
}: ScheduleInterviewFormProps) {
  const [candidateId, setCandidateId] = React.useState('');
  const [date, setDate] = React.useState('');
  const [time, setTime] = React.useState('');
  const [type, setType] = React.useState<InterviewType | ''>('');
  const [interviewerName, setInterviewerName] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});

  // -------------------------------------------------------------------------
  // Validation
  // -------------------------------------------------------------------------

  const validateField = React.useCallback(
    (field: string, value: string): string | undefined => {
      switch (field) {
        case 'candidateId':
          if (!value.trim()) return 'Candidate ID is required';
          return undefined;

        case 'date': {
          if (!value) return 'Date is required';
          const selectedDate = new Date(value);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (selectedDate < today) return 'Date must be in the future';
          return undefined;
        }

        case 'time':
          if (!value) return 'Time is required';
          return undefined;

        case 'type':
          if (!value) return 'Interview type is required';
          return undefined;

        case 'interviewerName': {
          const result = validateInterviewerName(value);
          if (!result.valid) return result.error;
          return undefined;
        }

        case 'notes': {
          if (value && value.length > 0) {
            const result = validateInterviewNotes(value);
            if (!result.valid) return result.error;
          }
          return undefined;
        }

        default:
          return undefined;
      }
    },
    [],
  );

  const validateAll = React.useCallback((): boolean => {
    const newErrors: FormErrors = {};

    newErrors.candidateId = validateField('candidateId', candidateId);
    newErrors.date = validateField('date', date);
    newErrors.time = validateField('time', time);
    newErrors.type = validateField('type', type);
    newErrors.interviewerName = validateField('interviewerName', interviewerName);
    newErrors.notes = validateField('notes', notes);

    // Additional future date+time check combining both fields
    if (date && time && !newErrors.date && !newErrors.time) {
      const scheduledDateTime = new Date(`${date}T${time}`);
      if (scheduledDateTime <= new Date()) {
        newErrors.date = 'Interview date and time must be in the future';
      }
    }

    setErrors(newErrors);
    setTouched({
      candidateId: true,
      date: true,
      time: true,
      type: true,
      interviewerName: true,
      notes: true,
    });

    return !Object.values(newErrors).some(Boolean);
  }, [candidateId, date, time, type, interviewerName, notes, validateField]);

  // -------------------------------------------------------------------------
  // Blur handlers
  // -------------------------------------------------------------------------

  const handleBlur = React.useCallback(
    (field: string, value: string) => {
      setTouched((prev) => ({ ...prev, [field]: true }));
      const error = validateField(field, value);
      setErrors((prev) => ({ ...prev, [field]: error }));
    },
    [validateField],
  );

  // -------------------------------------------------------------------------
  // Change handlers (clear errors on valid input)
  // -------------------------------------------------------------------------

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

  // -------------------------------------------------------------------------
  // Submit
  // -------------------------------------------------------------------------

  const handleSubmit = React.useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!validateAll()) return;

      const scheduledAt = new Date(`${date}T${time}`).toISOString();
      onSubmit({
        candidateId: candidateId.trim(),
        type: type as InterviewType,
        scheduledAt,
        interviewerName: interviewerName.trim(),
        notes: notes.trim() || undefined,
      });
    },
    [validateAll, date, time, candidateId, type, interviewerName, notes, onSubmit],
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {/* Candidate ID */}
      <div className="space-y-1.5">
        <Label htmlFor="candidate-id" className="text-sm font-medium">
          Candidate ID<span className="ml-0.5 text-destructive" aria-hidden="true">*</span>
        </Label>
        <Select
          value={candidateId}
          onValueChange={(val) => {
            setCandidateId(val);
            handleFieldChange('candidateId', val);
            setTouched((prev) => ({ ...prev, candidateId: true }));
            setErrors((prev) => ({ ...prev, candidateId: undefined }));
          }}
        >
          <SelectTrigger
            id="candidate-id"
            aria-invalid={!!(touched.candidateId && errors.candidateId)}
            aria-describedby={errors.candidateId ? 'candidate-id-error' : undefined}
            aria-required="true"
          >
            <SelectValue placeholder="Select a candidate..." />
          </SelectTrigger>
          <SelectContent>
            {candidates?.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name} ({c.email})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {touched.candidateId && errors.candidateId && (
          <p
            id="candidate-id-error"
            className="text-xs text-destructive"
            role="alert"
            aria-live="assertive"
          >
            {errors.candidateId}
          </p>
        )}
      </div>

      {/* Date */}
      <div className="space-y-1.5">
        <Label htmlFor="schedule-date" className="text-sm font-medium">
          Date<span className="ml-0.5 text-destructive" aria-hidden="true">*</span>
        </Label>
        <input
          id="schedule-date"
          type="date"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            handleFieldChange('date', e.target.value);
          }}
          onBlur={() => handleBlur('date', date)}
          min={getTomorrowDateString()}
          aria-invalid={!!(touched.date && errors.date)}
          aria-describedby={errors.date ? 'schedule-date-error' : undefined}
          aria-required="true"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
        />
        {touched.date && errors.date && (
          <p
            id="schedule-date-error"
            className="text-xs text-destructive"
            role="alert"
            aria-live="assertive"
          >
            {errors.date}
          </p>
        )}
      </div>

      {/* Time */}
      <div className="space-y-1.5">
        <Label htmlFor="schedule-time" className="text-sm font-medium">
          Time<span className="ml-0.5 text-destructive" aria-hidden="true">*</span>
        </Label>
        <input
          id="schedule-time"
          type="time"
          value={time}
          onChange={(e) => {
            setTime(e.target.value);
            handleFieldChange('time', e.target.value);
          }}
          onBlur={() => handleBlur('time', time)}
          aria-invalid={!!(touched.time && errors.time)}
          aria-describedby={errors.time ? 'schedule-time-error' : undefined}
          aria-required="true"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
        />
        {touched.time && errors.time && (
          <p
            id="schedule-time-error"
            className="text-xs text-destructive"
            role="alert"
            aria-live="assertive"
          >
            {errors.time}
          </p>
        )}
      </div>

      {/* Interview Type */}
      <div className="space-y-1.5">
        <Label htmlFor="schedule-type" className="text-sm font-medium">
          Type<span className="ml-0.5 text-destructive" aria-hidden="true">*</span>
        </Label>
        <Select
          value={type}
          onValueChange={(val) => {
            setType(val as InterviewType);
            handleFieldChange('type', val);
            setTouched((prev) => ({ ...prev, type: true }));
            setErrors((prev) => ({ ...prev, type: undefined }));
          }}
        >
          <SelectTrigger
            id="schedule-type"
            aria-invalid={!!(touched.type && errors.type)}
            aria-describedby={errors.type ? 'schedule-type-error' : undefined}
            aria-required="true"
          >
            <SelectValue placeholder="Select interview type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={InterviewType.Screening}>Screening</SelectItem>
            <SelectItem value={InterviewType.Technical}>Technical</SelectItem>
          </SelectContent>
        </Select>
        {touched.type && errors.type && (
          <p
            id="schedule-type-error"
            className="text-xs text-destructive"
            role="alert"
            aria-live="assertive"
          >
            {errors.type}
          </p>
        )}
      </div>

      {/* Interviewer Name */}
      <FormField
        name="interviewerName"
        label="Interviewer Name"
        required
        value={interviewerName}
        onChange={(val) => {
          setInterviewerName(val);
          handleFieldChange('interviewerName', val);
        }}
        error={touched.interviewerName ? errors.interviewerName : undefined}
        validate={(val) => validateField('interviewerName', val)}
        placeholder="Enter interviewer's full name"
        maxLength={100}
      />

      {/* Notes */}
      <div className="space-y-1.5">
        <Label htmlFor="schedule-notes" className="text-sm font-medium">
          Notes
        </Label>
        <Textarea
          id="schedule-notes"
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            handleFieldChange('notes', e.target.value);
          }}
          onBlur={() => handleBlur('notes', notes)}
          placeholder="Optional interview notes (max 1000 characters)"
          maxLength={1000}
          rows={3}
          aria-invalid={!!(touched.notes && errors.notes)}
          aria-describedby={errors.notes ? 'schedule-notes-error' : undefined}
        />
        <div className="flex justify-between">
          {touched.notes && errors.notes ? (
            <p
              id="schedule-notes-error"
              className="text-xs text-destructive"
              role="alert"
              aria-live="assertive"
            >
              {errors.notes}
            </p>
          ) : (
            <span />
          )}
          <span className="text-xs text-muted-foreground">
            {notes.length}/1000
          </span>
        </div>
      </div>

      {/* Actions */}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Scheduling...' : 'Schedule Interview'}
        </Button>
      </DialogFooter>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function getTomorrowDateString(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
}
