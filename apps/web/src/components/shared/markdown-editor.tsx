'use client';

import * as React from 'react';
import { EyeIcon, PencilIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export interface MarkdownEditorProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  /** Field label */
  label?: string;
  /** Controlled value */
  value: string;
  /** Change handler */
  onChange: (value: string) => void;
  /** Error message */
  error?: string;
  /** Max character length */
  maxLength?: number;
}

/**
 * MarkdownEditor provides a textarea for markdown content with a preview toggle.
 * Uses a simple markdown-to-HTML renderer for the preview mode.
 * Suitable for job description editing.
 */
export function MarkdownEditor({
  label = 'Description',
  value,
  onChange,
  error,
  maxLength,
  className,
  id,
  ...textareaProps
}: MarkdownEditorProps) {
  const [mode, setMode] = React.useState<'write' | 'preview'>('write');
  const fieldId = id || 'markdown-editor';
  const errorId = `${fieldId}-error`;

  const handleChange = React.useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
    },
    [onChange],
  );

  return (
    <div className={cn('space-y-1.5', className)}>
      {/* Header with label and toggle */}
      <div className="flex items-center justify-between">
        {label && (
          <Label htmlFor={fieldId} className="text-sm font-medium">
            {label}
          </Label>
        )}
        <div className="flex gap-1" role="tablist" aria-label="Editor mode">
          <Button
            type="button"
            variant={mode === 'write' ? 'secondary' : 'ghost'}
            size="xs"
            onClick={() => setMode('write')}
            role="tab"
            aria-selected={mode === 'write'}
            aria-controls={`${fieldId}-write-panel`}
          >
            <PencilIcon className="h-3 w-3" />
            Write
          </Button>
          <Button
            type="button"
            variant={mode === 'preview' ? 'secondary' : 'ghost'}
            size="xs"
            onClick={() => setMode('preview')}
            role="tab"
            aria-selected={mode === 'preview'}
            aria-controls={`${fieldId}-preview-panel`}
          >
            <EyeIcon className="h-3 w-3" />
            Preview
          </Button>
        </div>
      </div>

      {/* Write mode */}
      {mode === 'write' && (
        <div id={`${fieldId}-write-panel`} role="tabpanel">
          <textarea
            id={fieldId}
            value={value}
            onChange={handleChange}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : undefined}
            maxLength={maxLength}
            className={cn(
              'min-h-[200px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none',
              'placeholder:text-muted-foreground resize-y',
              'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
              'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
              error && 'border-destructive',
            )}
            {...textareaProps}
          />
          {maxLength && (
            <p className="mt-1 text-xs text-muted-foreground text-right">
              {value.length}/{maxLength}
            </p>
          )}
        </div>
      )}

      {/* Preview mode */}
      {mode === 'preview' && (
        <div
          id={`${fieldId}-preview-panel`}
          role="tabpanel"
          className="min-h-[200px] rounded-md border border-input bg-muted/30 px-3 py-2"
        >
          {value ? (
            <MarkdownPreview content={value} />
          ) : (
            <p className="text-sm text-muted-foreground italic">Nothing to preview</p>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <p id={errorId} className="text-xs text-destructive" role="alert" aria-live="assertive">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Simple markdown preview renderer.
 * Converts basic markdown syntax to HTML without external dependencies.
 * Handles: headings, bold, italic, links, lists, code blocks, paragraphs.
 */
function MarkdownPreview({ content }: { content: string }) {
  const html = React.useMemo(() => renderMarkdown(content), [content]);

  return (
    <div
      className="prose prose-sm dark:prose-invert max-w-none text-sm"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/**
 * Lightweight markdown-to-HTML converter for preview purposes.
 * Supports: headers, bold, italic, inline code, code blocks, links, lists.
 */
function renderMarkdown(md: string): string {
  let html = md
    // Escape HTML entities to prevent XSS
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code blocks (``` ... ```)
  html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="bg-muted px-1 rounded text-xs">$1</code>');

  // Headings
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold mt-4 mb-1">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold mt-4 mb-1">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold mt-4 mb-2">$1</h1>');

  // Bold and italic
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Links [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary underline" target="_blank" rel="noopener noreferrer">$1</a>');

  // Unordered lists
  html = html.replace(/^[-*] (.+)$/gm, '<li class="ml-4 list-disc">$1</li>');
  html = html.replace(/(<li.*<\/li>\n?)+/g, '<ul class="my-2">$&</ul>');

  // Ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>');

  // Paragraphs (double newline)
  html = html.replace(/\n\n/g, '</p><p class="my-2">');
  html = `<p class="my-2">${html}</p>`;

  // Single newlines to <br>
  html = html.replace(/\n/g, '<br/>');

  return html;
}
