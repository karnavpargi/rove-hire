'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeftIcon } from 'lucide-react';
import Link from 'next/link';
import { JobOpeningStatus, validateJobTitle, validateSkillsTags } from '@rove-hire/shared';
import { useJob, useUpdateJob } from '@/hooks/use-jobs';
import { useToast } from '@/components/shared/toast';
import { FormField } from '@/components/shared/form-field';
import { MarkdownEditor } from '@/components/shared/markdown-editor';
import { TagInput } from '@/components/shared/tag-input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';
import { ErrorState } from '@/components/shared/error-state';

interface FormErrors {
  title?: string;
  description?: string;
  skills?: string;
  status?: string;
}

export default function EditJobPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const toast = useToast();
  const { data: job, isLoading, error, refetch } = useJob(id);
  const { mutate: updateJob, isPending } = useUpdateJob();

  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [skills, setSkills] = React.useState<string[]>([]);
  const [status, setStatus] = React.useState<JobOpeningStatus>(JobOpeningStatus.Open);
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});
  const [initialized, setInitialized] = React.useState(false);

  React.useEffect(() => {
    if (job && !initialized) {
      setTitle(job.title);
      setDescription(job.description ?? '');
      setSkills(job.skills.map((s) => s.tag));
      setStatus(job.status);
      setInitialized(true);
    }
  }, [job, initialized]);

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

  const handleBlur = React.useCallback(
    (field: keyof FormErrors) => {
      setTouched((prev) => ({ ...prev, [field]: true }));
      const error = validateField(field);
      setErrors((prev) => ({ ...prev, [field]: error }));
    },
    [validateField],
  );

  const handleTitleChange = React.useCallback(
    (value: string) => {
      setTitle(value);
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

  const handleSubmit = React.useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      setTouched({ title: true, description: true, skills: true, status: true });

      const formErrors = validateForm();
      setErrors(formErrors);

      if (Object.keys(formErrors).length > 0) {
        return;
      }

      updateJob(
        {
          id,
          title: title.trim(),
          description: description.trim() || undefined,
          skills,
          status,
        },
        {
          onSuccess: () => {
            toast.success('Job opening updated successfully');
            router.push(`/jobs/${id}`);
          },
        },
      );
    },
    [id, title, description, skills, status, validateForm, updateJob, toast, router],
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton variant="profile" />
      </div>
    );
  }

  if (error || !job) {
    return (
      <ErrorState
        message="Job not found"
        description="We couldn't find this job opening or it may have been removed."
        onRetry={refetch}
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/jobs/${id}`} aria-label="Back to job">
            <ArrowLeftIcon className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit Job Opening</h1>
          <p className="text-sm text-muted-foreground">Update the details for {job.title}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
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

        <div className="flex items-center gap-3 pt-4 border-t">
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href={`/jobs/${id}`}>Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
