import { useEffect, useState, type KeyboardEvent } from 'react';
import { patientsApi } from '../../features/patients/patients.api';
import type { Patient } from '../../types';
import './PatientSearchField.css';

interface PatientSearchFieldProps {
  required?: boolean;
  label?: string;
  placeholder?: string;
  value?: string;
  onQueryChange?: (query: string) => void;
  onSelect: (patient: Patient) => void;
  className?: string;
  autoFocus?: boolean;
}

export function PatientSearchField({
  required = true,
  label = 'ID',
  placeholder = 'Search MRD, name, mobile',
  value,
  onQueryChange,
  onSelect,
  className = '',
  autoFocus = false,
}: PatientSearchFieldProps) {
  const [query, setQuery] = useState(value || '');
  const [results, setResults] = useState<Patient[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (value !== undefined) setQuery(value);
  }, [value]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    let active = true;
    const timer = window.setTimeout(() => {
      setSearching(true);
      patientsApi
        .search({ q: trimmed })
        .then((rows) => {
          if (!active) return;
          setResults(rows.slice(0, 12));
          setOpen(true);
          setActiveIndex(0);
        })
        .catch(() => {
          if (!active) return;
          setResults([]);
          setOpen(false);
        })
        .finally(() => {
          if (active) setSearching(false);
        });
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query]);

  const selectPatient = (patient: Patient) => {
    setQuery(patient.mrdNumber);
    onQueryChange?.(patient.mrdNumber);
    setOpen(false);
    setResults([]);
    onSelect(patient);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!open || !results.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, results.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const row = results[activeIndex];
      if (row) selectPatient(row);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <label className={`patient-search-field ${className}`.trim()}>
      <span className="patient-search-field__label">
        {label}
        {required ? <span className="patient-search-field__required">*</span> : null}
      </span>
      <span className="patient-search-field__control">
        <input
          type="search"
          value={query}
          autoFocus={autoFocus}
          autoComplete="off"
          placeholder={placeholder}
          aria-label={placeholder}
          onChange={(event) => {
            const next = event.target.value;
            setQuery(next);
            onQueryChange?.(next);
          }}
          onKeyDown={onKeyDown}
          onFocus={() => {
            if (results.length) setOpen(true);
          }}
          onBlur={() => {
            window.setTimeout(() => setOpen(false), 120);
          }}
        />
        {searching ? <span className="patient-search-field__hint">Searching…</span> : null}
        {open && results.length ? (
          <div className="patient-search-field__results" role="listbox">
            {results.map((row, index) => (
              <button
                key={row.id}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                className={`patient-search-field__result ${index === activeIndex ? 'is-active' : ''}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectPatient(row)}
              >
                <strong>{row.fullName}</strong>
                <span>
                  {row.mrdNumber}
                  {row.mobileNumber ? ` · ${row.mobileNumber}` : ''}
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </span>
    </label>
  );
}
