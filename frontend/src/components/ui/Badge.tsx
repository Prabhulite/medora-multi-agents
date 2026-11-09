import type { ReactNode } from 'react';
import './Badge.css';

interface BadgeProps {
  tone?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  children: ReactNode;
}

export function Badge({ tone = 'neutral', children }: BadgeProps) {
  return <span className={`ui-badge ui-badge--${tone}`}>{children}</span>;
}
