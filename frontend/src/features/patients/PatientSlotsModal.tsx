import { useEffect, useState } from 'react';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { getErrorMessage } from '../../lib/api';
import type { Appointment } from '../../types';
import { AppointmentFormPage } from '../appointments/AppointmentFormPage';
import { appointmentsApi } from '../appointments/appointments.api';
import '../appointments/AppointmentsPage.css';
import './PatientActionModal.css';

export function PatientSlotsModal({ patientId, patientName, canBook, onClose }: { patientId: number; patientName: string; canBook: boolean; onClose: () => void }) {
  const [rows, setRows] = useState<Appointment[]>([]);
  const [error, setError] = useState('');
  const [booking, setBooking] = useState(false);
  const load = async () => { try { setRows(await appointmentsApi.list({ patientId })); setError(''); } catch (err) { setError(getErrorMessage(err, 'Unable to load appointments')); } };
  useEffect(() => { void load(); }, [patientId]);
  return <div className="patient-action-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="patient-action-modal" role="dialog" aria-modal="true" aria-label="Patient appointments"><header><div><h2>Appointment History</h2><p>{patientName}</p></div><button type="button" onClick={onClose} aria-label="Close">×</button></header><div className="patient-action-modal__body">
    {error && <Alert tone="error">{error}</Alert>}
    {canBook && <Button onClick={() => setBooking(true)}>+ Book appointment</Button>}
    {rows.length ? <div className="patient-action-list">{rows.map((row) => <article key={row.id}><div><strong>{row.appointmentDate} · {row.appointmentTime || 'Time pending'}</strong><small>{row.doctorName || 'Doctor'} · {row.appointmentNumber} · {row.status.replaceAll('_', ' ')}</small></div></article>)}</div> : <p>No appointments recorded for this patient.</p>}
  </div><footer><Button variant="secondary" onClick={onClose}>Close</Button></footer></section>
    {booking && <div className="appointment-modal-backdrop"><section className="appointment-modal" role="dialog" aria-modal="true" aria-label="Book appointment"><AppointmentFormPage modal initialPatientId={patientId} onClose={() => setBooking(false)} onSaved={() => { setBooking(false); void load(); }} /></section></div>}
  </div>;
}
