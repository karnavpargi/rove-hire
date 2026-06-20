'use client';

/**
 * Create Candidate Page — `/candidates/new`
 *
 * Form for adding a new candidate with:
 * - Name (required, max 100 chars)
 * - Email (required, RFC 5322)
 * - Resume PDF upload (drag-and-drop, 10MB max)
 * - Job opening selector (closed jobs disabled)
 *
 * On success: displays magic link URL in read-only field with copy button.
 * Shows toast notification on success.
 * Disables submit during submission, preserves form data on failure.
 * Handles duplicate email+job error from backend.
 *
 * Validates: Requirements 4.1, 4.5, 4.7, 4.8, 4.9, 4.10, 17.5, 17.6, 27.2, 27.4
 */

import * as React from 'react';
import { ArrowLeftIcon, CopyIcon, CheckIcon, LinkIcon } from 'lucide-react';
import Link from 'next/link';
import {
  validateCandidateName,
  validateEmail,
  JobOpeningStatus,
} from '@rove-hire/shared';
import { useJobs } from '@/hooks/use-jobs';
import { useToast } from '@/components/shared/toast';
import { FormField } from '@/components/shared/form-field';
import { FileUpload } from '@/components/shared/file-upload';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from '@/components/ui/select';
import { graphqlClient, handleGraphQLError, classifyError } from '@/lib/graphql-client';
import { CREATE_CANDIDATE_MUTATION } from '@/lib/graphql/candidates';
import { GraphQLErrorCode } from '@rove-hire/shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FormErrors {
  name?: string;
  email?: string;
  resume?: string;
  jobOpeningId?: string;
}

interface CreateCandidateResult {
  createCandidate: {
    candidate: {
      id: string;
      name: string;
      email: string;
      status: string;
      createdAt: string;
    };
    magicLinkUrl: string;
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CreateCandidatePage() {
  const toast = useToast();
  const { data: jobs, isLoading: jobsLoading } = useJobs();

  // Form state
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [resume, setResume] = React.useState<File | null>(null);
  const [jobOpeningId, setJobOpeningId] = React.useState('');
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});

  // Submission state
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [magicLinkUrl, setMagicLinkUrl] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------

  const validateField = React.useCallback(
    (field: keyof FormErrors): string | undefined => {
      switch (field) {
        case 'name': {
          const result = validateCandidateName(name);
          return result.valid ? undefined : result.error;
        }
        case 'email': {
          const result = validateEmail(email);
          return result.valid ? undefined : result.error;
        }
        case 'resume': {
          if (!resume) return 'Resume PDF is required';
          if (resume.type !== 'application/pdf') return 'Only PDF files are accepted';
          if (resume.size > 10 * 1024 * 1024) return 'File size must not exceed 10MB';
          return undefined;
        }
        case 'jobOpeningId': {
          if (!jobOpeningId) return 'Job opening is required';
          // Check if selected job is closed
          const selectedJob = jobs?.find((j) => j.id === jobOpeningId);
          if (selectedJob?.status === JobOpeningStatus.Closed) {
            return 'This job is closed and not accepting new candidates';
          }
          return undefined;
        }
        default:
          return undefined;
      }
    },
    [name, email, resume, jobOpeningId, jobs],
  );

  const validateForm = React.useCallback((): FormErrors => {
    const newErrors: FormErrors = {};
    const nameError = validateField('name');
    const emailError = validateField('email');
    const resumeError = validateField('resume');
    const jobError = validateField('jobOpeningId');

    if (nameError) newErrors.name = nameError;
    if (emailError) newErrors.email = emailError;
    if (resumeError) newErrors.resume = resumeError;
    if (jobError) newErrors.jobOpeningId = jobError;

    return newErrors;
  }, [validateField]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleBlur = React.useCallback(
    (field: keyof FormErrors) => {
      setTouched((prev) => ({ ...prev, [field]: true }));
      const error = validateField(field);
      setErrors((prev) => ({ ...prev, [field]: error }));
    },
    [validateField],
  );

  const handleNameChange = React.useCallback(
    (value: string) => {
      setName(value);
      if (touched.name) {
        const result = validateCandidateName(value);
        setErrors((prev) => ({
          ...prev,
          name: result.valid ? undefined : result.error,
        }));
      }
    },
    [touched.name],
  );

  const handleEmailChange = React.useCallback(
    (value: string) => {
      setEmail(value);
      if (touched.email) {
        const result = validateEmail(value);
        setErrors((prev) => ({
          ...prev,
          email: result.valid ? undefined : result.error,
        }));
      }
    },
    [touched.email],
  );

  const handleResumeChange = React.useCallback(
    (file: File | null) => {
      setResume(file);
      if (touched.resume || file) {
        setTouched((prev) => ({ ...prev, resume: true }));
        if (!file) {
          setErrors((prev) => ({ ...prev, resume: 'Resume PDF is required' }));
        } else if (file.type !== 'application/pdf') {
          setErrors((prev) => ({ ...prev, resume: 'Only PDF files are accepted' }));
        } else if (file.size > 10 * 1024 * 1024) {
          setErrors((prev) => ({ ...prev, resume: 'File size must not exceed 10MB' }));
        } else {
          setErrors((prev) => ({ ...prev, resume: undefined }));
        }
      }
    },
    [touched.resume],
  );

  const handleJobChange = React.useCallback(
    (value: string) => {
      setJobOpeningId(value);
      if (touched.jobOpeningId) {
        const selectedJob = jobs?.find((j) => j.id === value);
        if (selectedJob?.status === JobOpeningStatus.Closed) {
          setErrors((prev) => ({
            ...prev,
            jobOpeningId: 'This job is closed and not accepting new candidates',
          }));
        } else {
          setErrors((prev) => ({ ...prev, jobOpeningId: undefined }));
        }
      }
    },
    [touched.jobOpeningId, jobs],
  );

  /** Convert file to base64 for upload */
  const fileToBase64 = React.useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data:application/pdf;base64, prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }, []);

  /** Copy magic link URL to clipboard */
  const handleCopyLink = React.useCallback(async () => {
    if (!magicLinkUrl) return;
    try {
      await navigator.clipboard.writeText(magicLinkUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers without clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = magicLinkUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [magicLinkUrl]);

  /** Handle form submission */
  const handleSubmit = React.useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      // Mark all fields as touched
      setTouched({ name: true, email: true, resume: true, jobOpeningId: true });

      // Validate all fields
      const formErrors = validateForm();
      setErrors(formErrors);

      if (Object.keys(formErrors).length > 0) {
        return;
      }

      if (!resume) return;

      setIsSubmitting(true);

      try {
        const resumeBase64 = await fileToBase64(resume);

        const result = await graphqlClient.request<CreateCandidateResult>(
          CREATE_CANDIDATE_MUTATION,
          {
            input: {
              name: name.trim(),
              email: email.trim().toLowerCase(),
              jobOpeningId,
            },
            resumeBase64,
            resumeFilename: resume.name,
          },
        );

        // Success
        setMagicLinkUrl(result.createCandidate.magicLinkUrl);
        toast.success(
          'Candidate created successfully',
          'Magic link generated — share it with the candidate.',
        );
      } catch (error: unknown) {
        // Handle specific errors
        const classified = classifyError(error);

        if (classified.type === GraphQLErrorCode.CONFLICT_ERROR) {
          // Duplicate email+job error
          setErrors((prev) => ({
            ...prev,
            email: 'A candidate with this email already exists for the selected job opening',
          }));
        } else if (classified.type === GraphQLErrorCode.VALIDATION_ERROR) {
          // Map field errors from backend
          if (classified.fieldErrors) {
            const newErrors: FormErrors = {};
            for (const fe of classified.fieldErrors) {
              if (fe.field in newErrors || ['name', 'email', 'resume', 'jobOpeningId'].includes(fe.field)) {
                (newErrors as Record<string, string>)[fe.field] = fe.message;
              }
            }
            setErrors((prev) => ({ ...prev, ...newErrors }));
          }
        } else {
          // For all other errors, use the standard handler (shows toasts, etc.)
          handleGraphQLError(error, {
            formData: { name, email, jobOpeningId },
            currentPath: '/candidates/new',
          });
        }
        // Form data is preserved on failure (state remains intact)
      } finally {
        setIsSubmitting(false);
      }
    },
    [name, email, resume, jobOpeningId, validateForm, fileToBase64, toast],
  );

  // ---------------------------------------------------------------------------
  // Computed
  // ---------------------------------------------------------------------------

  const openJobs = React.useMemo(
    () => jobs?.filter((j) => j.status === JobOpeningStatus.Open) ?? [],
    [jobs],
  );

  const closedJobs = React.useMemo(
    () => jobs?.filter((j) => j.status === JobOpeningStatus.Closed) ?? [],
    [jobs],
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  // If submission succeeded, show the magic link result
  if (magicLinkUrl) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Page header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/candidates" aria-label="Back to candidates">
              <ArrowLeftIcon className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Candidate Created</h1>
            <p className="text-sm text-muted-foreground">
              Share the magic link below with the candidate to complete their application.
            </p>
          </div>
        </div>

        {/* Success card */}
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <CheckIcon className="h-5 w-5" />
            <span className="font-medium">Candidate added successfully</span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="magic-link" className="text-sm font-medium flex items-center gap-2">
              <LinkIcon className="h-4 w-4" />
              Magic Link URL
            </Label>
            <div className="flex gap-2">
              <Input
                id="magic-link"
                value={magicLinkUrl}
                readOnly
                className="flex-1 font-mono text-xs bg-muted"
                aria-label="Magic link URL for candidate application"
              />
              <Button
                variant="outline"
                size="default"
                onClick={handleCopyLink}
                aria-label={copied ? 'Copied to clipboard' : 'Copy magic link to clipboard'}
              >
                {copied ? (
                  <CheckIcon className="h-4 w-4 mr-1" />
                ) : (
                  <CopyIcon className="h-4 w-4 mr-1" />
                )}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              This link expires in 14 days. The candidate can use it to submit their full application.
            </p>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button asChild>
              <Link href="/candidates/new">Add Another Candidate</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/candidates">View All Candidates</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/candidates" aria-label="Back to candidates">
            <ArrowLeftIcon className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Add Candidate</h1>
          <p className="text-sm text-muted-foreground">
            Add a new candidate and generate a magic link for their application form.
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        {/* Name */}
        <FormField
          name="name"
          label="Full Name"
          value={name}
          onChange={handleNameChange}
          onBlur={() => handleBlur('name')}
          error={errors.name}
          required
          placeholder="e.g. Jane Doe"
          maxLength={100}
          hint="Max 100 characters"
          disabled={isSubmitting}
        />

        {/* Email */}
        <FormField
          name="email"
          label="Email Address"
          type="email"
          value={email}
          onChange={handleEmailChange}
          onBlur={() => handleBlur('email')}
          error={errors.email}
          required
          placeholder="e.g. jane.doe@example.com"
          disabled={isSubmitting}
          hint="Must be a valid email address (RFC 5322)"
        />

        {/* Resume Upload */}
        <div className="space-y-1.5" onBlur={() => handleBlur('resume')}>
          <Label className="text-sm font-medium">
            Resume (PDF)
            <span className="ml-0.5 text-destructive" aria-hidden="true">*</span>
          </Label>
          <FileUpload
            label="Upload resume PDF"
            value={resume}
            onChange={handleResumeChange}
            error={errors.resume}
            disabled={isSubmitting}
          />
        </div>

        {/* Job Opening Selector */}
        <div className="space-y-1.5">
          <Label htmlFor="job-opening" className="text-sm font-medium">
            Job Opening
            <span className="ml-0.5 text-destructive" aria-hidden="true">*</span>
          </Label>
          <Select
            value={jobOpeningId}
            onValueChange={handleJobChange}
            disabled={isSubmitting || jobsLoading}
          >
            <SelectTrigger
              id="job-opening"
              className="w-full"
              aria-invalid={!!errors.jobOpeningId}
              aria-describedby={errors.jobOpeningId ? 'job-opening-error' : undefined}
            >
              <SelectValue placeholder={jobsLoading ? 'Loading jobs...' : 'Select a job opening'} />
            </SelectTrigger>
            <SelectContent>
              {/* Open jobs */}
              {openJobs.length > 0 && (
                <SelectGroup>
                  <SelectLabel>Open Positions</SelectLabel>
                  {openJobs.map((job) => (
                    <SelectItem key={job.id} value={job.id}>
                      {job.title}
                    </SelectItem>
                  ))}
                </SelectGroup>
              )}

              {/* Closed jobs - disabled with explanation */}
              {closedJobs.length > 0 && (
                <SelectGroup>
                  <SelectLabel>Closed Positions (not accepting candidates)</SelectLabel>
                  {closedJobs.map((job) => (
                    <SelectItem key={job.id} value={job.id} disabled>
                      {job.title} — Closed
                    </SelectItem>
                  ))}
                </SelectGroup>
              )}

              {/* No jobs available */}
              {!jobsLoading && (!jobs || jobs.length === 0) && (
                <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                  No job openings available. Create a job first.
                </div>
              )}
            </SelectContent>
          </Select>

          {/* Job selector error */}
          {errors.jobOpeningId && (
            <p
              id="job-opening-error"
              className="text-xs text-destructive"
              role="alert"
              aria-live="assertive"
            >
              {errors.jobOpeningId}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-4 border-t">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating Candidate...' : 'Add Candidate'}
          </Button>
          <Button type="button" variant="outline" asChild disabled={isSubmitting}>
            <Link href="/candidates">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
