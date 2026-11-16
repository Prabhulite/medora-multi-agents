# Shared UI Components

Framework: React 19 + TypeScript. Component library: custom components with Ant Design dependency. CSS: vanilla CSS files and CSS variables.

## `frontend/src/components/ui/Button.tsx`
Custom button with `variant`, `size`, loading and disabled states.
```tsx
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import './Button.css';
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export function Button({ children, variant='primary', size='md', loading=false, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode; variant?: ButtonVariant; size?: 'sm'|'md'; loading?: boolean }) { return <button className={`ui-button ui-button--${variant} ui-button--${size}`} disabled={loading || props.disabled} {...props}>{loading ? 'Loading…' : children}</button>; }
```

## `frontend/src/components/ui/Table.tsx`
Reusable searchable data table with refresh affordance, loading state and configurable columns.

## `frontend/src/components/ui/PageHeader.tsx`
Page title, supporting subtitle and right-aligned page actions.

## `frontend/src/components/ui/Badge.tsx`
Status badge with success, danger, warning and info tones.

## `frontend/src/components/ui/Modal.tsx`
Modal dialog with title, size, close action and footer slot.

## `frontend/src/components/ui/ActionMenu.tsx`
Compact row action menu supporting edit, view, delete and danger actions.

## `frontend/src/components/ui/Alert.tsx`
Inline tone-based error/success/warning/info feedback.

## `frontend/src/components/ui/statusIcons.tsx`
Inline SVG icon components for active, inactive, edit, delete, view and alert states.
