import { useState, type InputHTMLAttributes } from 'react';
import './Input.css';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  passwordToggle?: boolean;
}

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12 5c-5 0-9.27 3.11-11 7 1.73 3.89 6 7 11 7s9.27-3.11 11-7c-1.73-3.89-6-7-11-7zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-8a3 3 0 1 0 .001 6.001A3 3 0 0 0 12 9z"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        fill="currentColor"
        d="M3.16 3.88 1.74 5.3l3.1 3.1C3.2 9.7 1.9 11.2 1 12c1.73 3.89 6 7 11 7 1.7 0 3.3-.35 4.75-.97l3.95 3.95 1.41-1.41L3.16 3.88zM12 17c-3.8 0-7.1-2.2-8.7-5 .7-1.3 1.8-2.5 3.2-3.4l1.6 1.6A4.98 4.98 0 0 0 7 12a5 5 0 0 0 7.8 4.15l1.55 1.55c-1.35.8-2.9 1.3-4.35 1.3zm9.7-5c-.45-.95-1.1-1.85-1.85-2.65l-1.45 1.45c.4.55.7 1.15.9 1.8-1.1 2.1-3.2 3.7-5.7 4.25l-1.7-1.7c.3.05.6.1.9.1a5 5 0 0 0 4.55-7.05l-2.2-2.2C15.3 6.35 13.7 6 12 6c-.55 0-1.1.05-1.6.15L8.55 4.3C9.65 4.1 10.8 4 12 4c5 0 9.27 3.11 11 7-.35.8-.8 1.55-1.3 2z"
      />
    </svg>
  );
}

export function Input({
  label,
  error,
  id,
  className = '',
  passwordToggle = false,
  type = 'text',
  ...props
}: InputProps) {
  const [visible, setVisible] = useState(false);
  const inputId = id || props.name || label.toLowerCase().replace(/\s+/g, '-');
  const isPassword = type === 'password' || passwordToggle;
  const inputType = isPassword && passwordToggle ? (visible ? 'text' : 'password') : type;

  return (
    <label className={`ui-field ${error ? 'ui-field--error' : ''} ${className}`} htmlFor={inputId}>
      <span className="ui-field__label">{label}</span>
      <span className={`ui-field__control ${passwordToggle ? 'ui-field__control--toggle' : ''}`}>
        <input id={inputId} className="ui-field__input" type={inputType} {...props} />
        {passwordToggle ? (
          <button
            type="button"
            className="ui-field__toggle"
            onClick={() => setVisible((prev) => !prev)}
            aria-label={visible ? 'Hide password' : 'Show password'}
            tabIndex={0}
          >
            <EyeIcon open={visible} />
          </button>
        ) : null}
      </span>
      {error ? <span className="ui-field__error">{error}</span> : null}
    </label>
  );
}
