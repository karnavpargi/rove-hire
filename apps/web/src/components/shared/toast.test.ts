import { describe, it, expect, vi, beforeEach } from 'vitest';
import { toast as sonnerToast } from 'sonner';

// Mock sonner
vi.mock('sonner', () => {
  let idCounter = 0;

  return {
    toast: {
      success: vi.fn((_msg: string, _opts?: Record<string, unknown>) => ++idCounter),
      error: vi.fn((_msg: string, _opts?: Record<string, unknown>) => ++idCounter),
      warning: vi.fn((_msg: string, _opts?: Record<string, unknown>) => ++idCounter),
      info: vi.fn((_msg: string, _opts?: Record<string, unknown>) => ++idCounter),
      dismiss: vi.fn(),
    },
  };
});

// We need to dynamically import showToast after the mock is set up
// and reload the module for each test to reset the internal activeToastIds
describe('showToast', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls sonner.success for success type', async () => {
    const { showToast } = await import('./toast');
    showToast({ message: 'Done', type: 'success' });
    expect(sonnerToast.success).toHaveBeenCalledWith('Done', expect.any(Object));
  });

  it('calls sonner.error for error type', async () => {
    const { showToast } = await import('./toast');
    showToast({ message: 'Failed', type: 'error' });
    expect(sonnerToast.error).toHaveBeenCalledWith('Failed', expect.any(Object));
  });

  it('calls sonner.warning for warning type', async () => {
    const { showToast } = await import('./toast');
    showToast({ message: 'Watch out', type: 'warning' });
    expect(sonnerToast.warning).toHaveBeenCalledWith('Watch out', expect.any(Object));
  });

  it('calls sonner.info by default', async () => {
    const { showToast } = await import('./toast');
    showToast({ message: 'Hello' });
    expect(sonnerToast.info).toHaveBeenCalledWith('Hello', expect.any(Object));
  });

  it('passes description to sonner', async () => {
    const { showToast } = await import('./toast');
    showToast({ message: 'Title', description: 'Details', type: 'info' });
    expect(sonnerToast.info).toHaveBeenCalledWith(
      'Title',
      expect.objectContaining({ description: 'Details' }),
    );
  });

  it('uses 5000ms default duration', async () => {
    const { showToast } = await import('./toast');
    showToast({ message: 'Test', type: 'info' });
    expect(sonnerToast.info).toHaveBeenCalledWith(
      'Test',
      expect.objectContaining({ duration: 5000 }),
    );
  });

  it('dismisses oldest toast when max 3 exceeded', async () => {
    const { showToast } = await import('./toast');
    // Show 3 toasts first to fill up the limit
    showToast({ message: 'First', type: 'info' });
    showToast({ message: 'Second', type: 'info' });
    showToast({ message: 'Third', type: 'info' });
    
    // Fourth toast should trigger dismissal of the oldest
    showToast({ message: 'Fourth', type: 'info' });
    expect(sonnerToast.dismiss).toHaveBeenCalled();
  });
});
