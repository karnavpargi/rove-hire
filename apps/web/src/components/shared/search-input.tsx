'use client';

import * as React from 'react';
import { SearchIcon, XIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/use-debounce';

export interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  /** Callback with the debounced search value */
  onSearch: (value: string) => void;
  /** Debounce delay in milliseconds (default: 300ms) */
  debounceMs?: number;
  /** Controlled value */
  value?: string;
  /** Change handler for the raw (non-debounced) value */
  onChange?: (value: string) => void;
}

/**
 * SearchInput provides a debounced search field with a clear button.
 * - Debounces input by 300ms before calling onSearch
 * - Shows a clear button when the field has a value
 * - Accessible with proper ARIA attributes
 * - Min 44x44px touch target on clear button
 *
 * Requirements: 15.1, 15.5, 16.1
 */
export function SearchInput({
  onSearch,
  debounceMs = 300,
  value: controlledValue,
  onChange,
  placeholder = 'Search...',
  className,
  ...inputProps
}: SearchInputProps) {
  const [internalValue, setInternalValue] = React.useState('');
  const value = controlledValue !== undefined ? controlledValue : internalValue;
  const debouncedValue = useDebounce(value, debounceMs);
  const inputId = React.useId();

  // Emit debounced value to parent
  React.useEffect(() => {
    onSearch(debouncedValue);
  }, [debouncedValue, onSearch]);

  const handleChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      if (onChange) {
        onChange(newValue);
      } else {
        setInternalValue(newValue);
      }
    },
    [onChange],
  );

  const handleClear = React.useCallback(() => {
    if (onChange) {
      onChange('');
    } else {
      setInternalValue('');
    }
  }, [onChange]);

  return (
    <div className={cn('relative', className)}>
      {/* Accessible label for screen readers */}
      <label htmlFor={inputId} className="sr-only">
        {placeholder}
      </label>

      {/* Search icon */}
      <SearchIcon
        className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none"
        aria-hidden="true"
      />

      {/* Input field */}
      <input
        id={inputId}
        type="search"
        role="searchbox"
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        className={cn(
          'h-11 w-full rounded-md border border-input bg-transparent pl-9 pr-9 text-sm shadow-xs transition-[color,box-shadow] outline-none',
          'placeholder:text-muted-foreground',
          'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
          'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
        )}
        {...inputProps}
      />

      {/* Clear button — min 44x44px touch target */}
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-sm p-2 min-h-[44px] min-w-[44px] text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Clear search"
        >
          <XIcon className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
