'use client';

import * as React from 'react';
import { FileIcon, UploadCloudIcon, XIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

/** Maximum file size: 10MB in bytes */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/** Accepted MIME type */
const ACCEPTED_MIME = 'application/pdf';

export interface FileUploadProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** Label for accessibility */
  label?: string;
  /** Current selected file */
  value?: File | null;
  /** Callback when a file is selected or cleared */
  onChange: (file: File | null) => void;
  /** Error message (externally controlled) */
  error?: string;
  /** Whether the input is disabled */
  disabled?: boolean;
}

/**
 * FileUpload provides a drag-and-drop PDF upload area with 10MB validation.
 * Displays drag state, validates MIME type and file size, shows selected file info.
 */
export function FileUpload({
  label = 'Upload PDF',
  value,
  onChange,
  error: externalError,
  disabled = false,
  className,
  ...props
}: FileUploadProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const [internalError, setInternalError] = React.useState<string | undefined>();
  const inputRef = React.useRef<HTMLInputElement>(null);

  const displayError = externalError || internalError;

  const validateFile = React.useCallback((file: File): string | undefined => {
    if (file.type !== ACCEPTED_MIME) {
      return 'Only PDF files are accepted';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File size must not exceed 10MB';
    }
    return undefined;
  }, []);

  const handleFile = React.useCallback(
    (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        setInternalError(validationError);
        onChange(null);
      } else {
        setInternalError(undefined);
        onChange(file);
      }
    },
    [validateFile, onChange],
  );

  const handleDragOver = React.useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) {
        setIsDragging(true);
      }
    },
    [disabled],
  );

  const handleDragLeave = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = React.useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled) return;

      const file = e.dataTransfer.files?.[0];
      if (file) {
        handleFile(file);
      }
    },
    [disabled, handleFile],
  );

  const handleInputChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
      // Reset input so the same file can be re-selected
      e.target.value = '';
    },
    [handleFile],
  );

  const handleClear = React.useCallback(() => {
    setInternalError(undefined);
    onChange(null);
  }, [onChange]);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
        e.preventDefault();
        inputRef.current?.click();
      }
    },
    [disabled],
  );

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className={cn('space-y-1.5', className)} {...props}>
      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleInputChange}
        disabled={disabled}
        className="sr-only"
        aria-label={label}
        id="file-upload-input"
      />

      {/* Drop zone */}
      {!value ? (
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-label={`${label}. Drag and drop a PDF file here or click to browse.`}
          aria-invalid={!!displayError}
          aria-describedby={displayError ? 'file-upload-error' : undefined}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && inputRef.current?.click()}
          onKeyDown={handleKeyDown}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50',
            disabled && 'pointer-events-none opacity-50',
            displayError && 'border-destructive',
          )}
        >
          <UploadCloudIcon
            className={cn(
              'mb-3 h-10 w-10',
              isDragging ? 'text-primary' : 'text-muted-foreground',
            )}
            aria-hidden="true"
          />
          <p className="mb-1 text-sm font-medium text-foreground">
            {isDragging ? 'Drop your PDF here' : 'Drag & drop your PDF here'}
          </p>
          <p className="text-xs text-muted-foreground">
            or click to browse (max 10MB)
          </p>
        </div>
      ) : (
        /* Selected file display */
        <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-4">
          <FileIcon className="h-8 w-8 text-primary" aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {value.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(value.size)}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleClear}
            aria-label="Remove selected file"
            disabled={disabled}
          >
            <XIcon className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Error message */}
      {displayError && (
        <p
          id="file-upload-error"
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
