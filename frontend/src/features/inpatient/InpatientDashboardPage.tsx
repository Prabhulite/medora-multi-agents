import { useEffect, useMemo, useState } from 'react';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { Select } from '../../components/ui/Select';
import { Table, type TableColumn } from '../../components/ui/Table';
import { getErrorMessage } from '../../lib/api';
import { hasPermission } from '../../lib/permissions';
import { useAuth } from '../auth/AuthContext';
import { patientsApi } from '../patients/patients.api';
import { doctorsApi } from '../doctors/doctors.api';
import type { Doctor, Patient } from '../../types';
import { inpatientApi, type Admission, type Bed, type BedTransfer, type CreateAdmissionPayload, type DischargeMedicationReview, type DischargePayload, type NursingObservation, type NursingObservationPayload, type Ward } from './inpatient.api';
import './InpatientDashboardPage.css';
import { MedicationAdministrationPanel } from './MedicationAdministrationPanel';
import { CarePlanPanel } from './CarePlanPanel';
import { DischargeReviewForm } from './DischargeReviewForm';

type Tab = 'overview' | 'beds' | 'admissions';

const bedTone: Record<Bed['status'], 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  available: 'success', occupied: 'info', reserved: 'warning', cleaning: 'warning', maintenance: 'danger',
};

const admissionTone: Record<Admission['status'], 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  planned: 'warning', admitted: 'success', transferred: 'info', discharged: 'neutral', cancelled: 'danger',
};

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(value));
}

export function InpatientDashboardPage() {
  const { user } = useAuth();
  const canDischarge = hasPermission(user, 'inpatient.update') && hasPermission(user, 'clinical.update');
  const [tab, setTab] = useState<Tab>('overview');
  const [wards, setWards] = useState<Ward[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [dischargeTarget, setDischargeTarget] = useState<Admission | null>(null);
  const [dischargeView, setDischargeView] = useState<Admission | null>(null);
  const [observationTarget, setObservationTarget] = useState<Admission | null>(null);
  const [transferTarget, setTransferTarget] = useState<Admission | null>(null);
  const [medicationTarget, setMedicationTarget] = useState<Admission | null>(null);
  const [carePlanTarget, setCarePlanTarget] = useState<Admission | null>(null);
  const [transfers, setTransfers] = useState<BedTransfer[]>([]);
  const [observations, setObservations] = useState<NursingObservation[]>([]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [wardRows, bedRows, admissionRows] = await Promise.all([
        inpatientApi.listWards(), inpatientApi.listBeds(), inpatientApi.listAdmissions(),
      ]);
      setWards(wardRows); setBeds(bedRows); setAdmissions(admissionRows);
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load inpatient dashboard'));
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const availableBeds = beds.filter((bed) => bed.status === 'available');
  const occupiedBeds = beds.filter((bed) => bed.status === 'occupied');
  const activeAdmissions = admissions.filter((admission) => ['admitted', 'transferred'].includes(admission.status));

  const bedColumns = useMemo<TableColumn<Bed>[]>(() => [
    { key: 'bed', header: 'Bed', render: (row) => <div><div className="ui-table__cell-title">{row.bedNumber}</div><div className="ui-table__cell-sub">{row.roomNumber ? `Room ${row.roomNumber}` : 'Open bay'}</div></div> },
    { key: 'ward', header: 'Ward', render: (row) => <span>{row.wardName}</span> },
    { key: 'type', header: 'Type', render: (row) => <span className="inpatient-capitalize">{row.bedType.replace('_', ' ')}</span> },
    { key: 'patient', header: 'Patient', render: (row) => row.patientName ? <div><div className="ui-table__cell-title">{row.patientName}</div><div className="ui-table__cell-sub">{row.patientMrdNumber}</div></div> : <span className="inpatient-muted">Unassigned</span> },
    { key: 'status', header: 'Status', render: (row) => <Badge tone={bedTone[row.status]}>{row.status.replace('_', ' ')}</Badge> },
  ], []);

  const admissionColumns = useMemo<TableColumn<Admission>[]>(() => [
    { key: 'number', header: 'Admission', render: (row) => <div><div className="ui-table__cell-title">{row.admissionNumber}</div><div className="ui-table__cell-sub">{formatDate(row.admittedAt)}</div></div> },
    { key: 'patient', header: 'Patient', render: (row) => <div><div className="ui-table__cell-title">{row.patientName}</div><div className="ui-table__cell-sub">{row.patientMrdNumber}</div></div> },
    { key: 'placement', header: 'Placement', render: (row) => <div><div className="ui-table__cell-title">{row.wardName}</div><div className="ui-table__cell-sub">Bed {row.bedNumber}</div></div> },
    { key: 'doctor', header: 'Attending doctor', render: (row) => <span>{row.attendingDoctor}</span> },
    { key: 'type', header: 'Type', render: (row) => <span className="inpatient-capitalize">{row.admissionType.replace('_', ' ')}</span> },
    { key: 'status', header: 'Status', render: (row) => <Badge tone={admissionTone[row.status]}>{row.status}</Badge> },
    { key: 'action', header: 'Action', render: (row) => <div className="inpatient-row-actions"><Button size="sm" variant="secondary" onClick={() => { setObservationTarget(row); void inpatientApi.listObservations(row.id).then(setObservations).catch((err) => setError(getErrorMessage(err))); }}>Observations</Button><Button size="sm" variant="secondary" onClick={() => setCarePlanTarget(row)}>Care plans</Button><Button size="sm" variant="secondary" onClick={() => setMedicationTarget(row)}>Medications</Button><Button size="sm" variant="secondary" onClick={() => { setTransferTarget(row); void inpatientApi.listTransfers(row.id).then(setTransfers).catch((err) => setError(getErrorMessage(err))); }}>Transfers</Button>{['admitted', 'transferred'].includes(row.status) && canDischarge ? <Button size="sm" variant="secondary" onClick={() => setDischargeTarget(row)}>Discharge</Button> : row.status === 'discharged' ? <Button size="sm" variant="secondary" onClick={() => setDischargeView(row)}>View discharge</Button> : null}</div> },
  ], [canDischarge]);

  const saveAdmission = async (payload: CreateAdmissionPayload) => {
    setSaving(true); setNotice(''); setError('');
    try {
      const created = await inpatientApi.createAdmission(payload);
      setAdmissions((current) => [created, ...current]);
      setShowForm(false); setTab('admissions'); setNotice('Admission created successfully.');
    } catch (err) {
      setError(getErrorMessage(err, 'The inpatient admission endpoint is not available yet.'));
    } finally { setSaving(false); }
  };

  const saveDischarge = async (payload: DischargePayload) => {
    if (!dischargeTarget) return;
    setSaving(true); setError(''); setNotice('');
    try {
      await inpatientApi.discharge(dischargeTarget.id, payload);
      setDischargeTarget(null); setNotice('Discharge summary saved and bed released.');
      await load();
    } catch (err) { setError(getErrorMessage(err, 'Unable to discharge patient')); }
    finally { setSaving(false); }
  };

  return <div className="inpatient-page">
    <PageHeader title="Inpatient Management" subtitle="Manage wards, bed occupancy, admissions, and discharge readiness." actions={<Button size="sm" onClick={() => setShowForm(true)}>New admission</Button>} />
    {error ? <Alert tone="error">{error}</Alert> : null}
    {notice ? <Alert tone="success">{notice}</Alert> : null}
    <div className="inpatient-kpis" aria-label="Inpatient summary">
      <div className="inpatient-kpi"><span>Active admissions</span><strong>{activeAdmissions.length}</strong><small>Patients currently admitted</small></div>
      <div className="inpatient-kpi inpatient-kpi--green"><span>Available beds</span><strong>{availableBeds.length}</strong><small>Ready for allocation</small></div>
      <div className="inpatient-kpi inpatient-kpi--amber"><span>Occupancy</span><strong>{beds.length ? Math.round((occupiedBeds.length / beds.length) * 100) : 0}%</strong><small>{occupiedBeds.length} of {beds.length} beds shown</small></div>
      <div className="inpatient-kpi inpatient-kpi--slate"><span>Wards</span><strong>{wards.length}</strong><small>Configured inpatient units</small></div>
    </div>
    <div className="inpatient-tabs" role="tablist" aria-label="Inpatient views">
      {(['overview', 'beds', 'admissions'] as Tab[]).map((item) => <button key={item} type="button" role="tab" aria-selected={tab === item} className={tab === item ? 'is-active' : ''} onClick={() => setTab(item)}>{item === 'overview' ? 'Ward overview' : item === 'beds' ? 'Bed board' : 'Admissions'}</button>)}
    </div>
    {tab === 'overview' ? <section className="inpatient-section"><div className="inpatient-section-heading"><div><h2>Ward overview</h2><p>Occupancy at a glance across configured inpatient units.</p></div><Button variant="secondary" size="sm" onClick={() => void load()}>Refresh</Button></div><div className="ward-grid">{wards.map((ward) => { const available = ward.totalBeds - ward.occupiedBeds; const percent = ward.totalBeds ? Math.round((ward.occupiedBeds / ward.totalBeds) * 100) : 0; return <article className="ward-card" key={ward.id}><div className="ward-card__top"><div><span className="ward-card__code">{ward.code}</span><h3>{ward.name}</h3><p>{ward.floor || 'Floor not specified'} · {ward.specialty || 'General care'}</p></div><Badge tone={ward.status === 'active' ? 'success' : 'neutral'}>{ward.status}</Badge></div><div className="ward-card__meter" aria-label={`${percent}% occupied`}><span style={{ width: `${percent}%` }} /></div><div className="ward-card__stats"><div><strong>{ward.occupiedBeds}</strong><span>Occupied</span></div><div><strong>{available}</strong><span>Available</span></div><div><strong>{ward.totalBeds}</strong><span>Total beds</span></div></div><button type="button" className="ward-card__link" onClick={() => setTab('beds')}>View bed board <span aria-hidden="true">→</span></button></article>; })}</div>{!wards.length && !loading ? <div className="inpatient-empty">No wards are configured yet.</div> : null}</section> : null}
    {tab === 'beds' ? <section className="inpatient-section"><div className="inpatient-section-heading"><div><h2>Bed board</h2><p>See current bed status and patient placement.</p></div><Button variant="secondary" size="sm" onClick={() => void load()}>Refresh</Button></div><Table columns={bedColumns} rows={beds} rowKey={(row) => row.id} loading={loading} searchText={(row) => `${row.bedNumber} ${row.wardName} ${row.patientName || ''}`} searchPlaceholder="Search beds or patients" emptyMessage="No beds found." /></section> : null}
    {tab === 'admissions' ? <section className="inpatient-section"><div className="inpatient-section-heading"><div><h2>Admissions</h2><p>Review current and planned inpatient stays.</p></div><Button size="sm" onClick={() => setShowForm(true)}>New admission</Button></div><Table columns={admissionColumns} rows={admissions} rowKey={(row) => row.id} loading={loading} searchText={(row) => `${row.admissionNumber} ${row.patientName} ${row.patientMrdNumber} ${row.wardName}`} searchPlaceholder="Search admissions" emptyMessage="No admissions found." /></section> : null}
    {showForm ? <AdmissionForm wards={wards} beds={availableBeds} saving={saving} onClose={() => setShowForm(false)} onSubmit={(payload) => void saveAdmission(payload)} /> : null}
    {dischargeTarget ? <DischargeReviewForm admission={dischargeTarget} saving={saving} submitError={error} onClose={() => setDischargeTarget(null)} onSubmit={(payload) => void saveDischarge(payload)} /> : null}
    {dischargeView ? <DischargeSummaryView admission={dischargeView} onClose={() => setDischargeView(null)} /> : null}
    {observationTarget ? <ObservationPanel admission={observationTarget} observations={observations} onClose={() => setObservationTarget(null)} onSave={async (payload) => { await inpatientApi.addObservation(observationTarget.id, payload); setObservations(await inpatientApi.listObservations(observationTarget.id)); }} /> : null}
    {transferTarget ? <TransferPanel admission={transferTarget} availableBeds={availableBeds} transfers={transfers} onClose={() => setTransferTarget(null)} onSave={async (toBedId, reason) => { await inpatientApi.transfer(transferTarget.id, toBedId, reason); setTransfers(await inpatientApi.listTransfers(transferTarget.id)); await load(); }} /> : null}
    {medicationTarget ? <MedicationAdministrationPanel admission={medicationTarget} onClose={() => setMedicationTarget(null)} /> : null}
    {carePlanTarget ? <CarePlanPanel admission={carePlanTarget} onClose={() => setCarePlanTarget(null)} /> : null}
  </div>;
}

interface AdmissionFormProps { wards: Ward[]; beds: Bed[]; saving: boolean; onClose: () => void; onSubmit: (payload: CreateAdmissionPayload) => void; }
function AdmissionForm({ wards, beds, saving, onClose, onSubmit }: AdmissionFormProps) {
  const [form, setForm] = useState({ patientId: '', wardId: wards[0]?.id ? String(wards[0].id) : '', bedId: '', doctorId: '', diagnosis: '', notes: '' });
  const [patientQuery, setPatientQuery] = useState('');
  const [patientResults, setPatientResults] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [lookupError, setLookupError] = useState('');
  useEffect(() => { doctorsApi.list().then(setDoctors).catch((err) => setLookupError(getErrorMessage(err, 'Unable to load doctors'))); }, []);
  useEffect(() => {
    if (patientQuery.trim().length < 2 || form.patientId) { setPatientResults([]); return; }
    let active = true;
    const timer = window.setTimeout(() => { patientsApi.search({ q: patientQuery.trim() }).then((rows) => { if (active) setPatientResults(rows.slice(0, 20)); }).catch((err) => { if (active) setLookupError(getErrorMessage(err, 'Unable to search patients')); }); }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [patientQuery, form.patientId]);
  const wardBeds = beds.filter((bed) => String(bed.wardId) === form.wardId);
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value, ...(key === 'wardId' ? { bedId: '' } : {}) }));
  const submit = (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!form.patientId || !form.bedId) return; onSubmit({ patientId: Number(form.patientId), bedId: Number(form.bedId), doctorId: form.doctorId ? Number(form.doctorId) : null, diagnosis: form.diagnosis || null, notes: form.notes || null }); };
  return <div className="inpatient-modal-backdrop" role="presentation" onClick={onClose}><section className="inpatient-modal" role="dialog" aria-modal="true" aria-labelledby="admission-form-title" onClick={(event) => event.stopPropagation()}><div className="inpatient-modal__header"><div><span className="inpatient-eyebrow">INPATIENT REGISTRATION</span><h2 id="admission-form-title">New admission</h2><p>Assign a registered patient to an available bed.</p></div><button type="button" onClick={onClose} aria-label="Close admission form">×</button></div>{lookupError && <Alert tone="error">{lookupError}</Alert>}<form onSubmit={submit}><div className="inpatient-form-grid"><div><Input label="Search patient by name or MRD" value={patientQuery} onChange={(event) => { setPatientQuery(event.target.value); update('patientId', ''); }} placeholder="Type at least 2 characters" />{patientResults.length > 0 && <Select label="Matching patients" value={form.patientId} onChange={(event) => { const patient = patientResults.find((row) => String(row.id) === event.target.value); update('patientId', event.target.value); if (patient) setPatientQuery(`${patient.fullName} (${patient.mrdNumber})`); }} options={[{ value: '', label: 'Select a patient' }, ...patientResults.map((row) => ({ value: row.id, label: `${row.fullName} · ${row.mrdNumber}` }))]} />}{form.patientId && <small>Selected patient ID: {form.patientId}</small>}</div><Select label="Attending doctor" value={form.doctorId} onChange={(event) => update('doctorId', event.target.value)} options={[{ value: '', label: 'Not assigned' }, ...doctors.filter((doctor) => doctor.isActive).map((doctor) => ({ value: doctor.id, label: doctor.name }))]} /><Select label="Ward" required value={form.wardId} onChange={(event) => update('wardId', event.target.value)} options={wards.map((ward) => ({ value: ward.id, label: ward.name }))} /><Select label="Available bed" required value={form.bedId} onChange={(event) => update('bedId', event.target.value)} options={[{ value: '', label: wardBeds.length ? 'Select a bed' : 'No available beds' }, ...wardBeds.map((bed) => ({ value: bed.id, label: `${bed.bedNumber} · ${bed.bedType.replace('_', ' ')}` }))]} /><label className="inpatient-textarea"><span>Admission reason</span><textarea rows={3} value={form.diagnosis} onChange={(event) => update('diagnosis', event.target.value)} placeholder="Reason for admission" /></label><label className="inpatient-textarea"><span>Notes</span><textarea rows={3} value={form.notes} onChange={(event) => update('notes', event.target.value)} placeholder="Optional handover or placement notes" /></label></div><div className="inpatient-modal__footer"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={saving} disabled={!wardBeds.length || !form.patientId}>Create admission</Button></div></form></section></div>;
}

export default InpatientDashboardPage;

function TransferPanel({ admission, availableBeds, transfers, onClose, onSave }: { admission: Admission; availableBeds: Bed[]; transfers: BedTransfer[]; onClose: () => void; onSave: (toBedId: number, reason: string) => Promise<void> }) {
  const [bedId, setBedId] = useState(''); const [reason, setReason] = useState(''); const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  return <div className="inpatient-modal-backdrop" role="presentation" onClick={onClose}><section className="inpatient-modal" role="dialog" aria-modal="true" aria-labelledby="transfer-title" onClick={(event) => event.stopPropagation()}><div className="inpatient-modal__header"><div><span className="inpatient-eyebrow">BED TRANSFERS</span><h2 id="transfer-title">{admission.patientName}</h2><p>{admission.admissionNumber}</p></div><button type="button" onClick={onClose} aria-label="Close transfers">×</button></div>{error && <Alert tone="error">{error}</Alert>}{admission.status === 'admitted' && <form onSubmit={async (event) => { event.preventDefault(); setSaving(true); setError(''); try { await onSave(Number(bedId), reason); setBedId(''); setReason(''); } catch (err) { setError(getErrorMessage(err)); } finally { setSaving(false); } }}><div className="inpatient-form-grid"><Select label="Destination bed" required value={bedId} onChange={(event) => setBedId(event.target.value)} options={[{ value: '', label: 'Select available bed' }, ...availableBeds.map((bed) => ({ value: bed.id, label: `${bed.wardName} · ${bed.bedNumber}` }))]} /><Input label="Transfer reason" required minLength={2} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} /></div><div className="inpatient-modal__footer"><Button type="submit" loading={saving} disabled={!availableBeds.length}>Transfer patient</Button></div></form>}<div className="inpatient-observations"><h3>Transfer history</h3>{transfers.length ? transfers.map((item) => <article key={item.id}><strong>{new Date(item.transferredAt).toLocaleString()}</strong><span>{item.fromBed.ward.name} · {item.fromBed.number} → {item.toBed.ward.name} · {item.toBed.number}</span><p>{item.reason}</p><small>{item.transferredBy?.fullName || 'Staff'}</small></article>) : <p>No transfers recorded.</p>}</div></section></div>;
}

function DischargeSummaryView({ admission, onClose }: { admission: Admission; onClose: () => void }) {
  const [review, setReview] = useState<DischargeMedicationReview | null>(null);
  const [loadingReview, setLoadingReview] = useState(true);
  const [reviewError, setReviewError] = useState('');
  useEffect(() => {
    let active = true;
    inpatientApi.dischargeMedicationReview(admission.id).then((value) => { if (active) setReview(value); }).catch((err) => { if (active) setReviewError(getErrorMessage(err, 'Unable to load medication review')); }).finally(() => { if (active) setLoadingReview(false); });
    return () => { active = false; };
  }, [admission.id]);
  return <div className="inpatient-modal-backdrop" role="presentation" onClick={onClose}>
    <section className="inpatient-modal inpatient-discharge-sheet" role="dialog" aria-modal="true" aria-labelledby="discharge-summary-title" onClick={(event) => event.stopPropagation()}>
      <div className="inpatient-modal__header"><div><span className="inpatient-eyebrow">DISCHARGE RECORD</span><h2 id="discharge-summary-title">Discharge summary</h2><p>{admission.admissionNumber}</p></div><button type="button" onClick={onClose} aria-label="Close discharge summary">×</button></div>
      <div className="inpatient-discharge-sheet__body">
        <dl><div><dt>Patient</dt><dd>{admission.patientName}</dd></div><div><dt>MRD</dt><dd>{admission.patientMrdNumber}</dd></div><div><dt>Attending doctor</dt><dd>{admission.attendingDoctor}</dd></div><div><dt>Ward and bed</dt><dd>{admission.wardName} · {admission.bedNumber}</dd></div><div><dt>Admitted</dt><dd>{formatDate(admission.admittedAt)}</dd></div><div><dt>Discharged</dt><dd>{admission.dischargedAt ? new Date(admission.dischargedAt).toLocaleString('en-IN') : 'Date not recorded'}</dd></div></dl>
        <section><h3>Clinical summary</h3><p>{admission.dischargeSummary || 'No clinical summary recorded.'}</p></section>
        <section><h3>Discharge diagnosis</h3><p>{admission.dischargeDiagnosis || 'Not recorded.'}</p></section>
        <section><h3>Medication review</h3>{loadingReview ? <p>Loading medication review…</p> : reviewError ? <Alert tone="error">{reviewError}</Alert> : review?.medicationsReviewedAt ? <><p>Reviewed {new Date(review.medicationsReviewedAt).toLocaleString('en-IN')}</p>{review.items.length ? review.items.map((item) => <article key={item.id} className="inpatient-discharge-sheet__medication"><strong>{item.medicineName} · {item.decision}</strong><p>{[item.dosage, item.frequency, item.route].filter(Boolean).join(' · ')}</p><p>{item.decision === 'continue' ? item.instructions : `Stopped: ${item.reason}`}</p></article>) : <p>No active prescriptions at discharge.</p>}</> : <p>Historical discharge: no structured medication review recorded.</p>}</section>
        <section><h3>Additional medication instructions</h3><p>{admission.dischargeMedications || 'No additional instructions recorded. See medication review above.'}</p></section>
        <section><h3>Follow-up instructions</h3><p>{admission.followUpInstructions || 'Not recorded.'}</p></section>
      </div>
      <div className="inpatient-modal__footer inpatient-discharge-sheet__actions"><Button type="button" variant="secondary" onClick={onClose}>Close</Button><Button type="button" disabled={loadingReview || Boolean(reviewError)} onClick={() => window.print()}>Print summary</Button></div>
    </section>
  </div>;
}

function ObservationPanel({ admission, observations, onClose, onSave }: { admission: Admission; observations: NursingObservation[]; onClose: () => void; onSave: (payload: NursingObservationPayload) => Promise<void> }) {
  const [form, setForm] = useState({ temperatureC: '', pulseBpm: '', systolicBp: '', diastolicBp: '', spo2Percent: '', notes: '' });
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  return <div className="inpatient-modal-backdrop" role="presentation" onClick={onClose}><section className="inpatient-modal" role="dialog" aria-modal="true" aria-labelledby="observation-title" onClick={(event) => event.stopPropagation()}><div className="inpatient-modal__header"><div><span className="inpatient-eyebrow">NURSING RECORD</span><h2 id="observation-title">{admission.patientName}</h2><p>{admission.admissionNumber}</p></div><button type="button" onClick={onClose} aria-label="Close observations">×</button></div>{error && <Alert tone="error">{error}</Alert>}{admission.status === 'admitted' && <form onSubmit={async (event) => { event.preventDefault(); setSaving(true); setError(''); try { const payload: NursingObservationPayload = { notes: form.notes || undefined }; for (const key of ['temperatureC', 'pulseBpm', 'systolicBp', 'diastolicBp', 'spo2Percent'] as const) if (form[key]) payload[key] = Number(form[key]); await onSave(payload); setForm({ temperatureC: '', pulseBpm: '', systolicBp: '', diastolicBp: '', spo2Percent: '', notes: '' }); } catch (err) { setError(getErrorMessage(err)); } finally { setSaving(false); } }}><div className="inpatient-form-grid"><Input label="Temperature °C" type="number" min="25" max="45" step="0.1" value={form.temperatureC} onChange={(event) => update('temperatureC', event.target.value)} /><Input label="Pulse / min" type="number" min="20" max="250" value={form.pulseBpm} onChange={(event) => update('pulseBpm', event.target.value)} /><Input label="Systolic BP" type="number" min="40" max="300" value={form.systolicBp} onChange={(event) => update('systolicBp', event.target.value)} /><Input label="Diastolic BP" type="number" min="20" max="200" value={form.diastolicBp} onChange={(event) => update('diastolicBp', event.target.value)} /><Input label="SpO₂ %" type="number" min="0" max="100" value={form.spo2Percent} onChange={(event) => update('spo2Percent', event.target.value)} /><label className="inpatient-textarea"><span>Notes</span><textarea maxLength={4000} rows={2} value={form.notes} onChange={(event) => update('notes', event.target.value)} /></label></div><div className="inpatient-modal__footer"><Button type="submit" loading={saving}>Record observation</Button></div></form>}<div className="inpatient-observations"><h3>Recent observations</h3>{observations.length ? observations.map((item) => <article key={item.id}><strong>{new Date(item.observedAt).toLocaleString()}</strong><span>{[item.temperatureC && `${item.temperatureC} °C`, item.pulseBpm && `${item.pulseBpm} bpm`, item.systolicBp && item.diastolicBp && `${item.systolicBp}/${item.diastolicBp} mmHg`, item.spo2Percent != null && `${item.spo2Percent}% SpO₂`].filter(Boolean).join(' · ')}</span><p>{item.notes}</p><small>{item.recordedBy?.fullName || 'Staff'}</small></article>) : <p>No observations recorded.</p>}</div></section></div>;
}
