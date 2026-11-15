import { Image } from 'antd';
import type { CSSProperties, ReactNode } from 'react';
import './PatientAvatar.css';

function UserIcon({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 12a4.5 4.5 0 1 0-4.5-4.5A4.5 4.5 0 0 0 12 12zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5z"
      />
    </svg>
  );
}

interface PatientAvatarProps {
  photo?: string | null;
  name?: string;
  size?: number;
  className?: string;
  fallbackClassName?: string;
  fallback?: ReactNode;
  style?: CSSProperties;
  previewMask?: string;
}

/**
 * Patient photo thumbnail with Ant Design Image preview (same pattern as HIS).
 */
export function PatientAvatar({
  photo,
  name = 'Patient',
  size = 34,
  className = '',
  fallbackClassName = '',
  fallback = null,
  style,
  previewMask = 'Click to zoom',
}: PatientAvatarProps) {
  const src = typeof photo === 'string' ? photo.trim() : '';

  if (!src) {
    if (fallback != null) return <>{fallback}</>;
    return (
      <span
        className={`patients-avatar patients-avatar--fallback ${fallbackClassName} ${className}`.trim()}
        style={{ width: size, height: size, ...style }}
        aria-hidden={!name}
        title={name || undefined}
      >
        <UserIcon size={Math.max(14, Math.round(size * 0.45))} />
      </span>
    );
  }

  return (
    <span
      className="patient-avatar-wrap"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
      role="presentation"
    >
      <Image
        src={src}
        alt={name || 'Patient'}
        width={size}
        height={size}
        className={`patients-avatar patient-avatar-img ${className}`.trim()}
        rootClassName="patient-avatar-root"
        style={{
          objectFit: 'cover',
          borderRadius: '50%',
          ...style,
        }}
        preview={{
          mask: previewMask,
          maskClassName: 'patient-avatar-mask',
        }}
      />
    </span>
  );
}
