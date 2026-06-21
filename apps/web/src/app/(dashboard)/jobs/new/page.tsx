'use client';

/**
 * Create Job Page — `/jobs/new`
 *
 * Form for creating a new job opening with:
 * - Title (required, max 200 chars)
 * - Markdown description (max 5000 chars)
 * - Skills tags (1-20 tags, each max 50 chars)
 * - Status (Open/Closed, defaults to Open)
 *
 * Client-side validation with inline errors.
 * Toast notification on successful creation.
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.5, 3.6, 3.7, 3.8
 */

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon } from 'lucide-react';
import Link from 'next/link';
import { JobOpeningStatus, validateJobTitle, validateSkillsTags } from '@rove-hire/shared';
import { useCreateJob } from '@/hooks/use-jobs';
import { useToast } from '@/components/shared/toast';
import { FormField } from '@/components/shared/form-field';
import { MarkdownEditor } from '@/components/shared/markdown-editor';
import { TagInput } from '@/components/shared/tag-input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface FormErrors {
  title?: string;
  description?: string;
  skills?: string;
  status?: string;
}

export default function CreateJobPage() {
  const router = useRouter();
  const toast = useToast();
  const { mutate: createJob, isPending } = useCreateJob();

  // Form state
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [skills, setSkills] = React.useState<string[]>([]);
  const [status, setStatus] = React.useState<JobOpeningStatus>(JobOpeningStatus.Open);
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});

  /** Validate individual fields and return error string or undefined */
  const validateField = React.useCallback(
    (field: keyof FormErrors): string | undefined => {
      switch (field) {
        case 'title': {
          const result = validateJobTitle(title);
          return result.valid ? undefined : result.error;
        }
        case 'description': {
          if (description.length > 5000) {
            return 'Description must not exceed 5000 characters';
          }
          return undefined;
        }
        case 'skills': {
          const result = validateSkillsTags(skills);
          return result.valid ? undefined : result.error;
        }
        default:
          return undefined;
      }
    },
    [title, description, skills],
  );

  /** Validate all fields and return errors map */
  const validateForm = React.useCallback((): FormErrors => {
    const newErrors: FormErrors = {};
    const titleError = validateField('title');
    const descError = validateField('description');
    const skillsError = validateField('skills');

    if (titleError) newErrors.title = titleError;
    if (descError) newErrors.description = descError;
    if (skillsError) newErrors.skills = skillsError;

    return newErrors;
  }, [validateField]);

  /** Handle field blur — trigger validation */
  const handleBlur = React.useCallback(
    (field: keyof FormErrors) => {
      setTouched((prev) => ({ ...prev, [field]: true }));
      const error = validateField(field);
      setErrors((prev) => ({ ...prev, [field]: error }));
    },
    [validateField],
  );

  /** Handle title change */
  const handleTitleChange = React.useCallback(
    (value: string) => {
      setTitle(value);
      // Re-validate on next tick if touched
      if (touched.title) {
        const result = validateJobTitle(value);
        setErrors((prev) => ({
          ...prev,
          title: result.valid ? undefined : result.error,
        }));
      }
    },
    [touched.title],
  );

  /** Handle description change */
  const handleDescriptionChange = React.useCallback(
    (value: string) => {
      setDescription(value);
      if (touched.description) {
        const error =
          value.length > 5000 ? 'Description must not exceed 5000 characters' : undefined;
        setErrors((prev) => ({ ...prev, description: error }));
      }
    },
    [touched.description],
  );

  /** Handle skills change */
  const handleSkillsChange = React.useCallback(
    (newSkills: string[]) => {
      setSkills(newSkills);
      if (touched.skills) {
        const result = validateSkillsTags(newSkills);
        setErrors((prev) => ({
          ...prev,
          skills: result.valid ? undefined : result.error,
        }));
      }
    },
    [touched.skills],
  );

  /** Handle form submission */
  const handleSubmit = React.useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      // Mark all fields as touched
      setTouched({ title: true, description: true, skills: true, status: true });

      // Validate
      const formErrors = validateForm();
      setErrors(formErrors);

      if (Object.keys(formErrors).length > 0) {
        return;
      }

      // Submit
      createJob(
        {
          title: title.trim(),
          description: description.trim() || undefined,
          skills,
        },
        {
          onSuccess: () => {
            toast.success('Job opening created successfully');
            router.push('/jobs');
          },
        },
      );
    },
    [title, description, skills, validateForm, createJob, toast, router],
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/jobs" aria-label="Back to jobs">
            <ArrowLeftIcon className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create Job Opening</h1>
          <p className="text-sm text-muted-foreground">
            Add a new position to start receiving candidates
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        {/* Title */}
        <FormField
          name="title"
          label="Job Title"
          value={title}
          onChange={handleTitleChange}
          onBlur={() => handleBlur('title')}
          error={errors.title}
          required
          placeholder="e.g. Senior Frontend Engineer"
          maxLength={200}
          hint="1-200 characters"
        />

        {/* Description (Markdown) */}
        <div onBlur={() => handleBlur('description')}>
          <MarkdownEditor
            id="description"
            label="Description"
            value={description}
            onChange={handleDescriptionChange}
            error={errors.description}
            maxLength={5000}
            placeholder="Describe the role, responsibilities, and requirements (supports Markdown)..."
          />
        </div>

        {/* Skills Tags */}
        <div onBlur={() => handleBlur('skills')}>
          <TagInput
            name="skills"
            label="Skills"
            value={skills}
            onChange={handleSkillsChange}
            error={errors.skills}
            maxTags={20}
            maxTagLength={50}
            placeholder="Type a skill and press Enter"
            required
          />
        </div>

        {/* Status */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Status</Label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="status"
                value={JobOpeningStatus.Open}
                checked={status === JobOpeningStatus.Open}
                onChange={() => setStatus(JobOpeningStatus.Open)}
                className="h-4 w-4 text-primary focus:ring-primary"
              />
              <span className="text-sm">Open</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="status"
                value={JobOpeningStatus.Closed}
                checked={status === JobOpeningStatus.Closed}
                onChange={() => setStatus(JobOpeningStatus.Closed)}
                className="h-4 w-4 text-primary focus:ring-primary"
              />
              <span className="text-sm">Closed</span>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-4 border-t">
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Creating...' : 'Create Job Opening'}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/jobs">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
