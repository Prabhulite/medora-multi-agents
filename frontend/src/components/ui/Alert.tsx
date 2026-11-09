import type { ReactNode } from 'react';
import './Alert.css';

interface AlertProps {
  tone?: 'error' | 'success' | 'info' | 'warning';
  children: ReactNode;
}

export function Alert({ tone = 'info', children }: AlertProps) {
  return <div className={`ui-alert ui-alert--${tone}`}>{children}</div>;
}
