import type { ReactNode } from 'react';
import './Badge.css';

interface BadgeProps {
  tone?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  icon?: ReactNode;
  children: ReactNode;
}

export function Badge({ tone = 'neutral', icon, children }: BadgeProps) {
  return (
    <span className={`ui-badge ui-badge--${tone}`}>
      {icon ? <span className="ui-badge__icon">{icon}</span> : null}
      {children}
    </span>
  );
}
