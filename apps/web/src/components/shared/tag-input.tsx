'use client';

import * as React from 'react';
import { XIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export interface TagInputProps {
  /** Unique field identifier */
  name: string;
  /** Visible label text */
  label: string;
  /** Current tags array */
  value: string[];
  /** Called when tags change */
  onChange: (tags: string[]) => void;
  /** Error message to display */
  error?: string;
  /** Max number of tags allowed */
  maxTags?: number;
  /** Max length per tag */
  maxTagLength?: number;
  /** Placeholder text */
  placeholder?: string;
  /** Whether the field is required */
  required?: boolean;
}

/**
 * TagInput allows adding/removing string tags.
 * - Type text + press Enter to add a tag
 * - Click X to remove a tag
 * - Validates max tags count and per-tag length
 *
 * Used for job opening skills tags (1-20 tags, each max 50 chars).
 */
export function TagInput({
  name,
  label,
  value,
  onChange,
  error,
  maxTags = 20,
  maxTagLength = 50,
  placeholder = 'Type a skill and press Enter',
  required,
}: TagInputProps) {
  const [inputValue, setInputValue] = React.useState('');
  const [inputError, setInputError] = React.useState<string | undefined>();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const errorId = `${name}-error`;

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const trimmed = inputValue.trim();

        if (!trimmed) return;

        if (trimmed.length > maxTagLength) {
          setInputError(`Tag must not exceed ${maxTagLength} characters`);
          return;
        }

        if (value.length >= maxTags) {
          setInputError(`Maximum ${maxTags} tags allowed`);
          return;
        }

        // Check for duplicates (case-insensitive)
        if (value.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
          setInputError('This tag already exists');
          return;
        }

        setInputError(undefined);
        onChange([...value, trimmed]);
        setInputValue('');
      }

      // Remove last tag on Backspace when input is empty
      if (e.key === 'Backspace' && !inputValue && value.length > 0) {
        onChange(value.slice(0, -1));
      }
    },
    [inputValue, value, onChange, maxTags, maxTagLength],
  );

  const handleRemove = React.useCallback(
    (index: number) => {
      const updated = value.filter((_, i) => i !== index);
      onChange(updated);
      setInputError(undefined);
    },
    [value, onChange],
  );

  const handleInputChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value);
      if (inputError) setInputError(undefined);
    },
    [inputError],
  );

  const displayError = error || inputError;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={name} className="text-sm font-medium">
        {label}
        {required && (
          <span className="ml-0.5 text-destructive" aria-hidden="true">
            *
          </span>
        )}
      </Label>

      {/* Tags display */}
      <div
        className={cn(
          'flex min-h-[40px] flex-wrap gap-1.5 rounded-md border border-input bg-transparent px-3 py-2',
          'focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50',
          displayError && 'border-destructive',
        )}
        onClick={() => inputRef.current?.focus()}
        role="group"
        aria-label={`${label} tags`}
      >
        {value.map((tag, index) => (
          <span
            key={`${tag}-${index}`}
            className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
          >
            {tag}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleRemove(index);
              }}
              className="rounded-full p-0.5 hover:bg-primary/20 focus:outline-none focus:ring-1 focus:ring-primary"
              aria-label={`Remove ${tag}`}
            >
              <XIcon className="h-3 w-3" />
            </button>
          </span>
        ))}

        <Input
          ref={inputRef}
          id={name}
          name={name}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : ''}
          className="h-auto min-w-[120px] flex-1 border-0 p-0 shadow-none focus-visible:ring-0"
          aria-invalid={!!displayError}
          aria-describedby={displayError ? errorId : undefined}
          aria-required={required}
          maxLength={maxTagLength}
        />
      </div>

      {/* Tag count hint */}
      <p className="text-xs text-muted-foreground">
        {value.length}/{maxTags} tags
      </p>

      {/* Error message */}
      {displayError && (
        <p id={errorId} className="text-xs text-destructive" role="alert" aria-live="assertive">
          {displayError}
        </p>
      )}
    </div>
  );
}
