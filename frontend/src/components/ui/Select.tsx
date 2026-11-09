import type { SelectHTMLAttributes } from 'react';
import './Input.css';

interface Option {
  label: string;
  value: string | number;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: Option[];
  error?: string;
}

export function Select({ label, options, error, id, className = '', ...props }: SelectProps) {
  const selectId = id || props.name || label.toLowerCase().replace(/\s+/g, '-');

  return (
    <label className={`ui-field ${error ? 'ui-field--error' : ''} ${className}`} htmlFor={selectId}>
      <span className="ui-field__label">{label}</span>
      <select id={selectId} className="ui-field__input" {...props}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? <span className="ui-field__error">{error}</span> : null}
    </label>
  );
}
