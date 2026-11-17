import { useEffect, useMemo, useState } from 'react';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { Select } from '../../components/ui/Select';
import { Table, type TableColumn } from '../../components/ui/Table';
import { getErrorMessage } from '../../lib/api';
import { hasPermission } from '../../lib/permissions';
import { useAuth } from '../auth/AuthContext';
import { laboratoryApi, type CreateLaboratoryOrderPayload, type LaboratoryAddendum, type LaboratoryDoctorCandidate, type LaboratoryOrder, type LaboratoryPatientCandidate, type LaboratoryTest, type UpdateLaboratoryResultPayload } from './laboratory.api';
import './LaboratoryDiagnosticsPage.css';

type Modal = 'order' | 'collect' | 'result' | 'verify' | 'view' | null;

const statusTone: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  ordered: 'info', collected: 'warning', processing: 'warning', verified: 'info', completed: 'success', cancelled: 'danger',
};

function dateLabel(value?: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export function LaboratoryDiagnosticsPage() {
  const { user } = useAuth();
  const canCreate = hasPermission(user, 'laboratory.create');
  const canUpdate = hasPermission(user, 'laboratory.update');
  const canVerify = hasPermission(user, 'laboratory.verify');
  const canRelease = hasPermission(user, 'laboratory.release');
  const canAmend = hasPermission(user, 'laboratory.amend');
  const [tests, setTests] = useState<LaboratoryTest[]>([]);
  const [orders, setOrders] = useState<LaboratoryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [modal, setModal] = useState<Modal>(null);
  const [selectedOrder, setSelectedOrder] = useState<LaboratoryOrder | null>(null);
  const [releaseTarget, setReleaseTarget] = useState<LaboratoryOrder | null>(null);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [testRows, orderRows] = await Promise.all([laboratoryApi.listTests(), laboratoryApi.listOrders()]);
      setTests(testRows); setOrders(orderRows);
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load laboratory diagnostics'));
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const summary = useMemo(() => ({
    total: orders.length,
    pending: orders.filter((order) => !['completed', 'cancelled'].includes(order.status)).length,
    processing: orders.filter((order) => ['collected', 'processing', 'verified'].includes(order.status)).length,
    completed: orders.filter((order) => order.status === 'completed').length,
  }), [orders]);

  const columns = useMemo<TableColumn<LaboratoryOrder>[]>(() => [
    { key: 'order', header: 'Order', render: (row) => <div><div className="ui-table__cell-title">{row.orderNumber}</div><div className="ui-table__cell-sub">{dateLabel(row.orderedAt)}</div></div> },
    { key: 'patient', header: 'Patient', render: (row) => <div><div className="ui-table__cell-title">{row.patientName || `Patient #${row.patientId}`}</div><div className="ui-table__cell-sub">{row.patientMrdNumber || `ID ${row.patientId}`}</div></div> },
    { key: 'test', header: 'Investigation', render: (row) => <div><div className="ui-table__cell-title">{row.testName}</div><div className="ui-table__cell-sub">{row.testCode || 'Laboratory test'} · {row.priority || 'routine'}</div></div> },
    { key: 'result', header: 'Result', render: (row) => row.result ? <div><div className="ui-table__cell-title">{row.result} {row.resultUnit || ''}</div><div className="ui-table__cell-sub">{row.referenceRange ? `Reference: ${row.referenceRange}` : 'Result entered'}</div></div> : <span className="laboratory-muted">Awaiting result</span> },
    { key: 'status', header: 'Status', render: (row) => <Badge tone={statusTone[row.status] || 'neutral'}>{row.status.replace('_', ' ')}</Badge> },
    { key: 'actions', header: 'Actions', render: (row) => <div className="laboratory-actions">
      {row.status === 'ordered' && canUpdate && <Button size="sm" variant="secondary" onClick={() => { setSelectedOrder(row); setModal('collect'); }}>Collect sample</Button>}
      {['collected', 'processing'].includes(row.status) && canUpdate && <Button size="sm" variant="secondary" onClick={() => { setSelectedOrder(row); setModal('result'); }}>{row.result ? 'Edit draft' : 'Enter draft'}</Button>}
      {row.status === 'processing' && canVerify && <Button size="sm" variant="secondary" onClick={() => { setSelectedOrder(row); setModal('verify'); }}>Verify</Button>}
      {row.status === 'verified' && canRelease && <Button size="sm" onClick={() => setReleaseTarget(row)}>Release</Button>}
      {(row.status === 'completed' || row.status === 'verified' && (canUpdate || canVerify || canRelease)) && <Button size="sm" variant="secondary" onClick={() => { setSelectedOrder(row); setModal('view'); }}>View result</Button>}
    </div> },
  ], [canUpdate, canVerify, canRelease]);

  const saveOrder = async (payload: CreateLaboratoryOrderPayload) => {
    setSaving(true); setError(''); setNotice('');
    try {
      const created = await laboratoryApi.createOrder(payload);
      setOrders((current) => [created, ...current]); setModal(null); setNotice('Laboratory order created successfully.');
    } catch (err) { setError(getErrorMessage(err, 'Unable to create laboratory order')); }
    finally { setSaving(false); }
  };

  const saveResult = async (payload: UpdateLaboratoryResultPayload) => {
    if (!selectedOrder) return;
    setSaving(true); setError(''); setNotice('');
    try {
      const updated = await laboratoryApi.updateResult(selectedOrder.id, payload);
      setOrders((current) => current.map((order) => order.id === updated.id ? updated : order)); setModal(null); setSelectedOrder(null); setNotice('Laboratory draft saved successfully.');
    } catch (err) { setError(getErrorMessage(err, 'Unable to save laboratory result')); }
    finally { setSaving(false); }
  };
  const collectSample = async (specimenLabel: string) => {
    if (!selectedOrder) return;
    setSaving(true); setError(''); setNotice('');
    try {
      const updated = await laboratoryApi.collectSample(selectedOrder.id, specimenLabel);
      setOrders((current) => current.map((order) => order.id === updated.id ? updated : order)); setModal(null); setSelectedOrder(null); setNotice('Sample collection recorded.');
    } catch (err) { setError(getErrorMessage(err, 'Unable to collect sample')); }
    finally { setSaving(false); }
  };
  const verifyResult = async () => {
    if (!selectedOrder) return;
    setSaving(true); setError(''); setNotice('');
    try { const updated = await laboratoryApi.verifyResult(selectedOrder.id); setOrders((current) => current.map((row) => row.id === updated.id ? updated : row)); setModal(null); setSelectedOrder(null); setNotice('Result verified. It is ready for release.'); }
    catch (err) { setError(getErrorMessage(err, 'Unable to verify result')); }
    finally { setSaving(false); }
  };
  const releaseResult = async () => {
    if (!releaseTarget) return;
    setSaving(true); setError(''); setNotice('');
    try { const updated = await laboratoryApi.releaseResult(releaseTarget.id); setOrders((current) => current.map((row) => row.id === updated.id ? updated : row)); setReleaseTarget(null); setNotice('Verified result released.'); }
    catch (err) { setReleaseTarget(null); setError(getErrorMessage(err, 'Unable to release result')); }
    finally { setSaving(false); }
  };

  return <div className="laboratory-page">
    <PageHeader title="Laboratory diagnostics" subtitle="Order investigations, track turnaround, and publish verified results." actions={canCreate ? <Button size="sm" onClick={() => setModal('order')}>Order a test</Button> : undefined} />
    {error ? <Alert tone="error">{error}</Alert> : null}
    {notice ? <Alert tone="success">{notice}</Alert> : null}
    <div className="laboratory-kpis" aria-label="Laboratory summary">
      <article><span>Total orders</span><strong>{summary.total}</strong><small>All laboratory requests</small></article>
      <article className="laboratory-kpi--amber"><span>Pending workflow</span><strong>{summary.pending}</strong><small>Awaiting completion</small></article>
      <article className="laboratory-kpi--blue"><span>In progress</span><strong>{summary.processing}</strong><small>Collected, processing, or awaiting release</small></article>
      <article className="laboratory-kpi--green"><span>Completed</span><strong>{summary.completed}</strong><small>Results available to care teams</small></article>
    </div>
    <section className="laboratory-section">
      <div className="laboratory-section__heading"><div><span className="laboratory-eyebrow">DIAGNOSTICS WORKBENCH</span><h2>Laboratory orders</h2><p>Review requests and enter results when the lab completes an investigation.</p></div><Button variant="secondary" size="sm" onClick={() => void load()}>Refresh</Button></div>
      <Table columns={columns} rows={orders} rowKey={(row) => row.id} loading={loading} searchText={(row) => `${row.orderNumber} ${row.patientName || ''} ${row.patientMrdNumber || ''} ${row.testName} ${row.testCode || ''} ${row.status}`} searchPlaceholder="Search orders, patients, or tests" emptyMessage="No laboratory orders found. Create an order to start the diagnostics workflow." />
    </section>
    {modal === 'order' ? <OrderForm tests={tests} saving={saving} onClose={() => setModal(null)} onSubmit={(payload) => void saveOrder(payload)} /> : null}
    {modal === 'collect' && selectedOrder ? <CollectForm order={selectedOrder} saving={saving} onClose={() => { setModal(null); setSelectedOrder(null); }} onSubmit={(label) => void collectSample(label)} /> : null}
    {modal === 'result' && selectedOrder ? <ResultForm order={selectedOrder} saving={saving} onClose={() => { setModal(null); setSelectedOrder(null); }} onSubmit={(payload) => void saveResult(payload)} /> : null}
    {modal === 'verify' && selectedOrder ? <VerifyForm order={selectedOrder} saving={saving} error={error} onClose={() => { setModal(null); setSelectedOrder(null); }} onSubmit={() => void verifyResult()} /> : null}
    {modal === 'view' && selectedOrder ? <ResultView order={selectedOrder} canAmend={canAmend} onClose={() => { setModal(null); setSelectedOrder(null); }} /> : null}
    <ConfirmDialog open={Boolean(releaseTarget)} title="Release laboratory result" message="Release this verified result to the care team? The released result cannot be edited in place." confirmLabel="Release result" confirming={saving} onConfirm={() => void releaseResult()} onCancel={() => setReleaseTarget(null)} />
  </div>;
}

function ModalShell({ title, eyebrow, onClose, children, className = '' }: { title: string; eyebrow: string; onClose: () => void; children: React.ReactNode; className?: string }) {
  return <div className="laboratory-modal-backdrop" role="presentation" onClick={onClose}><section className={`laboratory-modal ${className}`} role="dialog" aria-modal="true" aria-labelledby="laboratory-modal-title" onClick={(event) => event.stopPropagation()}><div className="laboratory-modal__header"><div><span className="laboratory-eyebrow">{eyebrow}</span><h2 id="laboratory-modal-title">{title}</h2></div><button type="button" onClick={onClose} aria-label={`Close ${title}`}>×</button></div>{children}</section></div>;
}

function OrderForm({ tests, saving, onClose, onSubmit }: { tests: LaboratoryTest[]; saving: boolean; onClose: () => void; onSubmit: (payload: CreateLaboratoryOrderPayload) => void }) {
  const [form, setForm] = useState({ patientId: '', doctorId: '', testId: tests[0]?.id ? String(tests[0].id) : '', priority: 'routine' as CreateLaboratoryOrderPayload['priority'], clinicalNotes: '' });
  const [patientQuery, setPatientQuery] = useState('');
  const [patientMatches, setPatientMatches] = useState<LaboratoryPatientCandidate[]>([]);
  const [doctorQuery, setDoctorQuery] = useState('');
  const [doctorMatches, setDoctorMatches] = useState<LaboratoryDoctorCandidate[]>([]);
  const [lookupError, setLookupError] = useState('');
  useEffect(() => {
    if (patientQuery.trim().length < 2 || form.patientId) { setPatientMatches([]); return; }
    let active = true;
    const timer = window.setTimeout(() => { laboratoryApi.patientCandidates(patientQuery.trim()).then((rows) => { if (active) { setPatientMatches(rows); setLookupError(''); } }).catch((err) => { if (active) setLookupError(getErrorMessage(err, 'Unable to search patients')); }); }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [patientQuery, form.patientId]);
  useEffect(() => {
    if (doctorQuery.trim().length < 2 || form.doctorId) { setDoctorMatches([]); return; }
    let active = true;
    const timer = window.setTimeout(() => { laboratoryApi.doctorCandidates(doctorQuery.trim()).then((rows) => { if (active) { setDoctorMatches(rows); setLookupError(''); } }).catch((err) => { if (active) setLookupError(getErrorMessage(err, 'Unable to search doctors')); }); }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [doctorQuery, form.doctorId]);
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  return <ModalShell title="Order a laboratory test" eyebrow="NEW INVESTIGATION" onClose={onClose}><form className="laboratory-form" onSubmit={(event) => { event.preventDefault(); if (!form.patientId) return; onSubmit({ patientId: Number(form.patientId), testId: Number(form.testId), doctorId: form.doctorId ? Number(form.doctorId) : null, priority: form.priority, clinicalNotes: form.clinicalNotes || null }); }}>
    <div><Input label="Search patient by name or MRD" value={patientQuery} onChange={(event) => { setPatientQuery(event.target.value); update('patientId', ''); }} placeholder="Type at least 2 characters" />{patientMatches.length > 0 && <Select label="Matching patients" value={form.patientId} onChange={(event) => { const patient = patientMatches.find((row) => String(row.id) === event.target.value); update('patientId', event.target.value); if (patient) setPatientQuery(`${patient.fullName} (${patient.mrdNumber})`); }} options={[{ value: '', label: 'Select a patient' }, ...patientMatches.map((row) => ({ value: row.id, label: `${row.fullName} · ${row.mrdNumber}` }))]} />}{form.patientId && <small>Selected patient ID: {form.patientId}</small>}{lookupError && <Alert tone="error">{lookupError}</Alert>}</div>
    <div><Input label="Referring doctor (optional)" value={doctorQuery} onChange={(event) => { setDoctorQuery(event.target.value); update('doctorId', ''); }} placeholder="Search name, code, or registration number" />{doctorMatches.length > 0 && <Select label="Matching doctors" value={form.doctorId} onChange={(event) => { const doctor = doctorMatches.find((row) => String(row.id) === event.target.value); update('doctorId', event.target.value); if (doctor) setDoctorQuery(`${doctor.name} (${doctor.doctorCode})`); }} options={[{ value: '', label: 'Select a doctor' }, ...doctorMatches.map((row) => ({ value: row.id, label: `${row.name} · ${row.doctorCode}` }))]} />}{form.doctorId && <small>Selected doctor ID: {form.doctorId}</small>}</div>
    <div className="laboratory-form__grid"><Select label="Investigation" required value={form.testId} onChange={(event) => update('testId', event.target.value)} options={[{ value: '', label: tests.length ? 'Select a test' : 'No tests available' }, ...tests.map((test) => ({ value: test.id, label: `${test.name}${test.code ? ` · ${test.code}` : ''}` }))]} /><Select label="Priority" value={form.priority} onChange={(event) => update('priority', event.target.value)} options={[{ value: 'routine', label: 'Routine' }, { value: 'urgent', label: 'Urgent' }, { value: 'stat', label: 'STAT' }]} /></div><label className="laboratory-textarea"><span>Clinical notes</span><textarea rows={4} maxLength={5000} value={form.clinicalNotes} onChange={(event) => update('clinicalNotes', event.target.value)} placeholder="Relevant symptoms, provisional diagnosis, or collection instructions" /></label><FormFooter saving={saving} onClose={onClose} submitLabel="Create order" disabled={!tests.length || !form.patientId} /></form></ModalShell>;
}

function ResultForm({ order, saving, onClose, onSubmit }: { order: LaboratoryOrder; saving: boolean; onClose: () => void; onSubmit: (payload: UpdateLaboratoryResultPayload) => void }) {
  const [form, setForm] = useState({ result: order.result || '', resultUnit: order.resultUnit || '', referenceRange: order.referenceRange || '', remarks: order.remarks || '', status: 'processing' as const });
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  return <ModalShell title={`Result · ${order.testName}`} eyebrow={order.orderNumber} onClose={onClose}><form className="laboratory-form" onSubmit={(event) => { event.preventDefault(); onSubmit({ result: form.result, resultUnit: form.resultUnit || null, referenceRange: form.referenceRange || null, remarks: form.remarks || null, status: form.status }); }}><div className="laboratory-result-context"><strong>{order.patientName || `Patient #${order.patientId}`}</strong><span>{order.patientMrdNumber || `Patient ID ${order.patientId}`} · {order.priority || 'routine'} priority</span></div><label className="laboratory-textarea"><span>Result value</span><textarea rows={4} required value={form.result} onChange={(event) => update('result', event.target.value)} placeholder="Enter the observed result or interpretation" /></label><div className="laboratory-form__grid"><Input label="Unit" value={form.resultUnit} onChange={(event) => update('resultUnit', event.target.value)} placeholder="e.g. mg/dL" /><Input label="Reference range" value={form.referenceRange} onChange={(event) => update('referenceRange', event.target.value)} placeholder="e.g. 70–100 mg/dL" /></div><label className="laboratory-textarea"><span>Remarks</span><textarea rows={3} value={form.remarks} onChange={(event) => update('remarks', event.target.value)} placeholder="Add interpretation or quality notes" /></label><FormFooter saving={saving} onClose={onClose} submitLabel="Save result" /></form></ModalShell>;
}

function VerifyForm({ order, saving, error, onClose, onSubmit }: { order: LaboratoryOrder; saving: boolean; error: string; onClose: () => void; onSubmit: () => void }) {
  const [patientAndSpecimenChecked, setPatientAndSpecimenChecked] = useState(false);
  const [qualityControlChecked, setQualityControlChecked] = useState(false);
  return <ModalShell title={`Verify result · ${order.testName}`} eyebrow={order.orderNumber} onClose={onClose}><form className="laboratory-form" onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
    <div className="laboratory-result-context"><strong>{order.patientName || `Patient #${order.patientId}`}</strong><span>{order.patientMrdNumber || `Patient ID ${order.patientId}`} · Specimen {order.specimenLabel || 'not labeled'}</span></div>
    {order.clinicalNotes && <section><h3>Order notes</h3><p>{order.clinicalNotes}</p></section>}
    <section><h3>Draft result</h3><p>{order.result} {order.resultUnit || ''}</p><p>{order.referenceRange ? `Reference range: ${order.referenceRange}` : 'Reference range not recorded.'}</p>{order.remarks && <p>{order.remarks}</p>}</section>
    <label><input type="checkbox" checked={patientAndSpecimenChecked} onChange={(event) => setPatientAndSpecimenChecked(event.target.checked)} /> I checked the patient, order, specimen, and transcribed result.</label>
    <label><input type="checkbox" checked={qualityControlChecked} onChange={(event) => setQualityControlChecked(event.target.checked)} /> I reviewed the relevant quality-control information under our laboratory procedure.</label>
    <Alert tone="warning">Verification requires a staff member other than the person who entered the draft. This records an internal review, not a regulated electronic signature.</Alert>
    {error && <Alert tone="error">{error}</Alert>}
    <FormFooter saving={saving} onClose={onClose} submitLabel="Verify result" disabled={!patientAndSpecimenChecked || !qualityControlChecked} />
  </form></ModalShell>;
}

function ResultView({ order, canAmend, onClose }: { order: LaboratoryOrder; canAmend: boolean; onClose: () => void }) {
  const released = order.status === 'completed';
  const [addenda, setAddenda] = useState<LaboratoryAddendum[]>([]);
  const [loadingAddenda, setLoadingAddenda] = useState(released);
  const [savingAddendum, setSavingAddendum] = useState(false);
  const [reason, setReason] = useState('');
  const [addendum, setAddendum] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    if (!released) return;
    let active = true;
    laboratoryApi.listAddenda(order.id).then((rows) => { if (active) setAddenda(rows); }).catch((err) => { if (active) setError(getErrorMessage(err, 'Unable to load result addenda')); }).finally(() => { if (active) setLoadingAddenda(false); });
    return () => { active = false; };
  }, [order.id, released]);
  const saveAddendum = async (event: React.FormEvent) => {
    event.preventDefault(); setSavingAddendum(true); setError('');
    try { const row = await laboratoryApi.addAddendum(order.id, { reason: reason.trim(), addendum: addendum.trim() }); setAddenda((current) => [...current, row]); setReason(''); setAddendum(''); }
    catch (err) { setError(getErrorMessage(err, 'Unable to save result addendum')); }
    finally { setSavingAddendum(false); }
  };
  return <ModalShell title={`${released ? 'Laboratory report' : 'Verified draft'} · ${order.testName}`} eyebrow={order.orderNumber} onClose={onClose} className={released ? 'laboratory-report' : ''}><div className="laboratory-form">
    <div className="laboratory-result-context"><strong>{order.patientName || `Patient #${order.patientId}`}</strong><span>{order.patientMrdNumber || `Patient ID ${order.patientId}`} · {released ? 'Released result' : 'Awaiting release'}</span></div>
    <dl className="laboratory-report__details"><div><dt>Investigation</dt><dd>{order.testName} {order.testCode && `(${order.testCode})`}</dd></div><div><dt>Priority</dt><dd>{order.priority || 'routine'}</dd></div><div><dt>Ordered</dt><dd>{dateLabel(order.orderedAt)}</dd></div><div><dt>Collected</dt><dd>{dateLabel(order.collectedAt)}</dd></div><div><dt>Specimen label</dt><dd>{order.specimenLabel || 'Not recorded'}</dd></div><div><dt>Referring doctor</dt><dd>{order.doctorName || 'Not assigned'}</dd></div><div><dt>Order number</dt><dd>{order.orderNumber}</dd></div></dl>
    <section className="laboratory-report__result"><h3>Result</h3><p>{order.result || 'No result recorded.'} {order.resultUnit || ''}</p>{order.referenceRange && <p>Reference range: {order.referenceRange}</p>}{order.remarks && <p>{order.remarks}</p>}</section>
    {order.verifiedAt && <p>Verified {dateLabel(order.verifiedAt)} · staff #{order.verifiedById || 'unknown'}</p>}
    {order.completedAt && <p>Released {dateLabel(order.completedAt)} · staff #{order.releasedById || 'unknown'}</p>}
    {released && !order.verifiedAt && <p>Historical result: verification details were not recorded in the earlier workflow.</p>}
    {released && <section className="laboratory-report__addenda"><h3>Addenda</h3>{loadingAddenda ? <p>Loading corrections…</p> : addenda.length ? addenda.map((row) => <article key={row.id}><strong>{dateLabel(row.createdAt)} · {row.authorName || 'Former user'}</strong><p>Reason: {row.reason}</p><p>{row.addendum}</p></article>) : <p>No corrections recorded.</p>}</section>}
    {error && <Alert tone="error">{error}</Alert>}
    <div className="laboratory-modal__footer laboratory-report__actions"><Button type="button" variant="secondary" onClick={onClose}>Close</Button>{released && <Button type="button" disabled={loadingAddenda || Boolean(error)} onClick={() => window.print()}>Print report</Button>}</div>
  </div>{released && canAmend && <form className="laboratory-form laboratory-report__correction" onSubmit={(event) => void saveAddendum(event)}><h3>Add a correction</h3><Input label="Reason" required minLength={5} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} /><label className="laboratory-textarea"><span>Addendum</span><textarea required rows={4} maxLength={10000} value={addendum} onChange={(event) => setAddendum(event.target.value)} /></label><Button type="submit" loading={savingAddendum} disabled={savingAddendum || reason.trim().length < 5 || !addendum.trim()}>Save addendum</Button></form>}</ModalShell>;
}

function FormFooter({ saving, onClose, submitLabel, disabled = false }: { saving: boolean; onClose: () => void; submitLabel: string; disabled?: boolean }) {
  return <div className="laboratory-modal__footer"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={saving} disabled={disabled}>{submitLabel}</Button></div>;
}

export default LaboratoryDiagnosticsPage;

function CollectForm({ order, saving, onClose, onSubmit }: { order: LaboratoryOrder; saving: boolean; onClose: () => void; onSubmit: (label: string) => void }) {
  const [specimenLabel, setSpecimenLabel] = useState('');
  return <ModalShell title={`Collect sample · ${order.testName}`} eyebrow={order.orderNumber} onClose={onClose}><form className="laboratory-form" onSubmit={(event) => { event.preventDefault(); onSubmit(specimenLabel.trim()); }}><div className="laboratory-result-context"><strong>{order.patientName || `Patient #${order.patientId}`}</strong><span>{order.patientMrdNumber || `Patient ID ${order.patientId}`}</span></div><Input label="Specimen label / barcode" required minLength={2} maxLength={80} value={specimenLabel} onChange={(event) => setSpecimenLabel(event.target.value)} placeholder="Label on the collected specimen" /><FormFooter saving={saving} onClose={onClose} submitLabel="Confirm collection" /></form></ModalShell>;
}
