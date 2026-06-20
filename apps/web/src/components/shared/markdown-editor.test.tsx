import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MarkdownEditor } from './markdown-editor';

describe('MarkdownEditor', () => {
  it('renders in write mode by default', () => {
    render(<MarkdownEditor value="" onChange={vi.fn()} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('renders label', () => {
    render(<MarkdownEditor label="Job Description" value="" onChange={vi.fn()} />);
    expect(screen.getByText('Job Description')).toBeInTheDocument();
  });

  it('calls onChange when text is entered', () => {
    const onChange = vi.fn();
    render(<MarkdownEditor value="" onChange={onChange} />);
    
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: '# Hello' } });
    expect(onChange).toHaveBeenCalledWith('# Hello');
  });

  it('toggles to preview mode', () => {
    render(<MarkdownEditor value="**bold text**" onChange={vi.fn()} />);
    
    const previewTab = screen.getByRole('tab', { name: /Preview/i });
    fireEvent.click(previewTab);
    
    // Textarea should not be visible in preview mode
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    // Bold text should be rendered
    expect(screen.getByText('bold text')).toBeInTheDocument();
  });

  it('shows character count when maxLength provided', () => {
    render(<MarkdownEditor value="Hello" onChange={vi.fn()} maxLength={5000} />);
    expect(screen.getByText('5/5000')).toBeInTheDocument();
  });

  it('shows error message', () => {
    render(<MarkdownEditor value="" onChange={vi.fn()} error="Description is required" />);
    expect(screen.getByText('Description is required')).toBeInTheDocument();
  });

  it('has proper ARIA tab roles', () => {
    render(<MarkdownEditor value="" onChange={vi.fn()} />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(2);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[1]).toHaveAttribute('aria-selected', 'false');
  });

  it('shows empty preview message when content is empty', () => {
    render(<MarkdownEditor value="" onChange={vi.fn()} />);
    
    fireEvent.click(screen.getByRole('tab', { name: /Preview/i }));
    expect(screen.getByText('Nothing to preview')).toBeInTheDocument();
  });

  it('renders markdown headings in preview', () => {
    render(<MarkdownEditor value="# Heading 1" onChange={vi.fn()} />);
    
    fireEvent.click(screen.getByRole('tab', { name: /Preview/i }));
    const heading = screen.getByText('Heading 1');
    expect(heading.tagName).toBe('H1');
  });
});
