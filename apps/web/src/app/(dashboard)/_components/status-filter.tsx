/**
 * StatusFilter — Multi-select filter for CandidateStatus values.
 *
 * Allows users to select one or more statuses to filter the candidate pipeline.
 * Uses a dropdown with checkboxes for each status value.
 * Supports keyboard navigation: Arrow keys to move, Space/Enter to toggle, Escape to close.
 *
 * Validates: Requirements 2.2, 15.1, 15.2
 */

'use client';

import * as React from 'react';
import { FilterIcon, CheckIcon, XIcon } from 'lucide-react';
import { CandidateStatus } from '@rove-hire/shared';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_OPTIONS: { value: CandidateStatus; label: string }[] = [
  { value: CandidateStatus.Applied, label: 'Applied' },
  { value: CandidateStatus.FormSubmitted, label: 'Form Submitted' },
  { value: CandidateStatus.InterviewScheduled, label: 'Interview Scheduled' },
  { value: CandidateStatus.OfferSent, label: 'Offer Sent' },
  { value: CandidateStatus.Hired, label: 'Hired' },
  { value: CandidateStatus.Rejected, label: 'Rejected' },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface StatusFilterProps {
  selectedStatuses: CandidateStatus[];
  onChange: (statuses: CandidateStatus[]) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StatusFilter({ selectedStatuses, onChange }: StatusFilterProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [focusedIndex, setFocusedIndex] = React.useState(-1);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const optionRefs = React.useRef<(HTMLButtonElement | null)[]>([]);

  // Close dropdown on outside click
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus first option when dropdown opens
  React.useEffect(() => {
    if (isOpen) {
      setFocusedIndex(0);
      const timer = setTimeout(() => {
        optionRefs.current[0]?.focus();
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setFocusedIndex(-1);
    }
  }, [isOpen]);

  const toggleStatus = React.useCallback(
    (status: CandidateStatus) => {
      const isSelected = selectedStatuses.includes(status);
      if (isSelected) {
        onChange(selectedStatuses.filter((s) => s !== status));
      } else {
        onChange([...selectedStatuses, status]);
      }
    },
    [selectedStatuses, onChange],
  );

  const clearAll = React.useCallback(() => {
    onChange([]);
  }, [onChange]);

  // Keyboard navigation within the dropdown (Requirements: 15.2)
  const handleDropdownKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          triggerRef.current?.focus();
          break;
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex((prev) => {
            const next = prev < STATUS_OPTIONS.length - 1 ? prev + 1 : 0;
            optionRefs.current[next]?.focus();
            return next;
          });
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex((prev) => {
            const next = prev > 0 ? prev - 1 : STATUS_OPTIONS.length - 1;
            optionRefs.current[next]?.focus();
            return next;
          });
          break;
        case 'Home':
          e.preventDefault();
          setFocusedIndex(0);
          optionRefs.current[0]?.focus();
          break;
        case 'End':
          e.preventDefault();
          setFocusedIndex(STATUS_OPTIONS.length - 1);
          optionRefs.current[STATUS_OPTIONS.length - 1]?.focus();
          break;
        case 'Tab':
          // Allow Tab to close dropdown and move focus naturally
          setIsOpen(false);
          break;
      }
    },
    [],
  );

  // Trigger key handling
  const handleTriggerKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
    },
    [],
  );

  const activeCount = selectedStatuses.length;

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger Button */}
      <Button
        ref={triggerRef}
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleTriggerKeyDown}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={`Filter by status${activeCount > 0 ? `, ${activeCount} selected` : ''}`}
        className={cn(
          'h-11 gap-1.5 min-w-[44px]',
          activeCount > 0 && 'border-primary/50 bg-primary/5',
        )}
      >
        <FilterIcon className="h-4 w-4" aria-hidden="true" />
        <span>Status</span>
        {activeCount > 0 && (
          <span
            className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground"
            aria-hidden="true"
          >
            {activeCount}
          </span>
        )}
      </Button>

      {/* Clear button — min 44x44 touch target */}
      {activeCount > 0 && (
        <button
          type="button"
          onClick={clearAll}
          className="ml-1 inline-flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Clear status filter"
        >
          <XIcon className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div
          role="listbox"
          aria-multiselectable="true"
          aria-label="Status filter options"
          onKeyDown={handleDropdownKeyDown}
          className="absolute left-0 top-full z-50 mt-1 w-56 rounded-md border bg-popover p-1 shadow-md animate-in fade-in-0 zoom-in-95"
        >
          {STATUS_OPTIONS.map((option, index) => {
            const isSelected = selectedStatuses.includes(option.value);
            return (
              <button
                key={option.value}
                ref={(el) => { optionRefs.current[index] = el; }}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => toggleStatus(option.value)}
                tabIndex={focusedIndex === index ? 0 : -1}
                className={cn(
                  'flex w-full items-center gap-2 rounded-sm px-2 py-2 text-sm outline-none transition-colors min-h-[44px]',
                  'hover:bg-accent hover:text-accent-foreground',
                  'focus-visible:bg-accent focus-visible:text-accent-foreground',
                )}
              >
                <span
                  className={cn(
                    'flex h-4 w-4 items-center justify-center rounded-sm border',
                    isSelected
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-muted-foreground/30',
                  )}
                  aria-hidden="true"
                >
                  {isSelected && <CheckIcon className="h-3 w-3" />}
                </span>
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
