import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FileUpload } from './file-upload';

describe('FileUpload', () => {
  it('renders drag-and-drop zone', () => {
    render(<FileUpload onChange={vi.fn()} />);
    expect(screen.getByText(/Drag & drop your PDF here/)).toBeInTheDocument();
  });

  it('validates PDF MIME type', () => {
    const onChange = vi.fn();
    render(<FileUpload onChange={onChange} />);
    
    const input = document.getElementById('file-upload-input') as HTMLInputElement;
    const invalidFile = new File(['content'], 'test.txt', { type: 'text/plain' });
    
    fireEvent.change(input, { target: { files: [invalidFile] } });
    expect(screen.getByText('Only PDF files are accepted')).toBeInTheDocument();
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('validates file size (max 10MB)', () => {
    const onChange = vi.fn();
    render(<FileUpload onChange={onChange} />);
    
    const input = document.getElementById('file-upload-input') as HTMLInputElement;
    // Create a file that exceeds 10MB
    const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.pdf', { type: 'application/pdf' });
    Object.defineProperty(largeFile, 'size', { value: 11 * 1024 * 1024 });
    
    fireEvent.change(input, { target: { files: [largeFile] } });
    expect(screen.getByText('File size must not exceed 10MB')).toBeInTheDocument();
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('accepts valid PDF file under 10MB', () => {
    const onChange = vi.fn();
    render(<FileUpload onChange={onChange} />);
    
    const input = document.getElementById('file-upload-input') as HTMLInputElement;
    const validFile = new File(['pdf content'], 'resume.pdf', { type: 'application/pdf' });
    
    fireEvent.change(input, { target: { files: [validFile] } });
    expect(onChange).toHaveBeenCalledWith(validFile);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows selected file info', () => {
    const file = new File(['content'], 'resume.pdf', { type: 'application/pdf' });
    render(<FileUpload value={file} onChange={vi.fn()} />);
    expect(screen.getByText('resume.pdf')).toBeInTheDocument();
  });

  it('clears file when remove button is clicked', () => {
    const onChange = vi.fn();
    const file = new File(['content'], 'resume.pdf', { type: 'application/pdf' });
    render(<FileUpload value={file} onChange={onChange} />);
    
    fireEvent.click(screen.getByLabelText('Remove selected file'));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('shows external error', () => {
    render(<FileUpload onChange={vi.fn()} error="Upload failed" />);
    expect(screen.getByText('Upload failed')).toBeInTheDocument();
  });

  it('has accessible drop zone with proper aria attributes', () => {
    render(<FileUpload onChange={vi.fn()} />);
    const dropZone = screen.getByRole('button');
    expect(dropZone).toHaveAttribute('aria-label', expect.stringContaining('Drag and drop a PDF'));
  });

  it('supports drag and drop interaction', () => {
    const onChange = vi.fn();
    render(<FileUpload onChange={onChange} />);
    
    const dropZone = screen.getByRole('button');
    const validFile = new File(['pdf'], 'doc.pdf', { type: 'application/pdf' });
    
    fireEvent.dragOver(dropZone, { dataTransfer: { files: [validFile] } });
    expect(screen.getByText('Drop your PDF here')).toBeInTheDocument();
    
    fireEvent.drop(dropZone, { dataTransfer: { files: [validFile] } });
    expect(onChange).toHaveBeenCalledWith(validFile);
  });
});
