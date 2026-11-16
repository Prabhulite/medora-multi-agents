import { useEffect, useMemo, useState } from 'react';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { Select } from '../../components/ui/Select';
import { Table, type TableColumn } from '../../components/ui/Table';
import { getErrorMessage } from '../../lib/api';
import { laboratoryApi, type CreateLaboratoryOrderPayload, type LaboratoryOrder, type LaboratoryTest, type UpdateLaboratoryResultPayload } from './laboratory.api';
import './LaboratoryDiagnosticsPage.css';

type Modal = 'order' | 'collect' | 'result' | null;

const statusTone: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  ordered: 'info', collected: 'warning', processing: 'warning', completed: 'success', cancelled: 'danger',
};

function dateLabel(value?: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export function LaboratoryDiagnosticsPage() {
  const [tests, setTests] = useState<LaboratoryTest[]>([]);
  const [orders, setOrders] = useState<LaboratoryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [modal, setModal] = useState<Modal>(null);
  const [selectedOrder, setSelectedOrder] = useState<LaboratoryOrder | null>(null);

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
    processing: orders.filter((order) => ['collected', 'processing'].includes(order.status)).length,
    completed: orders.filter((order) => order.status === 'completed').length,
  }), [orders]);

  const columns = useMemo<TableColumn<LaboratoryOrder>[]>(() => [
    { key: 'order', header: 'Order', render: (row) => <div><div className="ui-table__cell-title">{row.orderNumber}</div><div className="ui-table__cell-sub">{dateLabel(row.orderedAt)}</div></div> },
    { key: 'patient', header: 'Patient', render: (row) => <div><div className="ui-table__cell-title">{row.patientName || `Patient #${row.patientId}`}</div><div className="ui-table__cell-sub">{row.patientMrdNumber || `ID ${row.patientId}`}</div></div> },
    { key: 'test', header: 'Investigation', render: (row) => <div><div className="ui-table__cell-title">{row.testName}</div><div className="ui-table__cell-sub">{row.testCode || 'Laboratory test'} · {row.priority || 'routine'}</div></div> },
    { key: 'result', header: 'Result', render: (row) => row.result ? <div><div className="ui-table__cell-title">{row.result} {row.resultUnit || ''}</div><div className="ui-table__cell-sub">{row.referenceRange ? `Reference: ${row.referenceRange}` : 'Result entered'}</div></div> : <span className="laboratory-muted">Awaiting result</span> },
    { key: 'status', header: 'Status', render: (row) => <Badge tone={statusTone[row.status] || 'neutral'}>{row.status.replace('_', ' ')}</Badge> },
    { key: 'actions', header: 'Actions', render: (row) => row.status === 'ordered' ? <Button size="sm" variant="secondary" onClick={() => { setSelectedOrder(row); setModal('collect'); }}>Collect sample</Button> : ['collected', 'processing'].includes(row.status) ? <Button size="sm" variant="secondary" onClick={() => { setSelectedOrder(row); setModal('result'); }}>{row.result ? 'Update result' : 'Enter result'}</Button> : <span className="laboratory-muted">{row.status === 'completed' ? 'Result finalized' : 'No actions'}</span> },
  ], []);

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
      setOrders((current) => current.map((order) => order.id === updated.id ? updated : order)); setModal(null); setSelectedOrder(null); setNotice('Laboratory result saved successfully.');
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

  return <div className="laboratory-page">
    <PageHeader title="Laboratory diagnostics" subtitle="Order investigations, track turnaround, and publish verified results." actions={<Button size="sm" onClick={() => setModal('order')}>Order a test</Button>} />
    {error ? <Alert tone="error">{error}</Alert> : null}
    {notice ? <Alert tone="success">{notice}</Alert> : null}
    <div className="laboratory-kpis" aria-label="Laboratory summary">
      <article><span>Total orders</span><strong>{summary.total}</strong><small>All laboratory requests</small></article>
      <article className="laboratory-kpi--amber"><span>Pending workflow</span><strong>{summary.pending}</strong><small>Awaiting completion</small></article>
      <article className="laboratory-kpi--blue"><span>In processing</span><strong>{summary.processing}</strong><small>Collected or under analysis</small></article>
      <article className="laboratory-kpi--green"><span>Completed</span><strong>{summary.completed}</strong><small>Results available to care teams</small></article>
    </div>
    <section className="laboratory-section">
      <div className="laboratory-section__heading"><div><span className="laboratory-eyebrow">DIAGNOSTICS WORKBENCH</span><h2>Laboratory orders</h2><p>Review requests and enter results when the lab completes an investigation.</p></div><Button variant="secondary" size="sm" onClick={() => void load()}>Refresh</Button></div>
      <Table columns={columns} rows={orders} rowKey={(row) => row.id} loading={loading} searchText={(row) => `${row.orderNumber} ${row.patientName || ''} ${row.patientMrdNumber || ''} ${row.testName} ${row.testCode || ''} ${row.status}`} searchPlaceholder="Search orders, patients, or tests" emptyMessage="No laboratory orders found. Create an order to start the diagnostics workflow." />
    </section>
    {modal === 'order' ? <OrderForm tests={tests} saving={saving} onClose={() => setModal(null)} onSubmit={(payload) => void saveOrder(payload)} /> : null}
    {modal === 'collect' && selectedOrder ? <CollectForm order={selectedOrder} saving={saving} onClose={() => { setModal(null); setSelectedOrder(null); }} onSubmit={(label) => void collectSample(label)} /> : null}
    {modal === 'result' && selectedOrder ? <ResultForm order={selectedOrder} saving={saving} onClose={() => { setModal(null); setSelectedOrder(null); }} onSubmit={(payload) => void saveResult(payload)} /> : null}
  </div>;
}

function ModalShell({ title, eyebrow, onClose, children }: { title: string; eyebrow: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="laboratory-modal-backdrop" role="presentation" onClick={onClose}><section className="laboratory-modal" role="dialog" aria-modal="true" aria-labelledby="laboratory-modal-title" onClick={(event) => event.stopPropagation()}><div className="laboratory-modal__header"><div><span className="laboratory-eyebrow">{eyebrow}</span><h2 id="laboratory-modal-title">{title}</h2></div><button type="button" onClick={onClose} aria-label={`Close ${title}`}>×</button></div>{children}</section></div>;
}

function OrderForm({ tests, saving, onClose, onSubmit }: { tests: LaboratoryTest[]; saving: boolean; onClose: () => void; onSubmit: (payload: CreateLaboratoryOrderPayload) => void }) {
  const [form, setForm] = useState({ patientId: '', testId: tests[0]?.id ? String(tests[0].id) : '', priority: 'routine' as CreateLaboratoryOrderPayload['priority'], clinicalNotes: '' });
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  return <ModalShell title="Order a laboratory test" eyebrow="NEW INVESTIGATION" onClose={onClose}><form className="laboratory-form" onSubmit={(event) => { event.preventDefault(); onSubmit({ patientId: Number(form.patientId), testId: Number(form.testId), priority: form.priority, clinicalNotes: form.clinicalNotes || null }); }}><div className="laboratory-form__grid"><Input label="Patient ID" type="number" min="1" required value={form.patientId} onChange={(event) => update('patientId', event.target.value)} placeholder="Registered patient ID" /><Select label="Investigation" required value={form.testId} onChange={(event) => update('testId', event.target.value)} options={[{ value: '', label: tests.length ? 'Select a test' : 'No tests available' }, ...tests.map((test) => ({ value: test.id, label: `${test.name}${test.code ? ` · ${test.code}` : ''}` }))]} /><Select label="Priority" value={form.priority} onChange={(event) => update('priority', event.target.value)} options={[{ value: 'routine', label: 'Routine' }, { value: 'urgent', label: 'Urgent' }, { value: 'stat', label: 'STAT' }]} /></div><label className="laboratory-textarea"><span>Clinical notes</span><textarea rows={4} value={form.clinicalNotes} onChange={(event) => update('clinicalNotes', event.target.value)} placeholder="Relevant symptoms, provisional diagnosis, or collection instructions" /></label><FormFooter saving={saving} onClose={onClose} submitLabel="Create order" disabled={!tests.length} /></form></ModalShell>;
}

function ResultForm({ order, saving, onClose, onSubmit }: { order: LaboratoryOrder; saving: boolean; onClose: () => void; onSubmit: (payload: UpdateLaboratoryResultPayload) => void }) {
  const [form, setForm] = useState({ result: order.result || '', resultUnit: order.resultUnit || '', referenceRange: order.referenceRange || '', remarks: order.remarks || '', status: 'completed' as UpdateLaboratoryResultPayload['status'] });
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  return <ModalShell title={`Result · ${order.testName}`} eyebrow={order.orderNumber} onClose={onClose}><form className="laboratory-form" onSubmit={(event) => { event.preventDefault(); onSubmit({ result: form.result, resultUnit: form.resultUnit || null, referenceRange: form.referenceRange || null, remarks: form.remarks || null, status: form.status }); }}><div className="laboratory-result-context"><strong>{order.patientName || `Patient #${order.patientId}`}</strong><span>{order.patientMrdNumber || `Patient ID ${order.patientId}`} · {order.priority || 'routine'} priority</span></div><label className="laboratory-textarea"><span>Result value</span><textarea rows={4} required value={form.result} onChange={(event) => update('result', event.target.value)} placeholder="Enter the observed result or interpretation" /></label><div className="laboratory-form__grid"><Input label="Unit" value={form.resultUnit} onChange={(event) => update('resultUnit', event.target.value)} placeholder="e.g. mg/dL" /><Input label="Reference range" value={form.referenceRange} onChange={(event) => update('referenceRange', event.target.value)} placeholder="e.g. 70–100 mg/dL" /><Select label="Workflow status" value={form.status} onChange={(event) => update('status', event.target.value)} options={[{ value: 'completed', label: 'Completed / verified' }, { value: 'processing', label: 'Processing / preliminary' }]} /></div><label className="laboratory-textarea"><span>Remarks</span><textarea rows={3} value={form.remarks} onChange={(event) => update('remarks', event.target.value)} placeholder="Add interpretation or quality notes" /></label><FormFooter saving={saving} onClose={onClose} submitLabel="Save result" /></form></ModalShell>;
}

function FormFooter({ saving, onClose, submitLabel, disabled = false }: { saving: boolean; onClose: () => void; submitLabel: string; disabled?: boolean }) {
  return <div className="laboratory-modal__footer"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={saving} disabled={disabled}>{submitLabel}</Button></div>;
}

export default LaboratoryDiagnosticsPage;

function CollectForm({ order, saving, onClose, onSubmit }: { order: LaboratoryOrder; saving: boolean; onClose: () => void; onSubmit: (label: string) => void }) {
  const [specimenLabel, setSpecimenLabel] = useState('');
  return <ModalShell title={`Collect sample · ${order.testName}`} eyebrow={order.orderNumber} onClose={onClose}><form className="laboratory-form" onSubmit={(event) => { event.preventDefault(); onSubmit(specimenLabel.trim()); }}><div className="laboratory-result-context"><strong>{order.patientName || `Patient #${order.patientId}`}</strong><span>{order.patientMrdNumber || `Patient ID ${order.patientId}`}</span></div><Input label="Specimen label / barcode" required minLength={2} maxLength={80} value={specimenLabel} onChange={(event) => setSpecimenLabel(event.target.value)} placeholder="Label on the collected specimen" /><FormFooter saving={saving} onClose={onClose} submitLabel="Confirm collection" /></form></ModalShell>;
}
