import type { Appointment } from '../../types';

function datesBetween(start: string, end: string) {
  const days: string[] = [];
  const cursor = new Date(`${start}T12:00:00`);
  const last = new Date(`${end}T12:00:00`);
  while (cursor <= last && days.length < 31) {
    days.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`);
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

export function AppointmentCalendar({ rows, fromDate, toDate, onOpen, canOpenPatient }: { rows: Appointment[]; fromDate: string; toDate: string; onOpen: (id: number) => void; canOpenPatient: boolean }) {
  const days = datesBetween(fromDate, toDate);
  if (days.length === 31 && toDate > days[30]) return <p className="appointment-calendar__hint">Select a date range of up to 31 days for the calendar.</p>;
  return <section className="appointment-calendar" aria-label="Appointment calendar">
    {days.map((date) => <div className="appointment-calendar__day" key={date}>
      <h2>{new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}</h2>
      {rows.filter((row) => row.appointmentDate === date).sort((a, b) => (a.appointmentTime || '').localeCompare(b.appointmentTime || '')).map((row) => <button type="button" key={row.id} className="appointment-calendar__item" disabled={!canOpenPatient} title={canOpenPatient ? 'Open patient chart' : 'Patient chart access required'} onClick={() => onOpen(row.patientId)}>
        <strong>{row.appointmentTime?.slice(0, 5) || 'Time pending'} · {row.patientName || row.patientMrdNumber}</strong>
        <span>{row.doctorName || 'Doctor pending'} · {row.status.replaceAll('_', ' ')}</span>
      </button>)}
      {!rows.some((row) => row.appointmentDate === date) ? <p>No appointments</p> : null}
    </div>)}
  </section>;
}
