import { useEffect, useMemo, useState } from 'react';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { Select } from '../../components/ui/Select';
import { Table, type TableColumn } from '../../components/ui/Table';
import { getErrorMessage } from '../../lib/api';
import { patientsApi } from '../patients/patients.api';
import type { Patient } from '../../types';
import { emergencyApi, type CreateEmergencyCasePayload, type EmergencyCase, type TriageCategory } from './emergency.api';
import './EmergencyPage.css';

const acuityOrder: Record<TriageCategory, number> = { red: 0, yellow: 1, green: 2 };
const acuityTone: Record<TriageCategory, 'danger' | 'warning' | 'success'> = { red: 'danger', yellow: 'warning', green: 'success' };
const patientName = (row: EmergencyCase) => [row.patient?.firstName, row.patient?.middleName, row.patient?.lastName].filter(Boolean).join(' ') || `Patient #${row.patientId}`;

export function EmergencyPage() {
  const [cases, setCases] = useState<EmergencyCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [dispositionTarget, setDispositionTarget] = useState<EmergencyCase | null>(null);
  const load = async () => { setLoading(true); setError(''); try { setCases(await emergencyApi.list()); } catch (err) { setError(getErrorMessage(err, 'Unable to load emergency cases')); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, []);
  const queue = useMemo(() => [...cases].sort((a, b) => {
    const aClosed = ['admitted', 'discharged'].includes(a.status) ? 1 : 0;
    const bClosed = ['admitted', 'discharged'].includes(b.status) ? 1 : 0;
    return aClosed - bClosed || acuityOrder[a.triageCategory] - acuityOrder[b.triageCategory] || new Date(a.triagedAt).getTime() - new Date(b.triagedAt).getTime();
  }), [cases]);
  const updateStatus = async (row: EmergencyCase, status: 'in_care' | 'admitted' | 'discharged', note?: string) => {
    setSaving(true); setError(''); setNotice('');
    try { await emergencyApi.updateStatus(row.id, status, note); setDispositionTarget(null); setNotice('Emergency case updated.'); await load(); }
    catch (err) { setError(getErrorMessage(err, 'Unable to update emergency case')); }
    finally { setSaving(false); }
  };
  const columns = useMemo<TableColumn<EmergencyCase>[]>(() => [
    { key: 'case', header: 'Case', render: (row) => <div><strong>{row.caseNumber}</strong><small>{new Date(row.triagedAt).toLocaleString()}</small></div> },
    { key: 'patient', header: 'Patient', render: (row) => <div><strong>{patientName(row)}</strong><small>{row.patient?.mrdNumber}</small></div> },
    { key: 'triage', header: 'Triage', render: (row) => <Badge tone={acuityTone[row.triageCategory]}>{row.triageCategory.toUpperCase()}</Badge> },
    { key: 'complaint', header: 'Chief complaint', render: (row) => <span>{row.chiefComplaint}</span> },
    { key: 'vitals', header: 'Observations', render: (row) => <span>{[row.pulseBpm != null ? `Pulse ${row.pulseBpm}` : null, row.systolicBp != null && row.diastolicBp != null ? `BP ${row.systolicBp}/${row.diastolicBp}` : null, row.spo2Percent != null ? `SpO₂ ${row.spo2Percent}%` : null].filter(Boolean).join(' · ') || '—'}</span> },
    { key: 'status', header: 'Status', render: (row) => <span>{row.status.replace('_', ' ')}</span> },
    { key: 'action', header: 'Action', render: (row) => row.status === 'waiting' ? <Button size="sm" variant="secondary" onClick={() => void updateStatus(row, 'in_care')} loading={saving}>Start care</Button> : row.status === 'in_care' ? <Button size="sm" variant="secondary" onClick={() => setDispositionTarget(row)}>Disposition</Button> : <span title={row.dispositionNote || ''}>Closed</span> },
  ], [saving]);
  const save = async (payload: CreateEmergencyCasePayload) => { setSaving(true); setError(''); setNotice(''); try { await emergencyApi.create(payload); setShowForm(false); setNotice('Emergency triage recorded.'); await load(); } catch (err) { setError(getErrorMessage(err, 'Unable to create emergency case')); } finally { setSaving(false); } };
  return <div className="emergency-page"><PageHeader title="Emergency Triage" subtitle="Record staff-assessed acuity and track emergency care disposition." actions={<Button onClick={() => setShowForm(true)}>New triage</Button>} />{error && <Alert tone="error">{error}</Alert>}{notice && <Alert tone="success">{notice}</Alert>}<div className="emergency-summary"><span>Waiting: <strong>{cases.filter((row) => row.status === 'waiting').length}</strong></span><span>In care: <strong>{cases.filter((row) => row.status === 'in_care').length}</strong></span><span>Red in queue: <strong>{cases.filter((row) => row.triageCategory === 'red' && ['waiting', 'in_care'].includes(row.status)).length}</strong></span></div><Table columns={columns} rows={queue} rowKey={(row) => row.id} loading={loading} searchText={(row) => `${row.caseNumber} ${patientName(row)} ${row.patient?.mrdNumber || ''} ${row.chiefComplaint} ${row.status}`} searchPlaceholder="Search emergency cases" emptyMessage="No emergency cases found." />{showForm && <TriageForm saving={saving} onClose={() => setShowForm(false)} onSubmit={(payload) => void save(payload)} />}{dispositionTarget && <DispositionForm row={dispositionTarget} saving={saving} error={error} onClose={() => setDispositionTarget(null)} onSubmit={(status, note) => void updateStatus(dispositionTarget, status, note)} />}</div>;
}

function TriageForm({ saving, onClose, onSubmit }: { saving: boolean; onClose: () => void; onSubmit: (payload: CreateEmergencyCasePayload) => void }) {
  const [query, setQuery] = useState(''); const [patientId, setPatientId] = useState(''); const [results, setResults] = useState<Patient[]>([]); const [error, setError] = useState('');
  const [category, setCategory] = useState<TriageCategory>('yellow'); const [complaint, setComplaint] = useState('');
  const [pulse, setPulse] = useState(''); const [systolic, setSystolic] = useState(''); const [diastolic, setDiastolic] = useState(''); const [spo2, setSpo2] = useState('');
  useEffect(() => { if (query.trim().length < 2 || patientId) { setResults([]); return; } let active = true; const timer = window.setTimeout(() => { patientsApi.search({ q: query.trim() }).then((rows) => { if (active) setResults(rows.slice(0, 20)); }).catch((err) => { if (active) setError(getErrorMessage(err)); }); }, 250); return () => { active = false; window.clearTimeout(timer); }; }, [query, patientId]);
  const submit = (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!patientId) return; onSubmit({ patientId: Number(patientId), triageCategory: category, chiefComplaint: complaint, pulseBpm: pulse ? Number(pulse) : undefined, systolicBp: systolic ? Number(systolic) : undefined, diastolicBp: diastolic ? Number(diastolic) : undefined, spo2Percent: spo2 ? Number(spo2) : undefined }); };
  return <div className="emergency-backdrop" role="presentation" onClick={onClose}><section className="emergency-modal" role="dialog" aria-modal="true" aria-labelledby="triage-title" onClick={(event) => event.stopPropagation()}><div className="emergency-modal-header"><h2 id="triage-title">New emergency triage</h2><button type="button" onClick={onClose} aria-label="Close triage">×</button></div>{error && <Alert tone="error">{error}</Alert>}<form onSubmit={submit}><Input label="Search patient by name or MRD" value={query} onChange={(event) => { setQuery(event.target.value); setPatientId(''); }} placeholder="Type at least 2 characters" />{results.length > 0 && <Select label="Matching patients" value={patientId} onChange={(event) => { const selected = results.find((row) => String(row.id) === event.target.value); setPatientId(event.target.value); if (selected) setQuery(`${selected.fullName} (${selected.mrdNumber})`); }} options={[{ value: '', label: 'Select patient' }, ...results.map((row) => ({ value: row.id, label: `${row.fullName} · ${row.mrdNumber}` }))]} />}{patientId && <small>Selected patient ID: {patientId}</small>}<Select label="Staff-assessed triage category" value={category} onChange={(event) => setCategory(event.target.value as TriageCategory)} options={[{ value: 'red', label: 'Red · immediate' }, { value: 'yellow', label: 'Yellow · soon' }, { value: 'green', label: 'Green · can wait' }]} /><label><span>Chief complaint *</span><textarea required minLength={2} maxLength={1000} rows={3} value={complaint} onChange={(event) => setComplaint(event.target.value)} /></label><div className="emergency-form-grid"><Input label="Pulse / min" type="number" min="20" max="250" value={pulse} onChange={(event) => setPulse(event.target.value)} /><Input label="Systolic BP" type="number" min="40" max="300" value={systolic} onChange={(event) => setSystolic(event.target.value)} /><Input label="Diastolic BP" type="number" min="20" max="200" value={diastolic} onChange={(event) => setDiastolic(event.target.value)} /><Input label="SpO₂ %" type="number" min="0" max="100" value={spo2} onChange={(event) => setSpo2(event.target.value)} /></div><div className="emergency-form-actions"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={saving} disabled={!patientId}>Record triage</Button></div></form></section></div>;
}

function DispositionForm({ row, saving, error, onClose, onSubmit }: { row: EmergencyCase; saving: boolean; error: string; onClose: () => void; onSubmit: (status: 'admitted' | 'discharged', note: string) => void }) {
  const [status, setStatus] = useState<'admitted' | 'discharged'>('discharged'); const [note, setNote] = useState('');
  return <div className="emergency-backdrop" role="presentation" onClick={onClose}><section className="emergency-modal" role="dialog" aria-modal="true" aria-labelledby="disposition-title" onClick={(event) => event.stopPropagation()}><div className="emergency-modal-header"><h2 id="disposition-title">Disposition · {row.caseNumber}</h2><button type="button" onClick={onClose} aria-label="Close disposition">×</button></div>{error && <Alert tone="error">{error}</Alert>}<form onSubmit={(event) => { event.preventDefault(); onSubmit(status, note); }}><Select label="Outcome" value={status} onChange={(event) => setStatus(event.target.value as 'admitted' | 'discharged')} options={[{ value: 'discharged', label: 'Discharged from emergency' }, { value: 'admitted', label: 'Admitted to inpatient' }]} /><p>{status === 'admitted' ? 'Create an inpatient admission before choosing this outcome.' : ''}</p><label><span>Disposition note *</span><textarea required minLength={1} maxLength={2000} rows={3} value={note} onChange={(event) => setNote(event.target.value)} /></label><div className="emergency-form-actions"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={saving}>Save disposition</Button></div></form></section></div>;
}

export default EmergencyPage;
