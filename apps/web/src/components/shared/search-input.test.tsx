import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SearchInput } from './search-input';

describe('SearchInput', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders search input with placeholder', () => {
    render(<SearchInput onSearch={vi.fn()} placeholder="Search candidates..." />);
    expect(screen.getByRole('searchbox')).toHaveAttribute('placeholder', 'Search candidates...');
  });

  it('debounces search by 300ms', () => {
    const onSearch = vi.fn();
    render(<SearchInput onSearch={onSearch} />);

    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'John' } });

    // Not called immediately
    expect(onSearch).not.toHaveBeenCalledWith('John');

    // Called after 300ms
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(onSearch).toHaveBeenCalledWith('John');
  });

  it('shows clear button when value is non-empty', () => {
    render(<SearchInput onSearch={vi.fn()} value="test" onChange={vi.fn()} />);
    expect(screen.getByLabelText('Clear search')).toBeInTheDocument();
  });

  it('does not show clear button when empty', () => {
    render(<SearchInput onSearch={vi.fn()} />);
    expect(screen.queryByLabelText('Clear search')).not.toBeInTheDocument();
  });

  it('clears value when clear button is clicked', () => {
    const onChange = vi.fn();
    render(<SearchInput onSearch={vi.fn()} value="test" onChange={onChange} />);

    fireEvent.click(screen.getByLabelText('Clear search'));
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('has accessible aria-label', () => {
    render(<SearchInput onSearch={vi.fn()} placeholder="Search..." />);
    expect(screen.getByRole('searchbox')).toHaveAttribute('aria-label', 'Search...');
  });

  it('supports custom debounce delay', () => {
    const onSearch = vi.fn();
    render(<SearchInput onSearch={onSearch} debounceMs={500} />);

    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'test' } });

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(onSearch).not.toHaveBeenCalledWith('test');

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(onSearch).toHaveBeenCalledWith('test');
  });
});
