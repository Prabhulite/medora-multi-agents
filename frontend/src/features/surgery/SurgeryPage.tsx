import { useEffect, useMemo, useState } from 'react';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { Select } from '../../components/ui/Select';
import { Table, type TableColumn } from '../../components/ui/Table';
import { getErrorMessage } from '../../lib/api';
import { doctorsApi, type ConsultantOption } from '../doctors/doctors.api';
import { patientsApi } from '../patients/patients.api';
import type { Patient } from '../../types';
import { surgeryApi, type OperatingRoom, type ScheduleSurgeryPayload, type SurgeryAction, type SurgeryCase } from './surgery.api';
import './SurgeryPage.css';

const nameOf = (row: SurgeryCase) => [row.patient?.firstName, row.patient?.middleName, row.patient?.lastName].filter(Boolean).join(' ') || `Patient #${row.patientId}`;
const statusTone = (status: SurgeryCase['status']): 'info' | 'warning' | 'success' | 'neutral' => status === 'scheduled' ? 'info' : status === 'in_progress' ? 'warning' : status === 'completed' ? 'success' : 'neutral';

export function SurgeryPage() {
  const [rooms, setRooms] = useState<OperatingRoom[]>([]);
  const [doctors, setDoctors] = useState<ConsultantOption[]>([]);
  const [cases, setCases] = useState<SurgeryCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [actionTarget, setActionTarget] = useState<{ row: SurgeryCase; action: 'complete' | 'cancel' } | null>(null);
  const load = async () => { setLoading(true); setError(''); try { const [roomRows, doctorRows, caseRows] = await Promise.all([surgeryApi.rooms(), doctorsApi.consultants(), surgeryApi.cases()]); setRooms(roomRows); setDoctors(doctorRows.filter((row) => row.isActive)); setCases(caseRows); } catch (err) { setError(getErrorMessage(err, 'Unable to load theatre schedule')); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, []);
  const perform = async (row: SurgeryCase, payload: SurgeryAction) => { setSaving(true); setError(''); setNotice(''); try { await surgeryApi.action(row.id, payload); setActionTarget(null); setNotice('Surgery case updated.'); await load(); } catch (err) { setError(getErrorMessage(err, 'Unable to update surgery case')); } finally { setSaving(false); } };
  const columns = useMemo<TableColumn<SurgeryCase>[]>(() => [
    { key: 'case', header: 'Case', render: (row) => <strong>{row.caseNumber}</strong> },
    { key: 'patient', header: 'Patient', render: (row) => <div><strong>{nameOf(row)}</strong><small>{row.patient?.mrdNumber}</small></div> },
    { key: 'procedure', header: 'Procedure', render: (row) => <span>{row.procedure}</span> },
    { key: 'schedule', header: 'Scheduled', render: (row) => <div><strong>{new Date(row.plannedStart).toLocaleString()}</strong><small>to {new Date(row.plannedEnd).toLocaleString()}</small></div> },
    { key: 'team', header: 'Room / surgeon', render: (row) => <div><strong>{row.room?.name}</strong><small>{row.surgeon?.name}</small></div> },
    { key: 'status', header: 'Status', render: (row) => <Badge tone={statusTone(row.status)}>{row.status.replace('_', ' ')}</Badge> },
    { key: 'action', header: 'Action', render: (row) => row.status === 'scheduled' ? <div className="surgery-actions"><Button size="sm" variant="secondary" loading={saving} onClick={() => void perform(row, { action: 'start' })}>Start</Button><Button size="sm" variant="ghost" onClick={() => setActionTarget({ row, action: 'cancel' })}>Cancel</Button></div> : row.status === 'in_progress' ? <Button size="sm" variant="secondary" onClick={() => setActionTarget({ row, action: 'complete' })}>Complete</Button> : <span title={row.outcomeNote || row.cancelReason || ''}>Closed</span> },
  ], [saving]);
  const save = async (payload: ScheduleSurgeryPayload) => { setSaving(true); setError(''); setNotice(''); try { await surgeryApi.schedule(payload); setShowForm(false); setNotice('Surgery scheduled.'); await load(); } catch (err) { setError(getErrorMessage(err, 'Unable to schedule surgery')); } finally { setSaving(false); } };
  return <div className="surgery-page"><PageHeader title="Operating Theatre" subtitle="Schedule procedures and track theatre cases." actions={<Button onClick={() => setShowForm(true)}>Schedule surgery</Button>} />{error && <Alert tone="error">{error}</Alert>}{notice && <Alert tone="success">{notice}</Alert>}<div className="surgery-summary"><span>Scheduled <strong>{cases.filter((row) => row.status === 'scheduled').length}</strong></span><span>In progress <strong>{cases.filter((row) => row.status === 'in_progress').length}</strong></span><span>Rooms <strong>{rooms.length}</strong></span></div><Table columns={columns} rows={cases} rowKey={(row) => row.id} loading={loading} searchText={(row) => `${row.caseNumber} ${nameOf(row)} ${row.patient?.mrdNumber || ''} ${row.procedure} ${row.room?.name} ${row.surgeon?.name}`} searchPlaceholder="Search cases" emptyMessage="No surgery cases scheduled." />{showForm && <ScheduleForm rooms={rooms} doctors={doctors} saving={saving} error={error} onClose={() => setShowForm(false)} onSubmit={(payload) => void save(payload)} />}{actionTarget && <ActionForm target={actionTarget} saving={saving} error={error} onClose={() => setActionTarget(null)} onSubmit={(payload) => void perform(actionTarget.row, payload)} />}</div>;
}

function ScheduleForm({ rooms, doctors, saving, error, onClose, onSubmit }: { rooms: OperatingRoom[]; doctors: ConsultantOption[]; saving: boolean; error: string; onClose: () => void; onSubmit: (payload: ScheduleSurgeryPayload) => void }) {
  const [query, setQuery] = useState(''); const [patientId, setPatientId] = useState(''); const [matches, setMatches] = useState<Patient[]>([]);
  const [surgeonId, setSurgeonId] = useState(''); const [roomId, setRoomId] = useState(''); const [procedure, setProcedure] = useState(''); const [start, setStart] = useState(''); const [end, setEnd] = useState('');
  useEffect(() => { if (query.trim().length < 2 || patientId) { setMatches([]); return; } let active = true; const timer = window.setTimeout(() => { patientsApi.search({ q: query.trim() }).then((rows) => { if (active) setMatches(rows.slice(0, 20)); }); }, 250); return () => { active = false; window.clearTimeout(timer); }; }, [query, patientId]);
  const submit = (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!patientId || !surgeonId || !roomId || !start || !end || new Date(end) <= new Date(start)) return; onSubmit({ patientId: Number(patientId), surgeonId: Number(surgeonId), roomId: Number(roomId), procedure, plannedStart: new Date(start).toISOString(), plannedEnd: new Date(end).toISOString() }); };
  return <div className="surgery-backdrop" role="presentation" onClick={onClose}><section className="surgery-modal" role="dialog" aria-modal="true" aria-labelledby="surgery-schedule-title" onClick={(event) => event.stopPropagation()}><div className="surgery-modal-header"><h2 id="surgery-schedule-title">Schedule surgery</h2><button type="button" onClick={onClose} aria-label="Close schedule">×</button></div>{error && <Alert tone="error">{error}</Alert>}<form onSubmit={submit}><Input label="Search patient by name or MRD" value={query} onChange={(event) => { setQuery(event.target.value); setPatientId(''); }} />{matches.length > 0 && <Select label="Matching patients" value={patientId} onChange={(event) => { const selected = matches.find((row) => String(row.id) === event.target.value); setPatientId(event.target.value); if (selected) setQuery(`${selected.fullName} (${selected.mrdNumber})`); }} options={[{ value: '', label: 'Select patient' }, ...matches.map((row) => ({ value: row.id, label: `${row.fullName} · ${row.mrdNumber}` }))]} />}{patientId && <small>Selected patient ID: {patientId}</small>}<div className="surgery-form-grid"><Select label="Surgeon" required value={surgeonId} onChange={(event) => setSurgeonId(event.target.value)} options={[{ value: '', label: 'Select surgeon' }, ...doctors.map((row) => ({ value: row.id, label: row.name }))]} /><Select label="Operating room" required value={roomId} onChange={(event) => setRoomId(event.target.value)} options={[{ value: '', label: 'Select room' }, ...rooms.map((row) => ({ value: row.id, label: row.name }))]} /><Input label="Planned start" type="datetime-local" required value={start} onChange={(event) => setStart(event.target.value)} /><Input label="Planned end" type="datetime-local" required min={start || undefined} value={end} onChange={(event) => setEnd(event.target.value)} /></div><Input label="Procedure" required minLength={3} maxLength={255} value={procedure} onChange={(event) => setProcedure(event.target.value)} /><div className="surgery-form-actions"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={saving} disabled={!patientId || !surgeonId || !roomId}>Schedule</Button></div></form></section></div>;
}

function ActionForm({ target, saving, error, onClose, onSubmit }: { target: { row: SurgeryCase; action: 'complete' | 'cancel' }; saving: boolean; error: string; onClose: () => void; onSubmit: (payload: SurgeryAction) => void }) {
  const [note, setNote] = useState('');
  return <div className="surgery-backdrop" role="presentation" onClick={onClose}><section className="surgery-modal" role="dialog" aria-modal="true" aria-labelledby="surgery-action-title" onClick={(event) => event.stopPropagation()}><div className="surgery-modal-header"><h2 id="surgery-action-title">{target.action === 'complete' ? 'Complete' : 'Cancel'} {target.row.caseNumber}</h2><button type="button" onClick={onClose} aria-label="Close case action">×</button></div>{error && <Alert tone="error">{error}</Alert>}<form onSubmit={(event) => { event.preventDefault(); onSubmit(target.action === 'complete' ? { action: 'complete', outcomeNote: note } : { action: 'cancel', reason: note }); }}><label><span>{target.action === 'complete' ? 'Outcome note' : 'Cancellation reason'} *</span><textarea required minLength={3} maxLength={target.action === 'complete' ? 10000 : 1000} rows={4} value={note} onChange={(event) => setNote(event.target.value)} /></label><div className="surgery-form-actions"><Button type="button" variant="back" onClick={onClose}>Back</Button><Button type="submit" loading={saving}>{target.action === 'complete' ? 'Complete case' : 'Cancel case'}</Button></div></form></section></div>;
}

export default SurgeryPage;
