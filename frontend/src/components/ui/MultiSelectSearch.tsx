import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './Input.css';
import './MultiSelectSearch.css';

export interface MultiSelectOption {
  value: number | string;
  label: string;
  subLabel?: string;
}

interface MultiSelectSearchProps {
  label: string;
  options: MultiSelectOption[];
  values: Array<number | string>;
  onChange: (values: Array<number | string>) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  requiredMark?: boolean;
  error?: string;
  fieldKey?: string;
}

interface DropdownPosition {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
  maxHeight: number;
  placement: 'above' | 'below';
}

export function MultiSelectSearch({
  label,
  options,
  values,
  onChange,
  placeholder = 'Select roles... (multi-select)',
  searchPlaceholder = 'Search...',
  disabled = false,
  requiredMark = false,
  error,
  fieldKey = 'roles',
}: MultiSelectSearchProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const controlRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [position, setPosition] = useState<DropdownPosition | null>(null);

  const selectedSet = useMemo(() => new Set(values.map(String)), [values]);

  const selectedOptions = useMemo(
    () => options.filter((option) => selectedSet.has(String(option.value))),
    [options, selectedSet],
  );

  const filteredOptions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return options;
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(normalized) ||
        (option.subLabel || '').toLowerCase().includes(normalized),
    );
  }, [options, query]);

  const displayValue = useMemo(() => {
    if (!selectedOptions.length) return '';
    if (selectedOptions.length <= 2) {
      return selectedOptions.map((option) => option.label).join(', ');
    }
    return `${selectedOptions[0].label}, ${selectedOptions[1].label} +${selectedOptions.length - 2}`;
  }, [selectedOptions]);

  const updatePosition = () => {
    const control = controlRef.current;
    if (!control) return;

    const rect = control.getBoundingClientRect();
    // Keep menu flush to the control so it reads as one select field
    const overlap = 1;
    const padding = 8;
    const preferred = 240;
    const spaceBelow = window.innerHeight - rect.bottom - padding;
    const spaceAbove = rect.top - padding;
    const placeAbove = spaceBelow < 100 && spaceAbove > spaceBelow;

    if (placeAbove) {
      setPosition({
        bottom: window.innerHeight - rect.top - overlap,
        left: rect.left,
        width: rect.width,
        maxHeight: Math.min(preferred, Math.max(120, spaceAbove)),
        placement: 'above',
      });
      return;
    }

    setPosition({
      top: rect.bottom - overlap,
      left: rect.left,
      width: rect.width,
      maxHeight: Math.min(preferred, Math.max(120, spaceBelow)),
      placement: 'below',
    });
  };

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }
    updatePosition();
    const timer = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open, filteredOptions.length]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || dropdownRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
      setQuery('');
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        setQuery('');
      }
    };

    const onReposition = () => updatePosition();

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);

    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [open, filteredOptions.length]);

  const toggleValue = (value: number | string) => {
    const key = String(value);
    if (selectedSet.has(key)) {
      onChange(values.filter((item) => String(item) !== key));
      return;
    }
    onChange([...values, value]);
  };

  return (
    <div
      className={`ui-field ui-ms ${error ? 'ui-field--error' : ''} ${disabled ? 'is-disabled' : ''} ${open ? 'is-open' : ''} ${open && position ? `is-open-${position.placement}` : ''}`}
      ref={rootRef}
    >
      <span className="ui-field__label">
        {label}
        {requiredMark ? ' *' : ''}
      </span>

      <button
        ref={controlRef}
        type="button"
        className="ui-field__input ui-ms__control"
        data-field={fieldKey}
        onClick={() => {
          if (disabled) return;
          setOpen((prev) => !prev);
        }}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-invalid={Boolean(error)}
      >
        <span className={displayValue ? 'ui-ms__value' : 'ui-ms__placeholder'}>
          {displayValue || placeholder}
        </span>
        <svg className="ui-ms__caret" viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">
          <polyline
            points="6 9 12 15 18 9"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {error ? <span className="ui-field__error">{error}</span> : null}

      {open
        ? createPortal(
            <div
              ref={dropdownRef}
              className={`ui-ms__dropdown is-${position?.placement || 'below'}`}
              role="listbox"
              aria-multiselectable="true"
              style={
                position
                  ? {
                      top: position.top != null ? `${position.top}px` : 'auto',
                      bottom: position.bottom != null ? `${position.bottom}px` : 'auto',
                      left: `${position.left}px`,
                      width: `${position.width}px`,
                      maxHeight: `${position.maxHeight}px`,
                    }
                  : { visibility: 'hidden', top: 0, left: 0, width: 0 }
              }
            >
              <div className="ui-ms__search">
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={searchPlaceholder}
                  aria-label={searchPlaceholder}
                />
              </div>

              <div className="ui-ms__options">
                {filteredOptions.map((option) => {
                  const checked = selectedSet.has(String(option.value));
                  return (
                    <label
                      key={String(option.value)}
                      className={`ui-ms__option ${checked ? 'is-selected' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleValue(option.value)}
                      />
                      <span className="ui-ms__option-label">{option.label}</span>
                    </label>
                  );
                })}
                {!filteredOptions.length ? (
                  <div className="ui-ms__empty">No options found</div>
                ) : null}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
