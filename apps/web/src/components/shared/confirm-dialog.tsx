'use client';

import * as React from 'react';
import { AlertTriangleIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export interface ConfirmDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback to close the dialog */
  onOpenChange: (open: boolean) => void;
  /** Dialog title */
  title: string;
  /** Description explaining the action */
  description: string;
  /** Label for the confirm button */
  confirmLabel?: string;
  /** Label for the cancel button */
  cancelLabel?: string;
  /** Whether the action is destructive (changes button styling) */
  destructive?: boolean;
  /** Callback when the user confirms the action */
  onConfirm: () => void;
  /** Whether the confirm action is in progress */
  loading?: boolean;
}

/**
 * ConfirmDialog presents a modal asking the user to confirm a destructive action.
 *
 * Accessibility:
 * - Focus moves to the dialog within 100ms of opening (handled by Radix Dialog)
 * - Focus is trapped within the dialog (no keyboard traps)
 * - Escape key closes the dialog
 * - Focus returns to the trigger element on close
 * - Proper ARIA labeling via DialogTitle and DialogDescription
 * - Loading state announced via aria-busy
 *
 * Requirements: 15.2, 15.8
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = true,
  onConfirm,
  loading = false,
}: ConfirmDialogProps) {
  const cancelRef = React.useRef<HTMLButtonElement>(null);

  const handleConfirm = React.useCallback(() => {
    onConfirm();
  }, [onConfirm]);

  // Move focus to the cancel button when dialog opens (safer default for destructive actions)
  React.useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        cancelRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        role="alertdialog"
      >
        <DialogHeader>
          <div className="flex items-center gap-3">
            {destructive && (
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10"
                aria-hidden="true"
              >
                <AlertTriangleIcon className="h-5 w-5 text-destructive" />
              </div>
            )}
            <div>
              <DialogTitle id="confirm-dialog-title">{title}</DialogTitle>
              <DialogDescription id="confirm-dialog-description">{description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <DialogFooter>
          <Button
            ref={cancelRef}
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? 'Processing...' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
