import type { ReactNode } from 'react';
import { Button } from './Button';
import { Modal } from './Modal';

export interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** `danger` for destructive actions (logout, cancel, delete). */
  tone?: 'danger' | 'primary';
  confirming?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title = 'Confirm',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'primary',
  confirming = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      title={title}
      size="sm"
      squared
      onClose={onCancel}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={confirming}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === 'danger' ? 'danger' : 'primary'}
            size="sm"
            onClick={onConfirm}
            disabled={confirming}
          >
            {confirming ? 'Please wait…' : confirmLabel}
          </Button>
        </>
      }
    >
      {typeof message === 'string' ? <p className="ui-confirm-dialog__message">{message}</p> : message}
    </Modal>
  );
}
