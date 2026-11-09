import type { ReactNode } from 'react';
import './Modal.css';

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md';
  squared?: boolean;
}

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  size = 'md',
  squared = false,
}: ModalProps) {
  if (!open) return null;

  const className = [
    'ui-modal',
    size === 'sm' ? 'ui-modal--sm' : '',
    squared ? 'ui-modal--squared' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="ui-modal__backdrop" role="presentation" onClick={onClose}>
      <div
        className={className}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="ui-modal__header">
          <h3>{title}</h3>
          <button type="button" className="ui-modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="ui-modal__body">{children}</div>
        {footer ? <div className="ui-modal__footer">{footer}</div> : null}
      </div>
    </div>
  );
}
