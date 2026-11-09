import type { InputHTMLAttributes } from 'react';
import './Input.css';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function Input({ label, error, id, className = '', ...props }: InputProps) {
  const inputId = id || props.name || label.toLowerCase().replace(/\s+/g, '-');

  return (
    <label className={`ui-field ${error ? 'ui-field--error' : ''} ${className}`} htmlFor={inputId}>
      <span className="ui-field__label">{label}</span>
      <input id={inputId} className="ui-field__input" {...props} />
      {error ? <span className="ui-field__error">{error}</span> : null}
    </label>
  );
}
