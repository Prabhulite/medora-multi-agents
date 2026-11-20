import { useEffect, useRef, useState } from 'react';
import './DatePicker.css';

type Props = { label: string; value: string; onChange: (value: string) => void; error?: string; fieldKey?: string; max?: string };
const monthNames = Array.from({ length: 12 }, (_, month) => new Date(2020, month, 1).toLocaleString('en', { month: 'long' }));
const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const iso = (year: number, month: number, day: number) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

export function DatePicker({ label, value, onChange, error, fieldKey, max }: Props) {
  const today = new Date();
  const selected = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : null;
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(selected?.getFullYear() ?? today.getFullYear());
  const [month, setMonth] = useState(selected?.getMonth() ?? today.getMonth());
  const container = useRef<HTMLDivElement>(null);
  const inputId = fieldKey || label.toLowerCase().replace(/\W+/g, '-');
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!container.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [open]);
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const changeMonth = (delta: number) => {
    const date = new Date(year, month + delta, 1);
    setYear(date.getFullYear());
    setMonth(date.getMonth());
  };
  return <div className={`ui-field medora-date-picker ${error ? 'ui-field--error' : ''}`} ref={container}>
    <label className="ui-field__label" htmlFor={inputId}>{label}</label>
    <button id={inputId} type="button" className="medora-date-picker__trigger" data-field={fieldKey} aria-expanded={open} aria-haspopup="dialog" aria-invalid={Boolean(error)} onClick={() => { if (!open && selected) { setYear(selected.getFullYear()); setMonth(selected.getMonth()); } setOpen(!open); }}>
      <span className={value ? '' : 'medora-date-picker__placeholder'}>{selected && !Number.isNaN(selected.getTime()) ? selected.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Select date'}</span>
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/></svg>
    </button>
    {error && <span className="ui-field__error">{error}</span>}
    {open && <div className="medora-date-picker__panel" role="dialog" aria-label={`${label} calendar`}>
      <div className="medora-date-picker__header">
        <button type="button" aria-label="Previous month" onClick={() => changeMonth(-1)}>‹</button>
        <div className="medora-date-picker__selectors"><select aria-label="Month" value={month} onChange={(event) => setMonth(Number(event.target.value))}>{monthNames.map((name, index) => <option key={name} value={index}>{name}</option>)}</select><select aria-label="Year" value={year} onChange={(event) => setYear(Number(event.target.value))}>{Array.from({ length: 151 }, (_, index) => today.getFullYear() - index).map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
        <button type="button" aria-label="Next month" onClick={() => changeMonth(1)} disabled={Boolean(max && iso(year, month + 1, 1) > max)}>›</button>
      </div>
      <div className="medora-date-picker__grid">{weekdays.map((day) => <span className="medora-date-picker__weekday" key={day}>{day}</span>)}{Array.from({ length: firstWeekday }, (_, index) => <span key={`blank-${index}`} />)}{Array.from({ length: daysInMonth }, (_, index) => { const day = index + 1; const date = iso(year, month, day); return <button type="button" key={day} className={date === value ? 'is-selected' : ''} aria-label={new Date(year, month, day).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} aria-pressed={date === value} disabled={Boolean(max && date > max)} onClick={() => { onChange(date); setOpen(false); }}>{day}</button>; })}</div>
      <div className="medora-date-picker__footer"><button type="button" onClick={() => { onChange(''); setOpen(false); }}>Clear</button><button type="button" disabled={Boolean(max && iso(today.getFullYear(), today.getMonth(), today.getDate()) > max)} onClick={() => { onChange(iso(today.getFullYear(), today.getMonth(), today.getDate())); setOpen(false); }}>Today</button></div>
    </div>}
  </div>;
}
